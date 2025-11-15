import * as fs from 'node:fs';

import { signWithP12 } from '@documenso/pdf-sign';

import { getCertificateStatus } from '../../utils/cert-status';
import { env } from '../../utils/env';
import { addSigningPlaceholder } from '../helpers/add-signing-placeholder';
import { updateSigningPlaceholder } from '../helpers/update-signing-placeholder';

export type SignWithLocalCertOptions = {
  pdf: Buffer;
};

export const signWithLocalCert = async ({ pdf }: SignWithLocalCertOptions) => {
  const { pdf: pdfWithPlaceholder, byteRange } = updateSigningPlaceholder({
    pdf: await addSigningPlaceholder({ pdf }),
  });

  const pdfWithoutSignature = Buffer.concat([
    new Uint8Array(pdfWithPlaceholder.subarray(0, byteRange[1])),
    new Uint8Array(pdfWithPlaceholder.subarray(byteRange[2])),
  ]);

  const signatureLength = byteRange[2] - byteRange[1];

  const certStatus = getCertificateStatus();

  if (!certStatus.isAvailable) {
    console.error('Certificate error: Certificate not available for document signing');
    throw new Error('Document signing failed: Certificate not available');
  }

  let cert: Buffer | null = null;

  // Check environment variable first (base64 encoded certificate)
  const localFileContents = env('SIGNING_CERT_BASE64') || env('NEXT_PRIVATE_SIGNING_LOCAL_FILE_CONTENTS');

  if (localFileContents) {
    try {
      cert = Buffer.from(localFileContents, 'base64');
    } catch {
      throw new Error('Failed to decode certificate contents from environment variable');
    }
  }

  // If not in env var, try file path
  if (!cert) {
    const certPath = env('SIGNING_CERT_PATH') || 
                     env('NEXT_PRIVATE_SIGNING_LOCAL_FILE_PATH') || 
                     (process.env.NODE_ENV === 'production' ? '/opt/documenso/cert.p12' : './example/cert.p12');

    try {
      if (fs.existsSync(certPath)) {
        cert = Buffer.from(fs.readFileSync(certPath));
      } else {
        throw new Error(`Certificate file not found at: ${certPath}`);
      }
    } catch (error) {
      console.error('Certificate error: Failed to read certificate file', error);
      throw new Error(`Document signing failed: Certificate file not accessible - ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const signature = signWithP12({
    cert,
    content: pdfWithoutSignature,
    password: env('SIGNING_CERT_PASSWORD') || env('NEXT_PRIVATE_SIGNING_PASSPHRASE') || undefined,
  });

  const signatureAsHex = signature.toString('hex');

  const signedPdf = Buffer.concat([
    new Uint8Array(pdfWithPlaceholder.subarray(0, byteRange[1])),
    new Uint8Array(Buffer.from(`<${signatureAsHex.padEnd(signatureLength - 2, '0')}>`)),
    new Uint8Array(pdfWithPlaceholder.subarray(byteRange[2])),
  ]);

  return signedPdf;
};
