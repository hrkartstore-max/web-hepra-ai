"use client";

import { useCallback, useRef, useState } from "react";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export interface UploadedImage {
  id: string;
  file: File;
  previewUrl: string;
}

interface UploadZoneProps {
  images: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
  maxImages?: number;
}

export function UploadZone({ images, onChange, maxImages = 5 }: UploadZoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) return;
      setError(null);

      const incoming = Array.from(fileList);
      const accepted: UploadedImage[] = [];

      for (const file of incoming) {
        if (images.length + accepted.length >= maxImages) {
          setError(`Maximum ${maxImages} images allowed.`);
          break;
        }
        if (!ALLOWED_TYPES.includes(file.type)) {
          setError(`"${file.name}" is not a PNG, JPG, or WEBP image.`);
          continue;
        }
        if (file.size > MAX_SIZE_BYTES) {
          setError(`"${file.name}" exceeds the 5MB limit.`);
          continue;
        }
        accepted.push({
          id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
          file,
          previewUrl: URL.createObjectURL(file),
        });
      }

      if (accepted.length) onChange([...images, ...accepted]);
    },
    [images, maxImages, onChange]
  );

  const removeImage = (id: string) => {
    const target = images.find((i) => i.id === id);
    if (target) URL.revokeObjectURL(target.previewUrl);
    onChange(images.filter((i) => i.id !== id));
  };

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          addFiles(e.dataTransfer.files);
        }}
        className={`cursor-pointer rounded-xl2 border-2 border-dashed px-6 py-10 text-center transition ${
          dragActive ? "border-primary bg-primary/5" : "border-border hover:border-white/25"
        }`}
      >
        <p className="text-sm text-white/80 font-medium">
          Drop reference images here, or click to browse
        </p>
        <p className="text-xs text-muted mt-1">PNG, JPG, WEBP — up to 5MB each</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files);
            e.currentTarget.value = "";
          }}
        />
      </div>

      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}

      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-4">
          {images.map((img) => (
            <div key={img.id} className="relative group rounded-lg overflow-hidden border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.previewUrl}
                alt={img.file.name}
                className="w-full h-24 object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(img.id)}
                aria-label={`Remove ${img.file.name}`}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
