"use client";

import { useTranslations, useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import Image from "next/image";
import { formatFileSize } from "@/lib/utils";
import { CopyIcon } from "./Icons";

function CompleteContent() {
  const t = useTranslations("complete");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const [copied, setCopied] = useState(false);

  const token = searchParams.get("token") || "";
  const fileCount = parseInt(searchParams.get("files") || "0", 10);
  const totalSize = parseInt(searchParams.get("size") || "0", 10);
  const expiryDays = parseInt(searchParams.get("days") || "3", 10);
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
    <div className="min-h-screen bg-gradient-to-b from-accent-soft/20 via-bg to-bg flex items-center justify-center px-5">
      <div className="w-full max-w-sm text-center fade-up">
        {/* キャラクター */}
        <div className="mb-6 flex justify-center">
          <div style={{ animation: "float 4s ease-in-out infinite" }}>
            <Image
              src="/kuku-pink.png"
              alt="KUKU"
              width={120}
              height={120}
              className="drop-shadow-lg"
              priority
            />
          </div>
        </div>

        <h1 className="font-heading text-[26px] font-bold text-ink tracking-tight">{t("title")}</h1>
        <p className="mt-2 text-[13px] text-ink-mid leading-relaxed">{t("subtitle", { days: expiryDays })}</p>

        {/* URL */}
        <div className="mt-6 rounded-xl bg-surface p-3 border border-border/60 shadow-sm">
          <div className="flex items-center gap-2">
            <p className="flex-1 truncate text-[12px] text-ink-mid text-left font-mono">{shareUrl}</p>
            <button
              onClick={handleCopy}
              className={`shrink-0 flex items-center gap-1.5 rounded-lg px-4 py-2 text-[12px] font-semibold tracking-wide transition-all duration-150 ${
                copied ? "bg-accent text-white" : "bg-accent text-white hover:bg-accent-hover"
              }`}
            >
              {copied ? t("copied") : <><CopyIcon className="w-3 h-3" />{t("copy")}</>}
            </button>
          </div>
        </div>

        {/* メタ */}
        <div className="mt-5 flex justify-center gap-6 text-[11px]">
          <div>
            <span className="block text-[10px] uppercase tracking-widest text-ink-light/60 mb-0.5">{t("files")}</span>
            <span className="text-ink-mid font-medium">{fileCount}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase tracking-widest text-ink-light/60 mb-0.5">{t("totalSize")}</span>
            <span className="text-ink-mid font-medium">{formatFileSize(totalSize)}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase tracking-widest text-ink-light/60 mb-0.5">{t("expires")}</span>
            <span className="text-ink-mid font-medium">{expiryDate}</span>
          </div>
        </div>

        <div className="mt-8">
          <a href={`/${locale}`} className="text-[12px] text-ink-light hover:text-accent transition-colors">{t("sendNew")}</a>
        </div>
      </div>
    </div>
  );
}

export function CompletePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg" />}>
      <CompleteContent />
    </Suspense>
  );
}
