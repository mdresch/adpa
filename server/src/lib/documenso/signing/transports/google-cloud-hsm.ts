import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { signWithGCloud } from '@documenso/pdf-sign';

import { env } from '../../utils/env';
import { isPathContained } from '../../../utils/pathSecurity';
import { addSigningPlaceholder } from '../helpers/add-signing-placeholder';
import { updateSigningPlaceholder } from '../helpers/update-signing-placeholder';

export type SignWithGoogleCloudHSMOptions = {
  pdf: Buffer;
};

export const signWithGoogleCloudHSM = async ({ pdf }: SignWithGoogleCloudHSMOptions) => {
  const keyPath = env('NEXT_PRIVATE_SIGNING_GCLOUD_HSM_KEY_PATH');

  if (!keyPath) {
    throw new Error('No certificate path provided for Google Cloud HSM signing');
  }

  const googleApplicationCredentialsContents = env(
    'NEXT_PRIVATE_SIGNING_GCLOUD_APPLICATION_CREDENTIALS_CONTENTS',
  );

  // To handle hosting in serverless environments like Vercel we can supply the base64 encoded
  // application credentials as an environment variable and write it to a file if it doesn't exist
  if (googleApplicationCredentialsContents) {
    const credentialsDir = path.join(os.tmpdir(), 'adpa-documenso');
    const credentialsPath = path.join(credentialsDir, 'google-application-credentials.json');

    // Security check: ensure credentials path stays within temp directory
    const resolvedCredentialsPath = path.resolve(credentialsPath);
    const resolvedTmpDir = path.resolve(os.tmpdir());
    
    if (!isPathContained(resolvedCredentialsPath, resolvedTmpDir)) {
      throw new Error('Invalid credentials path: path traversal detected');
    }

    if (!fs.existsSync(credentialsPath)) {
      const contents = new Uint8Array(Buffer.from(googleApplicationCredentialsContents, 'base64'));
      fs.mkdirSync(credentialsDir, { recursive: true, mode: 0o700 });
      fs.writeFileSync(credentialsPath, contents, { mode: 0o600 });
    }

    process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
  }

  const { pdf: pdfWithPlaceholder, byteRange } = updateSigningPlaceholder({
    pdf: await addSigningPlaceholder({ pdf }),
  });

  const pdfWithoutSignature = Buffer.concat([
    new Uint8Array(pdfWithPlaceholder.subarray(0, byteRange[1])),
    new Uint8Array(pdfWithPlaceholder.subarray(byteRange[2])),
  ]);

  const signatureLength = byteRange[2] - byteRange[1];

  let cert: Buffer | null = null;

  const googleCloudHsmPublicCrtFileContents = env(
    'NEXT_PRIVATE_SIGNING_GCLOUD_HSM_PUBLIC_CRT_FILE_CONTENTS',
  );

  if (googleCloudHsmPublicCrtFileContents) {
    cert = Buffer.from(googleCloudHsmPublicCrtFileContents, 'base64');
  }

  if (!cert) {
    cert = Buffer.from(
      fs.readFileSync(
        env('NEXT_PRIVATE_SIGNING_GCLOUD_HSM_PUBLIC_CRT_FILE_PATH') || './example/cert.crt',
      ),
    );
  }

  const signature = signWithGCloud({
    keyPath,
    cert,
    content: pdfWithoutSignature,
  });

  const signatureAsHex = signature.toString('hex');

  const signedPdf = Buffer.concat([
    new Uint8Array(pdfWithPlaceholder.subarray(0, byteRange[1])),
    new Uint8Array(Buffer.from(`<${signatureAsHex.padEnd(signatureLength - 2, '0')}>`)),
    new Uint8Array(pdfWithPlaceholder.subarray(byteRange[2])),
  ]);

  return signedPdf;
};
