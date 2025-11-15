/**
 * Signature-related constants adapted from Documenso
 */

export const SIGNATURE_CANVAS_DPI = 2;
export const SIGNATURE_MIN_COVERAGE_THRESHOLD = 0.01;

export const isBase64Image = (value: string): boolean => {
  return value.startsWith('data:image/png;base64,') || 
         value.startsWith('data:image/jpeg;base64,') ||
         value.startsWith('data:image/jpg;base64,');
};

/**
 * Signature types
 */
export enum SignatureType {
  DRAW = 'DRAW',
  TYPE = 'TYPE',
  UPLOAD = 'UPLOAD',
}

