"use client";

import { useTranslations, useLocale } from "next-intl";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { DropZone } from "@/components/DropZone";
import { FileList, FileItem } from "@/components/FileList";
import { PeriodSelector } from "@/components/PeriodSelector";
import { UploadButton } from "@/components/UploadButton";
import { WorldTree, RootLine } from "@/components/WorldTree";

type SingleUploadInfo = {
  filename: string;
  r2Key: string;
  multipart: false;
  uploadUrl: string;
};

type MultipartUploadInfo = {
  filename: string;
  r2Key: string;
  multipart: true;
  uploadId: string;
  chunkSize: number;
  totalParts: number;
  partUrls: string[];
};

type UploadInfo = SingleUploadInfo | MultipartUploadInfo;

async function uploadViaProxy(
  file: File,
  r2Key: string,
  onProgress: (pct: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("r2Key", r2Key);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload/proxy");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) { onProgress(100); resolve(); }
      else reject(new Error(`Upload failed: ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error("Upload error"));
    xhr.send(formData);
  });
}

export default function UploadPage() {
  const t = useTranslations("upload");
  const locale = useLocale();
  const router = useRouter();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [expiryDays, setExpiryDays] = useState(7);
  const [uploading, setUploading] = useState(false);

  const handleFilesSelected = useCallback((newFiles: File[]) => {
    setFiles((prev) => [...prev, ...newFiles.map((file) => ({ file, progress: 0 }))]);
  }, []);
  const handleRemove = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);
  const updateProgress = useCallback((index: number, pct: number) => {
    setFiles((prev) => prev.map((f, i) => (i === index ? { ...f, progress: pct } : f)));
  }, []);

  async function handleUpload() {
    if (files.length === 0) return;
    setUploading(true);
    try {
      const initRes = await fetch("/api/upload/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files: files.map((f) => ({ name: f.file.name, size: f.file.size, type: f.file.type })),
          expiryDays,
        }),
      });
      if (!initRes.ok) throw new Error("Init failed");
      const { transferId, uploadUrls } = await initRes.json();
      // Upload files via server proxy
      await Promise.all(
        (uploadUrls as UploadInfo[]).map(async (info, index) => {
          const file = files[index].file;
          await uploadViaProxy(file, info.r2Key, (pct) => updateProgress(index, pct));
        })
      );
      const completeRes = await fetch("/api/upload/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transferId }),
      });
      if (!completeRes.ok) throw new Error("Complete failed");
      const { shareToken, fileCount, totalSize, expiresAt } = await completeRes.json();
      const params = new URLSearchParams({ token: shareToken, files: String(fileCount), size: String(totalSize), days: String(expiryDays), expires: expiresAt });
      router.push(`/${locale}/complete?${params.toString()}`);
    } catch (err) {
      console.error("Upload error:", err);
      setUploading(false);
    }
  }

  const heroTitle = t("heroTitle");
  const heroAccent = t("heroAccent");
  const titleParts = heroTitle.split(heroAccent);

  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* 世界樹 — 背景 */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-8 pointer-events-none select-none text-accent" style={{ animation: "breathe 8s ease-in-out infinite" }}>
        <WorldTree className="w-[500px] h-auto max-sm:w-[360px]" />
      </div>

      {/* コンテンツ */}
      <div className="relative z-10">
        {/* Hero */}
        <section className="mx-auto max-w-2xl px-6 pt-44 pb-8 text-center max-sm:px-5 max-sm:pt-32">
          <h1 className="font-heading text-[clamp(28px,5.5vw,46px)] font-bold leading-[1.2] tracking-tight text-ink fade-up">
            {titleParts[0]}
            <span className="text-accent">{heroAccent}</span>
            {titleParts[1] || ""}
          </h1>
          <p className="mt-3 text-[14px] text-ink-mid leading-relaxed max-w-xs mx-auto fade-up delay-1">
            {t("heroSubtitle")}
          </p>
        </section>

        {/* 根のライン — ヒーローとカードの間 */}
        <div className="text-accent pointer-events-none select-none mx-auto max-w-3xl">
          <RootLine className="w-full h-10" />
        </div>

        {/* カード */}
        <section className="mx-auto max-w-[500px] px-5 pb-32 -mt-2">
          <div className="rounded-2xl bg-surface p-7 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.04)] border border-border/40 fade-up delay-2 max-sm:p-5">
            <DropZone onFilesSelected={handleFilesSelected} />
            <FileList files={files} onRemove={handleRemove} />
            <PeriodSelector selected={expiryDays} onChange={setExpiryDays} />
            <UploadButton disabled={files.length === 0} loading={uploading} onClick={handleUpload} />
          </div>
        </section>
      </div>
    </main>
  );
}
