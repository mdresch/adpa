/**
 * Certificate Status Utility for Documenso Signing Integration
 * Replaces @documenso/lib/server-only/cert/cert-status for ADPA compatibility
 */

import * as fs from 'node:fs';
import { env } from './env';

export interface CertificateStatus {
  isAvailable: boolean;
  error?: string;
}

/**
 * Check if certificate is available for signing
 * @returns Certificate status
 */
export const getCertificateStatus = (): CertificateStatus => {
  // Check for certificate in environment variable (base64)
  const localFileContents = env('SIGNING_CERT_BASE64') || env('NEXT_PRIVATE_SIGNING_LOCAL_FILE_CONTENTS');
  
  if (localFileContents) {
    try {
      Buffer.from(localFileContents, 'base64');
      return { isAvailable: true };
    } catch {
      return { 
        isAvailable: false, 
        error: 'Failed to decode certificate from environment variable' 
      };
    }
  }

  // Check for certificate file path
  const certPath = env('SIGNING_CERT_PATH') || 
                   env('NEXT_PRIVATE_SIGNING_LOCAL_FILE_PATH') || 
                   (process.env.NODE_ENV === 'production' ? '/opt/documenso/cert.p12' : './example/cert.p12');

  try {
    if (fs.existsSync(certPath)) {
      return { isAvailable: true };
    } else {
      return { 
        isAvailable: false, 
        error: `Certificate file not found at: ${certPath}` 
      };
    }
  } catch (error) {
    return { 
      isAvailable: false, 
      error: `Error checking certificate file: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
};

