/**
 * Documenso PDF Signing Integration for ADPA
 * 
 * This module provides PDF signing functionality extracted from Documenso
 * and adapted to work with ADPA's Express.js backend.
 * 
 * Main exports:
 * - signPdf: Sign a PDF document using configured certificate
 * - addSigningPlaceholder: Add signature placeholder to PDF
 * - normalizeSignatureAppearances: Normalize signature appearances in PDF
 */

export { signPdf, type SignOptions } from './signing';
export { addSigningPlaceholder, type AddSigningPlaceholderOptions } from './signing/helpers/add-signing-placeholder';
export { updateSigningPlaceholder, type UpdateSigningPlaceholderOptions } from './signing/helpers/update-signing-placeholder';
export { normalizeSignatureAppearances } from './pdf/normalize-signature-appearances';
export { signWithLocalCert, type SignWithLocalCertOptions } from './signing/transports/local-cert';
export { signWithGoogleCloudHSM, type SignWithGoogleCloudHSMOptions } from './signing/transports/google-cloud-hsm';

