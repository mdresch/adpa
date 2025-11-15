/**
 * Signature API Routes
 * TASK: Documenso Integration - PDF Signing
 * 
 * REST API endpoints for document signing functionality
 */

import express from "express"
import Joi from "joi"
import { pool } from "../database/connection"
import { authenticateToken, requirePermission } from "../middleware/auth"
import { validate, validateParams, schemas } from "../middleware/validation"
import { logger, childLogger } from "../utils/logger"
import { signatureService } from "../services/signatureService"
import { v4 as uuidv4 } from "uuid"

const router = express.Router()

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Ensure user is authenticated
router.use(authenticateToken)

// ============================================================================
// ROUTES
// ============================================================================

/**
 * POST /api/signatures/create-fields
 * Create signature fields on a document
 */
router.post(
  "/create-fields",
  requirePermission("documents.update"),
  validate(
    Joi.object({
      document_id: schemas.uuid.required(),
      fields: Joi.array()
        .items(
          Joi.object({
            field_name: Joi.string().required(),
            field_label: Joi.string().optional(),
            page_number: Joi.number().integer().min(1).required(),
            x_position: Joi.number().required(),
            y_position: Joi.number().required(),
            width: Joi.number().optional().default(200),
            height: Joi.number().optional().default(50),
            field_type: Joi.string()
              .valid("signature", "initial", "date", "text", "checkbox", "stamp")
              .optional()
              .default("signature"),
            is_required: Joi.boolean().optional().default(true),
            assigned_to_email: Joi.string().email().optional(),
            assigned_to_user_id: schemas.uuid.optional(),
          })
        )
        .min(1)
        .required(),
    })
  ),
  async (req: express.Request, res: express.Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { document_id, fields } = req.body
      const userId = req.user?.id

      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" })
      }

      // Verify document exists and user has access
      const docCheck = await pool.query(
        `
        SELECT d.*, p.owner_id
        FROM documents d
        LEFT JOIN projects p ON d.project_id = p.id
        WHERE d.id = $1
      `,
        [document_id]
      )

      if (docCheck.rows.length === 0) {
        return res.status(404).json({ error: "Document not found" })
      }

      const createdFields = await signatureService.createSignatureFields(document_id, fields, userId)

      log.info(`Created ${createdFields.length} signature fields for document ${document_id}`)

      res.status(201).json({
        success: true,
        message: "Signature fields created successfully",
        data: createdFields,
      })
    } catch (error: any) {
      log.error("Error creating signature fields:", error)
      res.status(500).json({
        success: false,
        error: error.message || "Failed to create signature fields",
      })
    }
  }
)

/**
 * POST /api/signatures/initiate
 * Initiate a signature request for a document
 */
router.post(
  "/initiate",
  requirePermission("documents.update"),
  validate(
    Joi.object({
      document_id: schemas.uuid.required(),
      title: Joi.string().optional(),
      signature_fields: Joi.array()
        .items(
          Joi.object({
            field_name: Joi.string().required(),
            field_label: Joi.string().optional(),
            page_number: Joi.number().integer().min(1).required(),
            x_position: Joi.number().required(),
            y_position: Joi.number().required(),
            width: Joi.number().optional().default(200),
            height: Joi.number().optional().default(50),
            field_type: Joi.string()
              .valid("signature", "initial", "date", "text", "checkbox", "stamp")
              .optional()
              .default("signature"),
            is_required: Joi.boolean().optional().default(true),
            assigned_to_email: Joi.string().email().optional(),
            assigned_to_user_id: schemas.uuid.optional(),
          })
        )
        .min(1)
        .required(),
      recipients: Joi.array()
        .items(
          Joi.object({
            email: Joi.string().email().required(),
            name: Joi.string().optional(),
            role: Joi.string().optional().default("Signer"),
            signing_order: Joi.number().integer().min(0).optional(),
            assigned_to_user_id: schemas.uuid.optional(),
          })
        )
        .min(1)
        .required(),
      require_all_signatures: Joi.boolean().optional().default(true),
      signing_deadline: Joi.date().optional(),
      approval_request_id: schemas.uuid.optional(),
    })
  ),
  async (req: express.Request, res: express.Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const params = req.body
      const userId = req.user?.id

      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" })
      }

      const signatureRequest = await signatureService.initiateSignatureRequest(params, userId)

      log.info(`Initiated signature request for document ${params.document_id}`)

      res.status(201).json({
        success: true,
        message: "Signature request initiated successfully",
        data: signatureRequest,
      })
    } catch (error: any) {
      log.error("Error initiating signature request:", error)
      res.status(500).json({
        success: false,
        error: error.message || "Failed to initiate signature request",
      })
    }
  }
)

/**
 * POST /api/signatures/sign
 * Sign a signature field
 */
