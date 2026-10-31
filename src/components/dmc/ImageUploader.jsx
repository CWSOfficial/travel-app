import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { UploadCloud, X, Loader2 } from "lucide-react";

/**
 * Multi-file drag-and-drop image uploader.
 * Uploads each file via the UploadFile integration and stores the returned URLs.
 * value: string[] — array of uploaded photo URLs.
 * onChange: (urls: string[]) => void
 */
export default function ImageUploader({ value = [], onChange, max = 10 }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) return;
    const remaining = max - value.length;
    if (remaining <= 0) {
      setError(`Maximum ${max} photos allowed.`);
      return;
    }
    const toUpload = files.slice(0, remaining);
    setError(null);
    setUploading(true);
    try {
      const urls = [];
      for (const file of toUpload) {
        const res = await base44.integrations.Core.UploadFile({ file });
        if (res?.file_url) urls.push(res.file_url);
      }
      onChange([...value, ...urls]);
    } catch (e) {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (idx) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
          dragging
            ? "border-teal-400/60 bg-teal-500/10"
            : "border-white/15 bg-white/[0.03] hover:border-teal-400/40 hover:bg-white/[0.06]"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-7 h-7 text-teal-400 animate-spin" />
            <p className="text-xs text-slate-400">Uploading…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <UploadCloud className="w-7 h-7 text-teal-400" />
            <p className="text-sm font-medium text-slate-200">
              Drag & drop photos here, or click to browse
            </p>
            <p className="text-[11px] text-slate-500">
              {value.length}/{max} photos uploaded
            </p>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {value.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {value.map((url, idx) => (
            <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border border-white/10">
              <img src={url} alt={`Trip photo ${idx + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removePhoto(idx); }}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}