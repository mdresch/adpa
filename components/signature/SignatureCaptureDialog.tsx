'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SignaturePad, SignaturePadValue } from './SignaturePad';
import { SignatureRender } from './SignatureRender';
import { cn } from '@/lib/utils';

export type SignatureCaptureDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value?: string;
  onSave: (signature: string) => void;
  disabled?: boolean;
  dialogTitle?: string;
  dialogConfirmText?: string;
  disableAnimation?: boolean;
  typedSignatureEnabled?: boolean;
  uploadSignatureEnabled?: boolean;
  drawSignatureEnabled?: boolean;
};

export const SignatureCaptureDialog = ({
  open,
  onOpenChange,
  value,
  onSave,
  disabled = false,
  dialogTitle = 'Sign Document',
  dialogConfirmText = 'Save Signature',
  disableAnimation = false,
  typedSignatureEnabled = true,
  uploadSignatureEnabled = true,
  drawSignatureEnabled = true,
}: SignatureCaptureDialogProps) => {
  const [signature, setSignature] = useState<string>(value ?? '');

  const handleSignatureChange = (signatureValue: SignaturePadValue) => {
    setSignature(signatureValue.value);
  };

  const handleSave = () => {
    if (signature) {
      onSave(signature);
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    setSignature(value ?? '');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview */}
          {signature && (
            <div className="rounded-lg border p-4">
              <p className="mb-2 text-sm font-medium">Preview</p>
              <div className="aspect-[4/1] w-full">
                <SignatureRender value={signature} />
              </div>
            </div>
          )}

          {/* Signature Pad */}
          <div
            className={cn(
              'aspect-signature-pad bg-background relative block w-full select-none rounded-lg border',
              {
                'pointer-events-none opacity-50': disabled,
              },
            )}
          >
            <SignaturePad
              value={signature}
              onChange={handleSignatureChange}
              disabled={disabled}
              typedSignatureEnabled={typedSignatureEnabled}
              uploadSignatureEnabled={uploadSignatureEnabled}
              drawSignatureEnabled={drawSignatureEnabled}
              className="h-[400px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={!signature || disabled}>
            {dialogConfirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

