import { match } from 'ts-pattern';

import { env } from '../utils/env';

import { signWithGoogleCloudHSM } from './transports/google-cloud-hsm';
import { signWithLocalCert } from './transports/local-cert';

export type SignOptions = {
  pdf: Buffer;
};

export const signPdf = async ({ pdf }: SignOptions) => {
  // Support both ADPA and Documenso environment variable names
  const transport = env('SIGNING_TRANSPORT') || 
                    env('NEXT_PRIVATE_SIGNING_TRANSPORT') || 
                    'local';

  return await match(transport)
    .with('local', async () => signWithLocalCert({ pdf }))
    .with('gcloud-hsm', async () => signWithGoogleCloudHSM({ pdf }))
    .otherwise(() => {
      throw new Error(`Unsupported signing transport: ${transport}. Supported: 'local', 'gcloud-hsm'`);
    });
};
