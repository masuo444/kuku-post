"use client";

import { useTranslations, useLocale } from "next-intl";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { DropZone } from "@/components/DropZone";
import { FileList, FileItem } from "@/components/FileList";
import { PeriodSelector } from "@/components/PeriodSelector";
import { UploadButton } from "@/components/UploadButton";

const PROXY_LIMIT = 4 * 1024 * 1024; // 4MB
const MULTIPART_THRESHOLD = 100 * 1024 * 1024; // 100MB
const PART_SIZE = 10 * 1024 * 1024; // 10MB per part
const MAX_FILE_SIZE = 1 * 1024 * 1024 * 1024; // 1GB
const MAX_FILES = 10;
const MAX_TOTAL_SIZE = 2 * 1024 * 1024 * 1024; // 2GB

type UploadUrlInfo = {
  filename: string;
  r2Key: string;
  multipart: boolean;
};

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

async function uploadMultipart(
  file: File,
  r2Key: string,
  onProgress: (pct: number) => void
): Promise<void> {
  const createRes = await fetch("/api/upload/multipart", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "create", r2Key, contentType: file.type || "application/octet-stream" }),
  });
  if (!createRes.ok) throw new Error("Failed to create multipart upload");
  const { uploadId } = await createRes.json();
  const totalParts = Math.ceil(file.size / PART_SIZE);
  const parts: { PartNumber: number; ETag: string }[] = [];
  let uploadedBytes = 0;
  for (let i = 0; i < totalParts; i++) {
    const partNumber = i + 1;
    const start = i * PART_SIZE;
    const end = Math.min(start + PART_SIZE, file.size);
    const blob = file.slice(start, end);
    const presignRes = await fetch("/api/upload/multipart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "presign-part", r2Key, uploadId, partNumber }),
    });
    if (!presignRes.ok) throw new Error(`Failed to presign part ${partNumber}`);
    const { url } = await presignRes.json();
    const partRes = await fetch(url, { method: "PUT", body: blob });
    if (!partRes.ok) throw new Error(`Part ${partNumber} upload failed`);
    const etag = partRes.headers.get("ETag");
    if (!etag) throw new Error(`No ETag for part ${partNumber}`);
    parts.push({ PartNumber: partNumber, ETag: etag });
    uploadedBytes += (end - start);
    onProgress(Math.round((uploadedBytes / file.size) * 100));
  }
  const completeRes = await fetch("/api/upload/multipart", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "complete", r2Key, uploadId, parts }),
  });
  if (!completeRes.ok) throw new Error("Failed to complete multipart upload");
  onProgress(100);
}

async function smartUpload(
  file: File,
  r2Key: string,
  onProgress: (pct: number) => void
): Promise<void> {
  if (file.size <= PROXY_LIMIT) return uploadViaProxy(file, r2Key, onProgress);
  else if (file.size <= MULTIPART_THRESHOLD) return uploadDirect(file, r2Key, onProgress);
  else return uploadMultipart(file, r2Key, onProgress);
}

export default function UploadPage() {
  const t = useTranslations("upload");
  const locale = useLocale();
  const router = useRouter();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [expiryDays, setExpiryDays] = useState(3);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFilesSelected = useCallback((newFiles: File[]) => {
    setError(null);
    setFiles((prev) => {
      const combined = [...prev, ...newFiles.map((file) => ({ file, progress: 0 }))];
      if (combined.length > MAX_FILES) {
        setError(`最大${MAX_FILES}個までです`);
        return prev;
      }
      for (const f of newFiles) {
        if (f.size > MAX_FILE_SIZE) {
          setError(`${f.name} は1GBを超えています`);
          return prev;
        }
      }
      const total = combined.reduce((sum, f) => sum + f.file.size, 0);
      if (total > MAX_TOTAL_SIZE) {
        setError("合計サイズが2GBを超えています");
        return prev;
      }
      return combined;
    });
  }, []);

  const handleRemove = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setError(null);
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

  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* 背景グラデーション */}
      <div className="absolute inset-0 bg-gradient-to-b from-accent-soft/30 via-bg to-bg pointer-events-none" />

      {/* コンテンツ */}
      <div className="relative z-10">
        {/* Hero + キャラクター */}
        <section className="mx-auto max-w-2xl px-6 pt-28 pb-4 max-sm:px-5 max-sm:pt-24">
          {/* キャラクター */}
          <div className="flex justify-center mb-4 fade-up">
            <div className="relative" style={{ animation: "float 4s ease-in-out infinite" }}>
              <Image
                src="/kuku-boy.png"
                alt="KUKU"
                width={140}
                height={140}
                className="drop-shadow-lg max-sm:w-[110px] max-sm:h-[110px]"
                priority
              />
            </div>
          </div>

          {/* タイトル */}
          <div className="text-center fade-up delay-1">
            <h1 className="font-heading text-[clamp(24px,5vw,38px)] font-bold leading-[1.2] tracking-tight text-ink">
              {t("heroTitle").split(t("heroAccent"))[0]}
              <span className="text-accent">{t("heroAccent")}</span>
              {t("heroTitle").split(t("heroAccent"))[1] || ""}
            </h1>
            <p className="mt-2 text-[13px] text-ink-mid leading-relaxed max-w-xs mx-auto">
              {t("heroSubtitle")}
            </p>
          </div>
        </section>

        {/* カード */}
        <section className="mx-auto max-w-[500px] px-5 pb-24 mt-4">
          <div className="rounded-2xl bg-surface p-7 shadow-[0_2px_4px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)] border border-border/40 fade-up delay-2 max-sm:p-5">
            <DropZone onFilesSelected={handleFilesSelected} />
            <FileList files={files} onRemove={handleRemove} />
            <PeriodSelector selected={expiryDays} onChange={setExpiryDays} />
            {error && (
              <p className="mt-3 text-[12px] text-red-600 text-center">{error}</p>
            )}
            <UploadButton disabled={files.length === 0} loading={uploading} onClick={handleUpload} />
          </div>
        </section>

        {/* フッター */}
        <footer className="text-center pb-8">
          <p className="text-[10px] text-ink-light/50 tracking-wider">FOMUS KUKU</p>
        </footer>
      </div>
    </main>
  );
}
