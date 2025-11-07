/**
 * Modern Upload Zone Component
 * Beautiful drag-and-drop file upload with animations
 */

import React, { useCallback, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, X, CheckCircle, AlertCircle, File } from '@/components/ui/icons-shim';
import { maturityTheme } from '@/lib/theme/maturity-portal-theme';

interface UploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  maxFiles?: number;
  maxSizeMB?: number;
  disabled?: boolean;
}

export const UploadZone: React.FC<UploadZoneProps> = ({
  onFilesSelected,
  accept = '.pdf,.docx,.txt,.md',
  maxFiles = 100,
  maxSizeMB = 10,
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    onFilesSelected(files);
  }, [disabled, onFilesSelected]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      onFilesSelected(files);
    }
  }, [onFilesSelected]);

  return (
    <motion.div
      className="relative rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden"
      style={{
        borderColor: isDragging 
          ? maturityTheme.colors.primary[400]
          : maturityTheme.colors.border.default,
        backgroundColor: isDragging
          ? `${maturityTheme.colors.primary[500]}10`
          : maturityTheme.colors.surface.default,
      }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={() => !disabled && fileInputRef.current?.click()}
      whileHover={!disabled ? { scale: 1.01 } : undefined}
      animate={{
        boxShadow: isDragging
          ? maturityTheme.shadows.glowStrong
          : maturityTheme.shadows.md,
      }}
    >
      <div className="p-12 text-center">
        <motion.div
          className="inline-block mb-4"
          animate={{
            scale: isDragging ? 1.2 : 1,
            rotate: isDragging ? [0, -5, 5, -5, 0] : 0,
          }}
          transition={{ duration: 0.3 }}
        >
          <Upload 
            className="w-16 h-16 mx-auto"
            style={{ 
              color: isDragging 
                ? maturityTheme.colors.primary[400]
                : maturityTheme.colors.text.muted 
            }}
          />
        </motion.div>

        <h3 
          className="text-2xl font-semibold mb-2"
          style={{ color: maturityTheme.colors.text.primary }}
        >
          {isDragging ? 'Drop files here' : 'Upload Documents'}
        </h3>
        
        <p 
          className="text-base mb-4"
          style={{ color: maturityTheme.colors.text.secondary }}
        >
          {isDragging 
            ? 'Release to upload'
            : 'Drag and drop files here, or click to browse'
          }
        </p>

        <div 
          className="text-sm"
          style={{ color: maturityTheme.colors.text.muted }}
        >
          <p>Supports: {accept.split(',').join(', ').toUpperCase()}</p>
          <p>Maximum: {maxFiles} files, {maxSizeMB}MB each</p>
        </div>

        <motion.button
          className="mt-6 px-8 py-3 rounded-lg font-semibold text-base"
          style={{
            backgroundColor: maturityTheme.colors.primary[500],
            color: maturityTheme.colors.text.inverse,
          }}
          whileHover={{ 
            scale: 1.05,
            backgroundColor: maturityTheme.colors.primary[400],
          }}
          whileTap={{ scale: 0.95 }}
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
        >
          Select Files
        </motion.button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={accept}
          className="hidden"
          onChange={handleFileInput}
          disabled={disabled}
        />
      </div>

      {/* Animated background effect */}
      {isDragging && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            background: `radial-gradient(circle at center, ${maturityTheme.colors.primary[500]}20 0%, transparent 70%)`,
          }}
        />
      )}
    </motion.div>
  );
};

interface FileItemProps {
  file: File;
  status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error';
  progress?: number;
  error?: string;
  onRemove?: () => void;
}

export const FileItem: React.FC<FileItemProps> = ({
  file,
  status,
  progress = 0,
  error,
  onRemove,
}) => {
  const statusConfig = {
    pending: {
      icon: FileText,
      color: maturityTheme.colors.text.muted,
      bg: maturityTheme.colors.surface.default,
    },
    uploading: {
      icon: Upload,
      color: maturityTheme.colors.primary[400],
      bg: `${maturityTheme.colors.primary[500]}10`,
    },
    processing: {
      icon: Upload,
      color: maturityTheme.colors.secondary[400],
      bg: `${maturityTheme.colors.secondary[500]}10`,
    },
    complete: {
      icon: CheckCircle,
      color: maturityTheme.colors.success.text,
      bg: maturityTheme.colors.success.bg,
    },
    error: {
      icon: AlertCircle,
      color: maturityTheme.colors.error.text,
      bg: maturityTheme.colors.error.bg,
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;
  const isAnimating = status === 'uploading' || status === 'processing';

  return (
    <motion.div
      className="rounded-lg border p-4"
      style={{
        backgroundColor: config.bg,
        borderColor: maturityTheme.colors.border.muted,
      }}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      layout
    >
      <div className="flex items-center gap-4">
        <motion.div
          animate={isAnimating ? { rotate: 360 } : {}}
          transition={isAnimating ? { duration: 1, repeat: Infinity, ease: 'linear' } : {}}
        >
          <Icon className="w-8 h-8" style={{ color: config.color }} />
        </motion.div>

        <div className="flex-1 min-w-0">
          <p 
            className="font-medium truncate"
            style={{ color: maturityTheme.colors.text.primary }}
          >
            {file.name}
          </p>
          <p 
            className="text-sm"
            style={{ color: maturityTheme.colors.text.secondary }}
          >
            {(file.size / 1024 / 1024).toFixed(2)} MB
          </p>
          
          {(status === 'uploading' || status === 'processing') && (
            <div className="mt-2">
              <div 
                className="h-1.5 rounded-full overflow-hidden"
                style={{ backgroundColor: maturityTheme.colors.surface.disabled }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: config.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <p 
                className="text-xs mt-1"
                style={{ color: maturityTheme.colors.text.muted }}
              >
                {progress}% • {status === 'uploading' ? 'Uploading...' : 'Processing...'}
              </p>
            </div>
          )}

          {error && (
            <p 
              className="text-sm mt-1"
              style={{ color: maturityTheme.colors.error.text }}
            >
              {error}
            </p>
          )}
        </div>

        {status === 'pending' && onRemove && (
          <motion.button
            className="p-2 rounded-lg"
            style={{ 
              color: maturityTheme.colors.text.muted,
              backgroundColor: maturityTheme.colors.surface.hover,
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onRemove}
          >
            <X className="w-5 h-5" />
          </motion.button>
        )}

        {status === 'complete' && (
          <CheckCircle className="w-6 h-6" style={{ color: config.color }} />
        )}

        {status === 'error' && (
          <AlertCircle className="w-6 h-6" style={{ color: config.color }} />
        )}
      </div>
    </motion.div>
  );
};
