/**
 * Signature Service
 * Handles document signing business logic
 * Integrates with Documenso signing library and signature database tables
 */

import { pool } from "../database/connection"
import { logger } from "../utils/logger"
import { signPdf, addSigningPlaceholder } from "../lib/documenso"
import { v4 as uuidv4 } from "uuid"
import * as crypto from "crypto"
import * as fs from "fs"
import * as path from "path"

export interface SignatureField {
  field_name: string
  field_label?: string
  page_number: number
  x_position: number
  y_position: number
  width?: number
  height?: number
  field_type?: "signature" | "initial" | "date" | "text" | "checkbox" | "stamp"
  is_required?: boolean
  assigned_to_email?: string
  assigned_to_user_id?: string
}

export interface SignatureRecipient {
  email: string
  name?: string
  role?: string
  signing_order?: number
  assigned_to_user_id?: string
}

export interface CreateSignatureRequestParams {
  document_id: string
  title?: string
  signature_fields: SignatureField[]
  recipients: SignatureRecipient[]
  require_all_signatures?: boolean
  signing_deadline?: Date
  approval_request_id?: string
}

export interface SignFieldParams {
  signature_field_id: string
  signature_data: {
    signature_type: "handwritten" | "typed" | "uploaded" | "certificate"
    signature_image?: string // Base64
    signature_text?: string
    certificate_id?: string
  }
  ip_address?: string
  user_agent?: string
}

export class SignatureService {
  /**
   * Create signature fields on a document
   */
  async createSignatureFields(
    documentId: string,
    fields: SignatureField[],
    userId: string
  ): Promise<any[]> {
    try {
      // Verify document exists
      const docCheck = await pool.query("SELECT id FROM documents WHERE id = $1", [documentId])
      if (docCheck.rows.length === 0) {
        throw new Error("Document not found")
      }

      const createdFields = []

      for (const field of fields) {
        const fieldId = uuidv4()
        const result = await pool.query(
          `
          INSERT INTO signature_fields (
            id, document_id, field_name, field_label, page_number,
            x_position, y_position, width, height, field_type,
            is_required, assigned_to_email, assigned_to_user_id, created_by
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          RETURNING *
        `,
          [
            fieldId,
            documentId,
            field.field_name,
            field.field_label || field.field_name,
            field.page_number,
            field.x_position,
            field.y_position,
            field.width || 200.0,
            field.height || 50.0,
            field.field_type || "signature",
            field.is_required !== false,
            field.assigned_to_email || null,
            field.assigned_to_user_id || null,
            userId,
          ]
        )

        createdFields.push(result.rows[0])

        // Log audit
        await this.logAudit({
          document_id: documentId,
          signature_field_id: fieldId,
          action: "field_created",
          action_type: "create",
          performed_by: userId,
          details: { field_name: field.field_name, field_type: field.field_type },
        })
      }

      logger.info(`Created ${createdFields.length} signature fields for document ${documentId}`)
      return createdFields
    } catch (error: any) {
      logger.error("Error creating signature fields:", error)
      throw error
    }
  }

