"use client";

import { useTranslations } from "next-intl";
import { useCallback, useState, useRef } from "react";
import { UploadCloudIcon } from "./Icons";

type Props = {
  onFilesSelected: (files: File[]) => void;
};

export function DropZone({ onFilesSelected }: Props) {
  const t = useTranslations("upload");
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) onFilesSelected(files);
    },
    [onFilesSelected]
  );

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onClick={() => inputRef.current?.click()}
      className={`relative rounded-xl border px-5 py-12 text-center cursor-pointer transition-all duration-200 ${
        isDragOver
          ? "border-accent/40 bg-accent-soft/20"
          : "border-border/70 hover:border-ink-light/40"
      }`}
    >
      <div className={`mx-auto mb-4 text-ink-light transition-colors duration-200 ${isDragOver ? "text-accent" : ""}`}>
        <UploadCloudIcon className="w-8 h-8 mx-auto" />
      </div>

      <p className="text-[13px] text-ink-mid mb-1">{t("dropzone")}</p>

      <button
        type="button"
        className="mt-3 inline-block rounded-full bg-ink text-surface px-5 py-2 text-[12px] font-medium tracking-wide hover:bg-ink/80 active:scale-[0.97] transition-all duration-150"
        onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
      >
        {t("selectFiles")}
      </button>

      <p className="mt-3 text-[10px] text-ink-light tracking-wider uppercase">{t("fileLimits")}</p>

      <input ref={inputRef} type="file" multiple accept="*/*" className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (files.length > 0) onFilesSelected(files);
          if (inputRef.current) inputRef.current.value = "";
        }}
      />
    </div>
  );
}
