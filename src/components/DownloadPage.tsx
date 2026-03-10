"use client";

import { useTranslations, useLocale } from "next-intl";
import { useEffect, useState } from "react";
import Image from "next/image";
import { formatFileSize, getFileIconType, getFileType } from "@/lib/utils";
import { FileImageIcon, FileVideoIcon, FileDocIcon, FileGenericIcon, DownloadIcon } from "./Icons";

type FileInfo = { id: string; filename: string; sizeBytes: number; mimeType: string; r2Key: string };
type Props = { token: string };

function Icon({ type }: { type: string }) {
  const cls = "w-4 h-4";
  switch (type) {
    case "image": return <FileImageIcon className={cls} />;
    case "video": return <FileVideoIcon className={cls} />;
    case "doc":   return <FileDocIcon className={cls} />;
    default:      return <FileGenericIcon className={cls} />;
  }
}

export function DownloadPage({ token }: Props) {
  const t = useTranslations("download");
  const locale = useLocale();
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [expiresAt, setExpiresAt] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/download/${token}`);
        if (res.status === 410) { setError("expired"); return; }
        if (!res.ok) { setError("notFound"); return; }
        const data = await res.json();
        setFiles(data.files);
        setExpiresAt(data.expiresAt);
      } catch { setError("notFound"); } finally { setLoading(false); }
    })();
  }, [token]);

  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="h-5 w-5 border-[1.5px] border-accent/30 border-t-accent rounded-full" style={{ animation: "spin 0.7s linear infinite" }} />
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-5">
      <div style={{ animation: "float 4s ease-in-out infinite" }}>
        <Image src="/kuku-purple.png" alt="KUKU" width={100} height={100} className="drop-shadow-lg mb-4" />
      </div>
      <h1 className="font-heading text-lg font-bold text-ink mb-1">{error === "expired" ? t("expired") : t("notFound")}</h1>
      <a href={`/${locale}`} className="text-[12px] text-accent hover:underline mt-3 inline-block">{locale === "ja" ? "トップに戻る" : "Back"}</a>
    </div>
  );

  const totalSize = files.reduce((sum, f) => sum + f.sizeBytes, 0);
  const expiryDate = new Date(expiresAt);
  const daysRemaining = Math.max(0, Math.ceil((expiryDate.getTime() - Date.now()) / 86400000));
  const formattedExpiry = expiryDate.toLocaleDateString(locale === "ja" ? "ja-JP" : "en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="min-h-screen bg-gradient-to-b from-accent-soft/20 via-bg to-bg flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-[460px] fade-up">
        {/* キャラクター + ヘッダー */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <div style={{ animation: "float 4s ease-in-out infinite" }}>
              <Image src="/kuku-green.png" alt="KUKU" width={110} height={110} className="drop-shadow-lg" priority />
            </div>
          </div>
          <h1 className="font-heading text-xl font-bold text-ink tracking-tight">{t("title")}</h1>
          <p className="mt-1.5 text-[11px] text-ink-light tracking-wide">
            {t("fileCount", { count: files.length })}
            <span className="mx-1.5 text-border">·</span>
            {t("totalSize", { size: formatFileSize(totalSize) })}
            <span className="mx-1.5 text-border">·</span>
            {t("daysRemaining", { days: daysRemaining })}
          </p>
        </div>

        {/* ファイルカード */}
        <div className="rounded-2xl bg-surface border border-border/40 shadow-[0_2px_4px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]">
          <div className="p-5 divide-y divide-border/40">
            {files.map((file) => (
              <div key={file.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 group">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-bg text-ink-light shrink-0">
                  <Icon type={getFileIconType(file.filename)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-ink truncate">{file.filename}</p>
                  <p className="text-[11px] text-ink-light">{formatFileSize(file.sizeBytes)}<span className="mx-1.5 text-border">·</span>{getFileType(file.filename)}</p>
                </div>
                <a href={`/api/download/${token}/zip?file=${file.r2Key}`} className="shrink-0 p-1.5 rounded-md text-ink-light hover:text-accent transition-colors opacity-0 group-hover:opacity-100">
                  <DownloadIcon className="w-3.5 h-3.5" />
                </a>
              </div>
            ))}
          </div>

          <div className="px-5 pb-5">
            <a href={`/api/download/${token}/zip`}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-accent py-3 text-[13px] font-semibold text-white tracking-wide hover:bg-accent-hover active:scale-[0.997] transition-all">
              <DownloadIcon className="w-3.5 h-3.5" />
              {t("downloadAll", { size: formatFileSize(totalSize) })}
            </a>
          </div>
        </div>

        <p className="text-center mt-4 text-[11px] text-ink-light">{t("expireNotice", { date: formattedExpiry })}</p>
      </div>
    </div>
  );
}
