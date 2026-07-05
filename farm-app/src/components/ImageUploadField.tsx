"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { uploadTaskImage } from "@/lib/data";

interface Props {
  value: string | null;
  onChange: (url: string | null) => void;
  label: string;
}

export function ImageUploadField({ value, onChange, label }: Props) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadTaskImage(file);
      onChange(url);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <span className="mb-1 block text-sm font-medium text-neutral-700">{label}</span>
      {value ? (
        <div className="relative inline-block">
          <Image
            src={value}
            alt=""
            width={96}
            height={96}
            unoptimized
            className="h-24 w-24 rounded-md border border-neutral-200 object-cover"
          />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs text-white shadow-sm"
          >
            ×
          </button>
        </div>
      ) : (
        <label className="flex h-24 w-24 cursor-pointer items-center justify-center rounded-md border border-dashed border-neutral-300 px-2 text-center text-xs text-neutral-400 transition-colors hover:border-green-600 hover:text-green-700">
          {uploading ? "Yükleniyor..." : "+ Foto ekle"}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFile}
            disabled={uploading}
            className="hidden"
          />
        </label>
      )}
    </div>
  );
}
