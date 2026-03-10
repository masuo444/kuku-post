"use client";

import { formatFileSize, getFileIconType, getFileType } from "@/lib/utils";
import { FileImageIcon, FileVideoIcon, FileDocIcon, FileGenericIcon, CloseIcon } from "./Icons";

export type FileItem = {
  file: File;
  progress: number;
};

type Props = {
  files: FileItem[];
  onRemove: (index: number) => void;
};

function Icon({ type }: { type: string }) {
  const cls = "w-4 h-4";
  switch (type) {
    case "image": return <FileImageIcon className={cls} />;
    case "video": return <FileVideoIcon className={cls} />;
    case "doc":   return <FileDocIcon className={cls} />;
    default:      return <FileGenericIcon className={cls} />;
  }
}

export function FileList({ files, onRemove }: Props) {
  if (files.length === 0) return null;

  return (
    <div className="mt-4 divide-y divide-border/40">
      {files.map((item, index) => {
        const iconType = getFileIconType(item.file.name);
        return (
          <div key={`${item.file.name}-${index}`} className="flex items-center gap-3 py-3 group fade-up" style={{ animationDelay: `${index * 30}ms` }}>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-bg text-ink-light shrink-0">
              <Icon type={iconType} />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[13px] text-ink truncate">{item.file.name}</p>
              <p className="text-[11px] text-ink-light mt-0.5">
                {formatFileSize(item.file.size)}<span className="mx-1.5 text-border">·</span>{getFileType(item.file.name)}
              </p>
              {item.progress > 0 && item.progress < 100 && (
                <div className="mt-1.5 h-[2px] w-full rounded-full bg-border/40 overflow-hidden">
                  <div className="h-full rounded-full progress-bar" style={{ width: `${item.progress}%`, transition: "width 0.3s ease-out" }} />
                </div>
              )}
              {item.progress === 100 && (
                <p className="mt-1 text-[10px] text-accent font-medium tracking-wider uppercase">Done</p>
              )}
            </div>

            <button
              onClick={() => onRemove(index)}
              className="p-1.5 rounded-md text-ink-light opacity-0 group-hover:opacity-100 hover:text-ink hover:bg-bg transition-all shrink-0"
            >
              <CloseIcon className="w-3 h-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
