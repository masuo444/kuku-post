export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { saveTransfer, TransferMeta } from "@/lib/metadata";

const MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024; // 10GB

export async function POST(request: NextRequest) {
  try {
    const { files, expiryDays } = await request.json();

    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File "${file.name}" exceeds 10GB limit` },
          { status: 400 }
        );
      }
    }

    const days = [1, 3].includes(expiryDays) ? expiryDays : 3;
    const transferId = nanoid(12);
    const shareToken = nanoid(10);
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

    const fileMetas = files.map((file: { name: string; size: number; type: string }) => {
      const r2Key = `${transferId}/${nanoid(8)}_${file.name}`;
      return {
        filename: file.name,
        sizeBytes: file.size,
        mimeType: file.type || "application/octet-stream",
        r2Key,
      };
    });

    const meta: TransferMeta = {
      transferId,
      shareToken,
      expiresAt,
      createdAt: new Date().toISOString(),
      downloadCount: 0,
      files: fileMetas,
    };

    await saveTransfer(meta);

    return NextResponse.json({
      transferId,
      shareToken,
      expiryDays: days,
      uploadUrls: fileMetas.map((f) => ({
        filename: f.filename,
        r2Key: f.r2Key,
        multipart: false,
      })),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Init error:", err);
    return NextResponse.json({ error: "Internal server error", detail: msg }, { status: 500 });
  }
}
