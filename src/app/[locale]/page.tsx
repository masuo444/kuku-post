"use client";

import { useTranslations, useLocale } from "next-intl";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { DropZone } from "@/components/DropZone";
import { FileList, FileItem } from "@/components/FileList";
import { PeriodSelector } from "@/components/PeriodSelector";
import { UploadButton } from "@/components/UploadButton";
import { WorldTree, RootLine } from "@/components/WorldTree";

const PROXY_LIMIT = 4 * 1024 * 1024; // 4MB
const MULTIPART_THRESHOLD = 100 * 1024 * 1024; // 100MB
const PART_SIZE = 10 * 1024 * 1024; // 10MB per part

type UploadUrlInfo = {
  filename: string;
  r2Key: string;
  multipart: boolean;
};

// Small files: proxy through Vercel
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

// Medium files: single presigned PUT
async function uploadDirect(
  file: File,
  r2Key: string,
  onProgress: (pct: number) => void
): Promise<void> {
  const res = await fetch("/api/upload/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ r2Key, contentType: file.type || "application/octet-stream" }),
  });
  if (!res.ok) throw new Error("Failed to get presigned URL");
  const { url } = await res.json();

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) { onProgress(100); resolve(); }
      else reject(new Error(`Direct upload failed: ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error("Direct upload error"));
    xhr.send(file);
  });
}

// Large files: multipart upload
async function uploadMultipart(
  file: File,
  r2Key: string,
  onProgress: (pct: number) => void
): Promise<void> {
  // 1. Create multipart upload
  const createRes = await fetch("/api/upload/multipart", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "create",
      r2Key,
      contentType: file.type || "application/octet-stream",
    }),
  });
  if (!createRes.ok) throw new Error("Failed to create multipart upload");
  const { uploadId } = await createRes.json();

  const totalParts = Math.ceil(file.size / PART_SIZE);
  const parts: { PartNumber: number; ETag: string }[] = [];
  let uploadedBytes = 0;

  // 2. Upload each part
  for (let i = 0; i < totalParts; i++) {
    const partNumber = i + 1;
    const start = i * PART_SIZE;
    const end = Math.min(start + PART_SIZE, file.size);
    const blob = file.slice(start, end);

    // Get presigned URL for this part
    const presignRes = await fetch("/api/upload/multipart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "presign-part", r2Key, uploadId, partNumber }),
    });
    if (!presignRes.ok) throw new Error(`Failed to presign part ${partNumber}`);
    const { url } = await presignRes.json();

    // Upload part
    const partRes = await fetch(url, { method: "PUT", body: blob });
    if (!partRes.ok) throw new Error(`Part ${partNumber} upload failed`);

    const etag = partRes.headers.get("ETag");
    if (!etag) throw new Error(`No ETag for part ${partNumber}`);
    parts.push({ PartNumber: partNumber, ETag: etag });

    uploadedBytes += (end - start);
    onProgress(Math.round((uploadedBytes / file.size) * 100));
  }

  // 3. Complete multipart upload
  const completeRes = await fetch("/api/upload/multipart", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "complete", r2Key, uploadId, parts }),
  });
  if (!completeRes.ok) throw new Error("Failed to complete multipart upload");
  onProgress(100);
}

// Smart upload: choose strategy based on file size
async function smartUpload(
  file: File,
  r2Key: string,
  onProgress: (pct: number) => void
): Promise<void> {
  if (file.size <= PROXY_LIMIT) {
    return uploadViaProxy(file, r2Key, onProgress);
  } else if (file.size <= MULTIPART_THRESHOLD) {
    return uploadDirect(file, r2Key, onProgress);
  } else {
    return uploadMultipart(file, r2Key, onProgress);
  }
}

export default function UploadPage() {
  const t = useTranslations("upload");
  const locale = useLocale();
  const router = useRouter();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [expiryDays, setExpiryDays] = useState(3);
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

      // Upload files with smart strategy
      await Promise.all(
        (uploadUrls as UploadUrlInfo[]).map(async (info, index) => {
          const file = files[index].file;
          await smartUpload(file, info.r2Key, (pct) => updateProgress(index, pct));
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
