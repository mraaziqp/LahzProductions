/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ReactNode } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { UploadCloud, AlertCircle } from 'lucide-react';
import { validateImageFile } from '../services/database';

export interface PickedImage {
  file: File;
  preview: string;
}

export const pickImage = (file: File): PickedImage => ({ file, preview: URL.createObjectURL(file) });

interface ImageDropzoneProps {
  label: ReactNode;
  emptyTitle: string;
  emptyNote: string;
  onFiles: (files: File[]) => void;
  onError: (message: string) => void;
  image?: PickedImage;
  error?: string;
  disabled?: boolean;
  multiple?: boolean;
  /** Gold border once filled (used for featured / single photos). */
  highlight?: boolean;
}

export default function ImageDropzone({
  label, emptyTitle, emptyNote, onFiles, onError, image, error, disabled, multiple, highlight,
}: ImageDropzoneProps) {
  const onDrop = (accepted: File[], rejected: FileRejection[]) => {
    const invalid = accepted.map(f => validateImageFile(f)).find(v => !v.valid);
    const valid = accepted.filter(f => validateImageFile(f).valid);
    if (rejected.length > 0) onError('Some files were rejected. Please use JPG, PNG, or WebP.');
    else if (invalid) onError(invalid.error || 'Invalid image');
    else onError('');
    if (valid.length > 0) onFiles(valid);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'image/webp': ['.webp'] },
    multiple: !!multiple,
    disabled,
  });

  const filledBorder = highlight
    ? 'border-brand-yellow bg-brand-yellow/5 ring-2 ring-brand-teal/20 shadow-sm'
    : 'border-brand-teal bg-teal-50/10';

  return (
    <div className="flex flex-col gap-4">
      <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">{label}</label>
      <div
        {...getRootProps()}
        className={`${multiple ? 'p-8' : 'aspect-video p-6'} border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all ${
          isDragActive ? 'border-brand-teal bg-brand-teal/5' : image ? filledBorder : 'border-gray-200 hover:border-brand-teal/50'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />
        {image ? (
          <div className="flex flex-col items-center w-full h-full min-h-0">
            <img src={image.preview} alt="Preview" className="flex-1 min-h-0 max-w-full object-contain rounded" />
            <div className="mt-2 text-center">
              <span className="text-[10px] uppercase font-bold text-brand-teal">✓ Image Ready</span>
              <span className="text-[10px] text-gray-500 block mt-1 truncate max-w-[16rem]">{image.file.name}</span>
            </div>
          </div>
        ) : (
          <>
            <UploadCloud className="w-10 h-10 text-gray-300 mb-3" />
            <span className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-1 text-center">{emptyTitle}</span>
            <span className="text-[10px] text-gray-300 text-center">Drag &amp; drop or tap to browse</span>
            <span className="text-[10px] text-gray-400 mt-2 text-center">{emptyNote}</span>
          </>
        )}
      </div>
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}
    </div>
  );
}