  /**
   * Initiate a signature request
   */
  async initiateSignatureRequest(params: CreateSignatureRequestParams, userId: string): Promise<any> {
    try {
      const { document_id, title, signature_fields, recipients, require_all_signatures, signing_deadline, approval_request_id } = params

      // Verify document exists
      const docCheck = await pool.query("SELECT id FROM documents WHERE id = $1", [document_id])
      if (docCheck.rows.length === 0) {
        throw new Error("Document not found")
      }

      const signatureRequestId = uuidv4()

      // Create signature fields
      const fields = await this.createSignatureFields(document_id, signature_fields, userId)

      // Create document signature record
      const signatureResult = await pool.query(
        `
        INSERT INTO document_signatures (
          id, document_id, signature_request_id, title, status,
          require_all_signatures, signing_deadline, approval_request_id, initiated_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `,
        [
          uuidv4(),
          document_id,
          signatureRequestId,
          title || "Document Signature Request",
          "pending",
          require_all_signatures !== false,
          signing_deadline || null,
          approval_request_id || null,
          userId,
        ]
      )

      const documentSignature = signatureResult.rows[0]

      // Create recipients
      const createdRecipients = []
      for (let i = 0; i < recipients.length; i++) {
        const recipient = recipients[i]
        const recipientId = uuidv4()
        const invitationToken = crypto.randomBytes(32).toString("hex")

        // Calculate expiration (7 days default)
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 7)

        const recipientResult = await pool.query(
          `
          INSERT INTO signature_recipients (
            id, document_signature_id, user_id, email, name, role,
            signing_order, invitation_token, invitation_expires_at, status
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING *
        `,
          [
            recipientId,
            documentSignature.id,
            recipient.assigned_to_user_id || null,
            recipient.email,
            recipient.name || null,
            recipient.role || "Signer",
            recipient.signing_order !== undefined ? recipient.signing_order : (i + 1),
            invitationToken,
            expiresAt,
            "pending",
          ]
        )

        createdRecipients.push(recipientResult.rows[0])

        // Log audit
        await this.logAudit({
          document_id,
          document_signature_id: documentSignature.id,
          signature_recipient_id: recipientId,
          action: "recipient_added",
          action_type: "create",
          performed_by: userId,
          details: { email: recipient.email, role: recipient.role },
        })
      }

      logger.info(`Initiated signature request ${signatureRequestId} for document ${document_id}`)

      return {
        ...documentSignature,
        fields,
        recipients: createdRecipients,
      }
    } catch (error: any) {
      logger.error("Error initiating signature request:", error)
      throw error
    }
  }

  /**
   * Sign a signature field
   */
  async signField(params: SignFieldParams, userId?: string, userEmail?: string): Promise<any> {
    try {
      const { signature_field_id, signature_data, ip_address, user_agent } = params

      // Get signature field (LEFT JOIN to allow fields without signature requests)
      const fieldResult = await pool.query(
        `
        SELECT sf.*, ds.id as document_signature_id, ds.document_id
        FROM signature_fields sf
        LEFT JOIN document_signatures ds ON sf.document_id = ds.document_id
        WHERE sf.id = $1
      `,
        [signature_field_id]
      )

      if (fieldResult.rows.length === 0) {
        throw new Error("Signature field not found")
      }

      const field = fieldResult.rows[0]

      // Check if already signed
      if (field.status === "signed") {
        throw new Error("Signature field already signed")
      }

      // Update signature field
      const updateResult = await pool.query(
        `
        UPDATE signature_fields
        SET status = 'signed',
            signature_data = $1,
            signed_at = NOW(),
            signed_by = $2,
            updated_at = NOW()
        WHERE id = $3
        RETURNING *
      `,
        [JSON.stringify(signature_data), userId || null, signature_field_id]
      )

      const updatedField = updateResult.rows[0]

      // Update recipient status if applicable
      if (userEmail) {
        await pool.query(
          `
          UPDATE signature_recipients
          SET status = 'signed',
              signed_at = NOW(),
              signature_method = $1,
              signature_data = $2,
              ip_address = $3,
              user_agent = $4,
              updated_at = NOW()
          WHERE document_signature_id = $5
            AND email = $6
            AND status = 'pending'
        `,
          [
            signature_data.signature_type,
            JSON.stringify(signature_data),
            ip_address || null,
            user_agent || null,
            field.document_signature_id,
            userEmail,
          ]
        )
      }

      // Check if all required signatures are complete
      await this.checkSignatureCompletion(field.document_signature_id)

      // Log audit
      await this.logAudit({
        document_id: field.document_id,
        document_signature_id: field.document_signature_id,
        signature_field_id,
        action: "signature_added",
        action_type: "sign",
        performed_by: userId,
        performed_by_email: userEmail,
        details: {
          signature_type: signature_data.signature_type,
          field_name: field.field_name,
        },
        ip_address,
        user_agent,
      })

      logger.info(`Signature added to field ${signature_field_id}`)

      return updatedField
    } catch (error: any) {
      logger.error("Error signing field:", error)
      throw error
    }
  }

  /**
   * Check if all required signatures are complete and update document signature status
   */
  async checkSignatureCompletion(documentSignatureId: string): Promise<void> {
    try {
      const signatureResult = await pool.query(
        `
        SELECT ds.*, COUNT(sf.id) as total_fields, COUNT(CASE WHEN sf.status = 'signed' THEN 1 END) as signed_fields
        FROM document_signatures ds
        LEFT JOIN signature_fields sf ON sf.document_id = ds.document_id
        WHERE ds.id = $1
        GROUP BY ds.id
      `,
        [documentSignatureId]
      )

      if (signatureResult.rows.length === 0) {
        return
      }

      const signature = signatureResult.rows[0]
      const totalFields = parseInt(signature.total_fields) || 0
      const signedFields = parseInt(signature.signed_fields) || 0

      let newStatus = signature.status

      if (signature.require_all_signatures) {
        if (signedFields === totalFields && totalFields > 0) {
          newStatus = "completed"
        } else if (signedFields > 0) {
          newStatus = "in_progress"
        }
      } else {
        if (signedFields > 0) {
          newStatus = "completed"
        }
      }

      if (newStatus !== signature.status) {
        await pool.query(
          `
          UPDATE document_signatures
          SET status = $1,
              completed_at = CASE WHEN $1 = 'completed' THEN NOW() ELSE completed_at END,
              updated_at = NOW()
          WHERE id = $2
        `,
          [newStatus, documentSignatureId]
        )

        logger.info(`Signature request ${documentSignatureId} status updated to ${newStatus}`)
      }
    } catch (error: any) {
      logger.error("Error checking signature completion:", error)
      // Don't throw - this is a background check
    }
  }

  /**
   * Get signature status for a document
   */
  async getDocumentSignatureStatus(documentId: string): Promise<any> {
    try {
      const result = await pool.query(
        `
        SELECT 
          ds.*,
          COUNT(DISTINCT sf.id) as total_fields,
          COUNT(DISTINCT CASE WHEN sf.status = 'signed' THEN sf.id END) as signed_fields,
          COUNT(DISTINCT sr.id) as total_recipients,
          COUNT(DISTINCT CASE WHEN sr.status = 'signed' THEN sr.id END) as signed_recipients
        FROM document_signatures ds
        LEFT JOIN signature_fields sf ON sf.document_id = ds.document_id
        LEFT JOIN signature_recipients sr ON sr.document_signature_id = ds.id
        WHERE ds.document_id = $1
        GROUP BY ds.id
        ORDER BY ds.created_at DESC
        LIMIT 1
      `,
        [documentId]
      )

      if (result.rows.length === 0) {
        return null
      }

      const signature = result.rows[0]

      // Get fields
      const fieldsResult = await pool.query(
        `SELECT * FROM signature_fields WHERE document_id = $1 ORDER BY page_number, y_position DESC`,
        [documentId]
      )

      // Get recipients
      const recipientsResult = await pool.query(
        `SELECT * FROM signature_recipients WHERE document_signature_id = $1 ORDER BY signing_order`,
        [signature.id]
      )

      return {
        ...signature,
        fields: fieldsResult.rows,
        recipients: recipientsResult.rows,
        total_fields: parseInt(signature.total_fields) || 0,
        signed_fields: parseInt(signature.signed_fields) || 0,
        total_recipients: parseInt(signature.total_recipients) || 0,
        signed_recipients: parseInt(signature.signed_recipients) || 0,
      }
    } catch (error: any) {
      logger.error("Error getting signature status:", error)
      throw error
    }
  }

  /**
   * Sign a PDF document using Documenso library
   */
  async signPdfDocument(documentId: string, signatureFieldIds: string[]): Promise<Buffer> {
    try {
      // Get document PDF
      const docResult = await pool.query("SELECT file_path, content FROM documents WHERE id = $1", [documentId])
      if (docResult.rows.length === 0) {
        throw new Error("Document not found")
      }

      const doc = docResult.rows[0]
      let pdfBuffer: Buffer

      if (doc.file_path && fs.existsSync(doc.file_path)) {
        pdfBuffer = fs.readFileSync(doc.file_path)
      } else {
        throw new Error("PDF file not found for document")
      }

      // Get signature fields
      const fieldsResult = await pool.query(
        `SELECT * FROM signature_fields WHERE id = ANY($1::uuid[]) AND status = 'signed'`,
        [signatureFieldIds]
      )

      if (fieldsResult.rows.length === 0) {
        throw new Error("No signed signature fields found")
      }

      // Add signing placeholder to PDF
      const pdfWithPlaceholder = await addSigningPlaceholder({ pdf: pdfBuffer })

      // Sign PDF using Documenso library
      const signedPdf = await signPdf({ pdf: pdfWithPlaceholder })

      // Calculate hash
      const hash = crypto.createHash("sha256").update(signedPdf).digest("hex")

      // Save signed PDF
      const signedPdfPath = path.join(process.cwd(), "generated-documents", "signed", `${documentId}-${Date.now()}.pdf`)
      const signedDir = path.dirname(signedPdfPath)
      if (!fs.existsSync(signedDir)) {
        fs.mkdirSync(signedDir, { recursive: true })
      }
      fs.writeFileSync(signedPdfPath, signedPdf)

      // Update document signature record
      const signatureResult = await pool.query(
        `
        UPDATE document_signatures
        SET signed_pdf_path = $1,
            signed_pdf_hash = $2,
            status = 'completed',
            completed_at = NOW(),
            updated_at = NOW()
        WHERE document_id = $3
        RETURNING *
      `,
        [signedPdfPath, hash, documentId]
      )

      logger.info(`PDF signed for document ${documentId}, saved to ${signedPdfPath}`)

      return signedPdf
    } catch (error: any) {
      logger.error("Error signing PDF:", error)
      throw error
    }
  }

  /**
   * Log signature audit event
   */
  private async logAudit(params: {
    document_id?: string
    document_signature_id?: string
    signature_field_id?: string
    signature_recipient_id?: string
    action: string
    action_type: string
    performed_by?: string
    performed_by_email?: string
    details?: any
    ip_address?: string
    user_agent?: string
  }): Promise<void> {
    try {
      await pool.query(
        `
        INSERT INTO signature_audit_logs (
          document_id, document_signature_id, signature_field_id, signature_recipient_id,
          action, action_type, performed_by, performed_by_email, details, ip_address, user_agent
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `,
        [
          params.document_id || null,
          params.document_signature_id || null,
          params.signature_field_id || null,
          params.signature_recipient_id || null,
          params.action,
          params.action_type,
          params.performed_by || null,
          params.performed_by_email || null,
          params.details ? JSON.stringify(params.details) : null,
          params.ip_address || null,
          params.user_agent || null,
        ]
      )
    } catch (error: any) {
      logger.warn("Error logging signature audit:", error)
      // Don't throw - audit logging shouldn't break the main flow
    }
  }
}

export const signatureService = new SignatureService()

