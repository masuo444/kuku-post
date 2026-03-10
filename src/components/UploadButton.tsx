"use client";

import { useTranslations } from "next-intl";

type Props = {
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
};

export function UploadButton({ disabled, loading, onClick }: Props) {
  const t = useTranslations("upload");

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="mt-6 w-full rounded-xl bg-accent text-white py-3 text-[13px] font-semibold tracking-wide transition-all duration-150 hover:bg-accent-hover active:scale-[0.997] disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:bg-accent"
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <span className="h-3.5 w-3.5 border-[1.5px] border-white/30 border-t-white rounded-full" style={{ animation: "spin 0.7s linear infinite" }} />
          <span>{t("uploading")}</span>
        </span>
      ) : (
        t("uploadButton")
      )}
    </button>
  );
}
