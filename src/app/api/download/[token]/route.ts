export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getTransferByToken, saveTransfer } from "@/lib/metadata";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { token } = await context.params;
    const meta = await getTransferByToken(token);

    if (!meta) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (new Date(meta.expiresAt) < new Date()) {
      return NextResponse.json({ error: "Expired" }, { status: 410 });
    }

    // Increment download count
    meta.downloadCount += 1;
    await saveTransfer(meta);

    return NextResponse.json({
      files: meta.files.map((f) => ({
        id: f.r2Key,
        filename: f.filename,
        sizeBytes: f.sizeBytes,
        mimeType: f.mimeType,
        r2Key: f.r2Key,
      })),
      expiresAt: meta.expiresAt,
      createdAt: meta.createdAt,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
