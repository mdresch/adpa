'use client';

import type { MouseEvent, PointerEvent, TouchEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Undo2 } from 'lucide-react';
import type { StrokeOptions } from 'perfect-freehand';
import { getStroke } from 'perfect-freehand';

import { SIGNATURE_CANVAS_DPI, SIGNATURE_MIN_COVERAGE_THRESHOLD } from '@/lib/signature/constants';
import { Point } from '@/lib/signature/Point';
import { getSvgPathFromStroke } from '@/lib/signature/utils';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const checkSignatureValidity = (element: React.RefObject<HTMLCanvasElement>): boolean => {
  if (!element.current) {
    return false;
  }

  const ctx = element.current.getContext('2d');

  if (!ctx) {
    return false;
  }

  const imageData = ctx.getImageData(0, 0, element.current.width, element.current.height);
  const data = imageData.data;
  let filledPixels = 0;
  const totalPixels = data.length / 4;

  // Optimize by sampling every 4th pixel for better performance
  const sampleRate = 4;
  for (let i = 0; i < data.length; i += 4 * sampleRate) {
    if (data[i + 3] > 0) filledPixels++;
  }
  
  // Adjust total pixels count for sampling
  const sampledTotalPixels = Math.floor(totalPixels / sampleRate);
  const filledPercentage = filledPixels / sampledTotalPixels;
  const isValid = filledPercentage > SIGNATURE_MIN_COVERAGE_THRESHOLD;

  return isValid;
};

export type SignaturePadDrawProps = {
  className?: string;
  value: string;
  onChange: (_signatureDataUrl: string) => void;
};

