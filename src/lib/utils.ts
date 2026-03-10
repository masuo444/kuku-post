export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes >= 1_073_741_824) {
    return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
  }
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

export type FileIconType = "image" | "video" | "doc" | "generic";

export function getFileIconType(filename: string): FileIconType {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const imageExts = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "tiff", "heic", "avif"];
  const videoExts = ["mp4", "mov", "avi", "mkv", "webm", "m4v"];
  const docExts = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv", "rtf"];

  if (imageExts.includes(ext)) return "image";
  if (videoExts.includes(ext)) return "video";
  if (docExts.includes(ext)) return "doc";
  return "generic";
}

export function getFileIcon(filename: string): { icon: string; bgColor: string } {
  const type = getFileIconType(filename);
  switch (type) {
    case "image": return { icon: "image", bgColor: "bg-file-image" };
    case "video": return { icon: "video", bgColor: "bg-file-video" };
    case "doc":   return { icon: "doc",   bgColor: "bg-file-doc" };
    default:      return { icon: "generic", bgColor: "bg-warm" };
  }
}

export function getFileType(filename: string): string {
  const ext = filename.split(".").pop()?.toUpperCase() || "";
  return ext || "FILE";
}
