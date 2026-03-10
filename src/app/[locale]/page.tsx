"use client";

import { useTranslations, useLocale } from "next-intl";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { DropZone } from "@/components/DropZone";
import { FileList, FileItem } from "@/components/FileList";
import { PeriodSelector } from "@/components/PeriodSelector";
import { UploadButton } from "@/components/UploadButton";

const PROXY_LIMIT = 4 * 1024 * 1024;
const MULTIPART_THRESHOLD = 100 * 1024 * 1024;
const PART_SIZE = 10 * 1024 * 1024;
const MAX_FILE_SIZE = 1 * 1024 * 1024 * 1024;
const MAX_FILES = 10;
const MAX_TOTAL_SIZE = 2 * 1024 * 1024 * 1024;

type UploadUrlInfo = { filename: string; r2Key: string; multipart: boolean };

async function uploadViaProxy(file: File, r2Key: string, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("r2Key", r2Key);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload/proxy");
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => { if (xhr.status >= 200 && xhr.status < 300) { onProgress(100); resolve(); } else reject(new Error(`Upload failed: ${xhr.status}`)); };
    xhr.onerror = () => reject(new Error("Upload error"));
    xhr.send(formData);
  });
}

async function uploadDirect(file: File, r2Key: string, onProgress: (pct: number) => void): Promise<void> {
  const res = await fetch("/api/upload/presign", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ r2Key, contentType: file.type || "application/octet-stream" }),
  });
  if (!res.ok) throw new Error("Failed to get presigned URL");
  const { url } = await res.json();
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => { if (xhr.status >= 200 && xhr.status < 300) { onProgress(100); resolve(); } else reject(new Error(`Direct upload failed: ${xhr.status}`)); };
    xhr.onerror = () => reject(new Error("Direct upload error"));
    xhr.send(file);
  });
}

async function uploadMultipart(file: File, r2Key: string, onProgress: (pct: number) => void): Promise<void> {
  const createRes = await fetch("/api/upload/multipart", {
    method: "POST", headers: { "Content-Type": "application/json" },
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
      method: "POST", headers: { "Content-Type": "application/json" },
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
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "complete", r2Key, uploadId, parts }),
  });
  if (!completeRes.ok) throw new Error("Failed to complete multipart upload");
  onProgress(100);
}

async function smartUpload(file: File, r2Key: string, onProgress: (pct: number) => void): Promise<void> {
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
      if (combined.length > MAX_FILES) { setError(`最大${MAX_FILES}個までです`); return prev; }
      for (const f of newFiles) { if (f.size > MAX_FILE_SIZE) { setError(`${f.name} は1GBを超えています`); return prev; } }
      const total = combined.reduce((sum, f) => sum + f.file.size, 0);
      if (total > MAX_TOTAL_SIZE) { setError("合計サイズが2GBを超えています"); return prev; }
      return combined;
    });
  }, []);

  const handleRemove = useCallback((index: number) => { setFiles((prev) => prev.filter((_, i) => i !== index)); setError(null); }, []);
  const updateProgress = useCallback((index: number, pct: number) => {
    setFiles((prev) => prev.map((f, i) => (i === index ? { ...f, progress: pct } : f)));
  }, []);

  async function handleUpload() {
    if (files.length === 0) return;
    setUploading(true);
    try {
      const initRes = await fetch("/api/upload/init", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: files.map((f) => ({ name: f.file.name, size: f.file.size, type: f.file.type })), expiryDays }),
      });
      if (!initRes.ok) throw new Error("Init failed");
      const { transferId, uploadUrls } = await initRes.json();
      await Promise.all(
        (uploadUrls as UploadUrlInfo[]).map(async (info, index) => {
          await smartUpload(files[index].file, info.r2Key, (pct) => updateProgress(index, pct));
        })
      );
      const completeRes = await fetch("/api/upload/complete", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transferId }),
      });
      if (!completeRes.ok) throw new Error("Complete failed");
      const { shareToken, fileCount, totalSize, expiresAt } = await completeRes.json();
      const params = new URLSearchParams({ token: shareToken, files: String(fileCount), size: String(totalSize), days: String(expiryDays), expires: expiresAt });
      router.push(`/${locale}/complete?${params.toString()}`);
    } catch (err) { console.error("Upload error:", err); setUploading(false); }
  }

  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* 背景 */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-[50vh] bg-gradient-to-b from-[#e8f0e3] to-transparent" />
        <div className="absolute top-[10%] left-[10%] w-[300px] h-[300px] rounded-full bg-accent/[0.04] blur-[80px]" />
        <div className="absolute top-[20%] right-[5%] w-[200px] h-[200px] rounded-full bg-[#f0e8d8]/40 blur-[60px]" />
      </div>

      <div className="relative z-10">
        {/* ヒーロー */}
        <section className="mx-auto max-w-2xl px-6 pt-28 pb-2 text-center max-sm:px-5 max-sm:pt-22">
          <h1 className="font-heading text-[clamp(24px,5vw,40px)] font-bold leading-[1.2] tracking-tight text-ink fade-up">
            {t("heroTitle").split(t("heroAccent"))[0]}
            <span className="text-accent">{t("heroAccent")}</span>
            {t("heroTitle").split(t("heroAccent"))[1] || ""}
          </h1>
          <p className="mt-2 text-[13px] text-ink-mid leading-relaxed max-w-sm mx-auto fade-up delay-1">
            {t("heroSubtitle")}
          </p>
        </section>

        {/* キャラクター一列 */}
        <section className="mx-auto max-w-[600px] px-5 py-6 fade-up delay-1">
          <div className="flex items-end justify-center gap-3 max-sm:gap-1">
            {[
              { src: "/kuku-purple.png", size: 72, delay: "0s" },
              { src: "/kuku-green.png", size: 90, delay: "0.5s" },
              { src: "/kuku-boy.png", size: 110, delay: "0.2s" },
              { src: "/kuku-pink.png", size: 80, delay: "0.8s" },
              { src: "/kuku-blonde.png", size: 88, delay: "0.3s" },
              { src: "/kuku-white.png", size: 72, delay: "0.6s" },
            ].map((c) => (
              <div key={c.src} className="shrink-0" style={{ animation: `float 3.5s ease-in-out ${c.delay} infinite` }}>
                <Image
                  src={c.src}
                  alt="KUKU"
                  width={c.size}
                  height={c.size}
                  className="drop-shadow-[0_4px_12px_rgba(0,0,0,0.10)] max-sm:w-[60%] max-sm:h-auto"
                  priority
                />
              </div>
            ))}
          </div>
        </section>

        {/* アップロードカード */}
        <section className="mx-auto max-w-[520px] px-5 pb-20">
          <div className="rounded-2xl bg-white/90 backdrop-blur-sm p-7 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_12px_40px_rgba(0,0,0,0.06)] border border-white/60 fade-up max-sm:p-5">
            <DropZone onFilesSelected={handleFilesSelected} />
            <FileList files={files} onRemove={handleRemove} />
            <PeriodSelector selected={expiryDays} onChange={setExpiryDays} />
            {error && <p className="mt-3 text-[12px] text-red-600 text-center">{error}</p>}
            <UploadButton disabled={files.length === 0} loading={uploading} onClick={handleUpload} />
          </div>
        </section>

        <footer className="text-center pb-8">
          <p className="text-[10px] text-ink-light/40 tracking-widest uppercase">Powered by FOMUS KUKU</p>
        </footer>
      </div>
    </main>
  );
}
