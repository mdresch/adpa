'use client';

import { useState } from 'react';
import { Keyboard, UploadCloud, Pen } from 'lucide-react';

import { SignatureType, isBase64Image } from '@/lib/signature/constants';
import { SignaturePadDraw } from './SignaturePadDraw';
import { SignaturePadType } from './SignaturePadType';
import { SignaturePadUpload } from './SignaturePadUpload';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export type SignaturePadValue = {
  type: SignatureType;
  value: string;
};

export type SignaturePadProps = {
  value?: string;
  onChange?: (_value: SignaturePadValue) => void;
  disabled?: boolean;
  typedSignatureEnabled?: boolean;
  uploadSignatureEnabled?: boolean;
  drawSignatureEnabled?: boolean;
  onValidityChange?: (isValid: boolean) => void;
  className?: string;
};

export const SignaturePad = ({
  value = '',
  onChange,
  disabled = false,
  typedSignatureEnabled = true,
  uploadSignatureEnabled = true,
  drawSignatureEnabled = true,
  className,
}: SignaturePadProps) => {
  const [imageSignature, setImageSignature] = useState(isBase64Image(value) ? value : '');
  const [drawSignature, setDrawSignature] = useState(isBase64Image(value) ? value : '');
  const [typedSignature, setTypedSignature] = useState(isBase64Image(value) ? '' : value);

  /**
   * Get the first enabled tab that has a signature if possible, otherwise just get
   * the first enabled tab.
   */
  const [tab, setTab] = useState<'draw' | 'text' | 'image'>(() => {
    // First passthrough to check to see if there's a signature for a given tab.
    if (drawSignatureEnabled && drawSignature) {
      return 'draw';
    }

    if (typedSignatureEnabled && typedSignature) {
      return 'text';
    }

    if (uploadSignatureEnabled && imageSignature) {
      return 'image';
    }

    // Second passthrough to just select the first available tab.
    if (drawSignatureEnabled) {
      return 'draw';
    }

    if (typedSignatureEnabled) {
      return 'text';
    }

    if (uploadSignatureEnabled) {
      return 'image';
    }

    return 'draw'; // Default fallback
  });

  const onImageSignatureChange = (value: string) => {
    setImageSignature(value);

    onChange?.({
      type: SignatureType.UPLOAD,
      value,
    });
  };

  const onDrawSignatureChange = (value: string) => {
    setDrawSignature(value);

    onChange?.({
      type: SignatureType.DRAW,
      value,
    });
  };

  const onTypedSignatureChange = (value: string) => {
    setTypedSignature(value);

    onChange?.({
      type: SignatureType.TYPE,
      value,
    });
  };

  return (
    <div className={cn('flex h-full w-full flex-col', className)}>
      <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)} className="flex-1">
        <TabsList className="grid w-full grid-cols-3">
          {drawSignatureEnabled && (
            <TabsTrigger value="draw" className="flex items-center gap-2">
              <Pen className="h-4 w-4" />
              Draw
            </TabsTrigger>
          )}
          {typedSignatureEnabled && (
            <TabsTrigger value="text" className="flex items-center gap-2">
              <Keyboard className="h-4 w-4" />
              Type
            </TabsTrigger>
          )}
          {uploadSignatureEnabled && (
            <TabsTrigger value="image" className="flex items-center gap-2">
              <UploadCloud className="h-4 w-4" />
              Upload
            </TabsTrigger>
          )}
        </TabsList>

        {drawSignatureEnabled && (
          <TabsContent value="draw" className="mt-4 flex-1">
            <SignaturePadDraw value={drawSignature} onChange={onDrawSignatureChange} />
          </TabsContent>
        )}

        {typedSignatureEnabled && (
          <TabsContent value="text" className="mt-4 flex-1">
            <SignaturePadType value={typedSignature} onChange={onTypedSignatureChange} />
          </TabsContent>
        )}

        {uploadSignatureEnabled && (
          <TabsContent value="image" className="mt-4 flex-1">
            <SignaturePadUpload value={imageSignature} onChange={onImageSignatureChange} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

