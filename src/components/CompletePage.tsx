"use client";

import { useTranslations, useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { formatFileSize } from "@/lib/utils";
import { CheckIcon, CopyIcon } from "./Icons";

function CompleteContent() {
  const t = useTranslations("complete");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const [copied, setCopied] = useState(false);

  const token = searchParams.get("token") || "";
  const fileCount = parseInt(searchParams.get("files") || "0", 10);
  const totalSize = parseInt(searchParams.get("size") || "0", 10);
  const expiryDays = parseInt(searchParams.get("days") || "7", 10);
  const expiresAt = searchParams.get("expires") || "";

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const shareUrl = `${baseUrl}/${locale}/d/${token}`;
  const expiryDate = expiresAt ? new Date(expiresAt).toLocaleDateString(locale === "ja" ? "ja-JP" : "en-US") : "";

  async function handleCopy() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center px-5">
      <div className="w-full max-w-sm text-center fade-up">
        {/* チェック */}
        <div className="mx-auto mb-8 flex h-14 w-14 items-center justify-center rounded-full border-2 border-accent text-accent scale-in">
          <CheckIcon className="w-6 h-6" />
        </div>

        <h1 className="font-heading text-[26px] font-bold text-surface tracking-tight">{t("title")}</h1>
        <p className="mt-2 text-[13px] text-ink-light leading-relaxed">{t("subtitle", { days: expiryDays })}</p>

        {/* URL */}
        <div className="mt-8 rounded-lg bg-dark-surface p-3 border border-white/[0.06]">
          <div className="flex items-center gap-2">
            <p className="flex-1 truncate text-[12px] text-surface/50 text-left font-mono">{shareUrl}</p>
            <button
              onClick={handleCopy}
              className={`shrink-0 flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-medium tracking-wide transition-all duration-150 ${
                copied ? "bg-accent text-white" : "bg-white/[0.06] text-surface/60 hover:bg-white/[0.1]"
              }`}
            >
              {copied ? t("copied") : <><CopyIcon className="w-3 h-3" />{t("copy")}</>}
            </button>
          </div>
        </div>

        {/* メタ */}
        <div className="mt-4 flex justify-center gap-6 text-[11px] text-ink-light">
          <div>
            <span className="block text-[10px] uppercase tracking-widest text-surface/25 mb-0.5">{t("files")}</span>
            <span className="text-surface/70">{fileCount}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase tracking-widest text-surface/25 mb-0.5">{t("totalSize")}</span>
            <span className="text-surface/70">{formatFileSize(totalSize)}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase tracking-widest text-surface/25 mb-0.5">{t("expires")}</span>
            <span className="text-surface/70">{expiryDate}</span>
          </div>
        </div>

        <div className="mt-10">
          <a href={`/${locale}`} className="text-[12px] text-surface/30 hover:text-surface/60 transition-colors">{t("sendNew")}</a>
        </div>
      </div>
    </div>
  );
}

export function CompletePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-dark" />}>
      <CompleteContent />
    </Suspense>
  );
}