router.post(
  "/sign",
  validate(
    Joi.object({
      signature_field_id: schemas.uuid.required(),
      signature_data: Joi.object({
        signature_type: Joi.string()
          .valid("handwritten", "typed", "uploaded", "certificate")
          .required(),
        signature_image: Joi.string().optional(), // Base64
        signature_text: Joi.string().optional(),
        certificate_id: Joi.string().optional(),
      }).required(),
    })
  ),
  async (req: express.Request, res: express.Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { signature_field_id, signature_data } = req.body
      const userId = req.user?.id
      const userEmail = req.user?.email
      const ipAddress = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress
      const userAgent = req.headers["user-agent"]

      const signedField = await signatureService.signField(
        {
          signature_field_id,
          signature_data,
          ip_address: typeof ipAddress === "string" ? ipAddress : undefined,
          user_agent: userAgent,
        },
        userId,
        userEmail
      )

      log.info(`Signature added to field ${signature_field_id}`)

      res.json({
        success: true,
        message: "Signature added successfully",
        data: signedField,
      })
    } catch (error: any) {
      log.error("Error signing field:", error)
      res.status(500).json({
        success: false,
        error: error.message || "Failed to add signature",
      })
    }
  }
)

/**
 * GET /api/signatures/document/:documentId
 * Get signature status for a document
 */
router.get(
  "/document/:documentId",
  validateParams(Joi.object({ documentId: schemas.uuid })),
  async (req: express.Request, res: express.Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { documentId } = req.params

      const signatureStatus = await signatureService.getDocumentSignatureStatus(documentId)

      if (!signatureStatus) {
        return res.status(404).json({
          success: false,
          error: "No signature request found for this document",
        })
      }

      res.json({
        success: true,
        data: signatureStatus,
      })
    } catch (error: any) {
      log.error("Error getting signature status:", error)
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get signature status",
      })
    }
  }
)

/**
 * POST /api/signatures/sign-pdf/:documentId
 * Sign the PDF document using Documenso library
 */
router.post(
  "/sign-pdf/:documentId",
  requirePermission("documents.update"),
  validateParams(Joi.object({ documentId: schemas.uuid })),
  validate(
    Joi.object({
      signature_field_ids: Joi.array().items(schemas.uuid).min(1).required(),
    })
  ),
  async (req: express.Request, res: express.Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { documentId } = req.params
      const { signature_field_ids } = req.body

      const signedPdf = await signatureService.signPdfDocument(documentId, signature_field_ids)

      // Return PDF as download
      res.setHeader("Content-Type", "application/pdf")
      res.setHeader("Content-Disposition", `attachment; filename="signed-document-${documentId}.pdf"`)
      res.send(signedPdf)

      log.info(`PDF signed for document ${documentId}`)
    } catch (error: any) {
      log.error("Error signing PDF:", error)
      res.status(500).json({
        success: false,
        error: error.message || "Failed to sign PDF",
      })
    }
  }
)

/**
 * GET /api/signatures/recipient/:token
 * Get signature request details by invitation token (for external signers)
 */
router.get(
  "/recipient/:token",
  async (req: express.Request, res: express.Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { token } = req.params

      const recipientResult = await pool.query(
        `
        SELECT 
          sr.*,
          ds.document_id,
          ds.title as signature_title,
          ds.status as signature_status,
          d.name as document_name,
          d.file_path
        FROM signature_recipients sr
        JOIN document_signatures ds ON sr.document_signature_id = ds.id
        JOIN documents d ON ds.document_id = d.id
        WHERE sr.invitation_token = $1
      `,
        [token]
      )

      if (recipientResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Invalid or expired invitation token",
        })
      }

      const recipient = recipientResult.rows[0]

      // Check if token expired
      if (recipient.invitation_expires_at && new Date(recipient.invitation_expires_at) < new Date()) {
        return res.status(410).json({
          success: false,
          error: "Invitation token has expired",
        })
      }

      // Get signature fields for this document
      const fieldsResult = await pool.query(
        `
        SELECT * FROM signature_fields 
        WHERE document_id = $1 
        AND (assigned_to_email = $2 OR assigned_to_email IS NULL)
        ORDER BY page_number, y_position DESC
      `,
        [recipient.document_id, recipient.email]
      )

      res.json({
        success: true,
        data: {
          recipient,
          fields: fieldsResult.rows,
        },
      })
    } catch (error: any) {
      log.error("Error getting recipient details:", error)
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get recipient details",
      })
    }
  }
)

/**
 * GET /api/signatures/audit/:documentId
 * Get audit log for a document's signatures
 */
router.get(
  "/audit/:documentId",
  requirePermission("documents.read"),
  validateParams(Joi.object({ documentId: schemas.uuid })),
  async (req: express.Request, res: express.Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { documentId } = req.params
      const limit = parseInt(req.query.limit as string) || 50
      const offset = parseInt(req.query.offset as string) || 0

      const auditResult = await pool.query(
        `
        SELECT * FROM signature_audit_logs
        WHERE document_id = $1
        ORDER BY performed_at DESC
        LIMIT $2 OFFSET $3
      `,
        [documentId, limit, offset]
      )

      const countResult = await pool.query(
        `SELECT COUNT(*) as total FROM signature_audit_logs WHERE document_id = $1`,
        [documentId]
      )

      res.json({
        success: true,
        data: auditResult.rows,
        pagination: {
          total: parseInt(countResult.rows[0].total),
          limit,
          offset,
        },
      })
    } catch (error: any) {
      log.error("Error getting audit log:", error)
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get audit log",
      })
    }
  }
)

export default router

