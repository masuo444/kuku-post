"use client";

import { useTranslations } from "next-intl";

type Props = {
  selected: number;
  onChange: (days: number) => void;
};

const periods = [1, 3] as const;

export function PeriodSelector({ selected, onChange }: Props) {
  const t = useTranslations("upload");
  const labels: Record<number, string> = { 1: t("period1"), 3: t("period3"), 7: t("period7"), 30: t("period30") };

  return (
    <div className="mt-5 flex items-center justify-between">
      <span className="text-[12px] text-ink-light">{t("expiry")}</span>
      <div className="flex gap-px rounded-lg border border-border/60 overflow-hidden">
        {periods.map((days) => (
          <button
            key={days}
            onClick={() => onChange(days)}
            className={`px-3 py-1.5 text-[11px] font-medium tracking-wide transition-colors duration-100 ${
              selected === days
                ? "bg-ink text-surface"
                : "bg-surface text-ink-light hover:text-ink-mid"
            }`}
          >
            {labels[days]}
          </button>
        ))}
      </div>
    </div>
  );
}