export const SignaturePadDraw = ({
  className,
  value,
  onChange,
}: SignaturePadDrawProps) => {
  const $el = useRef<HTMLCanvasElement>(null);
  const $imageData = useRef<ImageData | null>(null);
  const $fileInput = useRef<HTMLInputElement>(null);

  const [isPressed, setIsPressed] = useState(false);
  const [lines, setLines] = useState<Point[][]>([]);
  const [currentLine, setCurrentLine] = useState<Point[]>([]);
  const [isSignatureValid, setIsSignatureValid] = useState<boolean | null>(null);
  const [selectedColor, setSelectedColor] = useState('black');

  const perfectFreehandOptions = useMemo(() => {
    const size = $el.current ? Math.min($el.current.height, $el.current.width) * 0.03 : 10;

    return {
      size,
      thinning: 0.25,
      streamline: 0.5,
      smoothing: 0.5,
      end: {
        taper: size * 2,
      },
    } satisfies StrokeOptions;
  }, []);

  const onMouseDown = (event: MouseEvent | PointerEvent | TouchEvent) => {
    if (event.cancelable) {
      event.preventDefault();
    }

    setIsPressed(true);

    const point = Point.fromEvent(event, SIGNATURE_CANVAS_DPI, $el.current);

    setCurrentLine([point]);
  };

  const onMouseMove = (event: MouseEvent | PointerEvent | TouchEvent) => {
    if (event.cancelable) {
      event.preventDefault();
    }

    if (!isPressed) {
      return;
    }

    const point = Point.fromEvent(event, SIGNATURE_CANVAS_DPI, $el.current);
    const lastPoint = currentLine[currentLine.length - 1];

    if (lastPoint && point.distanceTo(lastPoint) > 5) {
      setCurrentLine([...currentLine, point]);

      // Update the canvas here to draw the lines
      if ($el.current) {
        const ctx = $el.current.getContext('2d');

        if (ctx) {
          ctx.restore();
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.fillStyle = selectedColor;

          lines.forEach((line) => {
            const pathData = new Path2D(
              getSvgPathFromStroke(getStroke(line, perfectFreehandOptions)),
            );

            ctx.fill(pathData);
          });

          const pathData = new Path2D(
            getSvgPathFromStroke(getStroke([...currentLine, point], perfectFreehandOptions)),
          );
          ctx.fill(pathData);
        }
      }
    }
  };

  const onMouseUp = (event: MouseEvent | PointerEvent | TouchEvent, addLine = true) => {
    if (event.cancelable) {
      event.preventDefault();
    }

    setIsPressed(false);

    const point = Point.fromEvent(event, SIGNATURE_CANVAS_DPI, $el.current);

    const newLines = [...lines];

    if (addLine && currentLine.length > 0) {
      newLines.push([...currentLine, point]);
      setCurrentLine([]);
    }

    setLines(newLines);

    if ($el.current && newLines.length > 0) {
      const ctx = $el.current.getContext('2d');

      if (ctx) {
        ctx.restore();
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.fillStyle = selectedColor;

        newLines.forEach((line) => {
          const pathData = new Path2D(
            getSvgPathFromStroke(getStroke(line, perfectFreehandOptions)),
          );
          ctx.fill(pathData);
        });

        const isValidSignature = checkSignatureValidity($el);

        setIsSignatureValid(isValidSignature);

        if (isValidSignature) {
          onChange?.($el.current.toDataURL());
        }
        ctx.save();
      }
    }
  };

  const onMouseEnter = (event: MouseEvent | PointerEvent | TouchEvent) => {
    if (event.cancelable) {
      event.preventDefault();
    }

    if ('buttons' in event && event.buttons === 1) {
      onMouseDown(event);
    }
  };

  const onMouseLeave = (event: MouseEvent | PointerEvent | TouchEvent) => {
    if (event.cancelable) {
      event.preventDefault();
    }

    if (isPressed) {
      onMouseUp(event, true);
    } else {
      onMouseUp(event, false);
    }
  };

  const onClearClick = () => {
    if ($el.current) {
      const ctx = $el.current.getContext('2d');

      ctx?.clearRect(0, 0, $el.current.width, $el.current.height);
      $imageData.current = null;
    }

    if ($fileInput.current) {
      $fileInput.current.value = '';
    }

    onChange('');

    setLines([]);
    setCurrentLine([]);
    setIsPressed(false);
  };

  const onUndoClick = () => {
    if (lines.length === 0 || !$el.current) {
      return;
    }

    const newLines = lines.slice(0, -1);
    setLines(newLines);

    // Clear and redraw the canvas
    const ctx = $el.current.getContext('2d');
    const { width, height } = $el.current;
    ctx?.clearRect(0, 0, width, height);

    if ($imageData.current) {
      ctx?.putImageData($imageData.current, 0, 0);
    }

    newLines.forEach((line) => {
      const pathData = new Path2D(getSvgPathFromStroke(getStroke(line, perfectFreehandOptions)));
      ctx?.fill(pathData);
    });

    onChange?.($el.current.toDataURL());
  };

  useEffect(() => {
    if ($el.current) {
      $el.current.width = $el.current.clientWidth * SIGNATURE_CANVAS_DPI;
      $el.current.height = $el.current.clientHeight * SIGNATURE_CANVAS_DPI;
    }

    if ($el.current && value) {
      const ctx = $el.current.getContext('2d');

      const { width, height } = $el.current;

      const img = new Image();

      img.onload = () => {
        ctx?.drawImage(img, 0, 0, Math.min(width, img.width), Math.min(height, img.height));

        const defaultImageData = ctx?.getImageData(0, 0, width, height) || null;

        $imageData.current = defaultImageData;
      };

      img.src = value;
    }
  }, [value]);

  return (
    <div className={cn('relative h-full w-full', className)}>
      <canvas
        data-testid="signature-pad-draw"
        ref={$el}
        className="h-full w-full cursor-crosshair touch-none"
        style={{ touchAction: 'none' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onTouchStart={onMouseDown}
        onTouchMove={onMouseMove}
        onTouchEnd={onMouseUp}
      />

      <div className="absolute bottom-4 right-4 flex gap-2">
        {lines.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onUndoClick}
            className="h-8 w-8 p-0"
          >
            <Undo2 className="h-4 w-4" />
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClearClick}
          className="h-8 w-8 p-0"
        >
          Clear
        </Button>
      </div>
    </div>
  );
};

