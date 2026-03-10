export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getTransferById } from "@/lib/metadata";
import { completeMultipartUpload } from "@/lib/r2";

type MultipartInfo = {
  r2Key: string;
  uploadId: string;
  parts: { PartNumber: number; ETag: string }[];
};

export async function POST(request: NextRequest) {
  try {
    const { transferId, multipartUploads } = await request.json();

    if (!transferId) {
      return NextResponse.json({ error: "Missing transferId" }, { status: 400 });
    }

    // Complete any multipart uploads
    if (multipartUploads && Array.isArray(multipartUploads)) {
      await Promise.all(
        multipartUploads.map((mp: MultipartInfo) =>
          completeMultipartUpload(mp.r2Key, mp.uploadId, mp.parts)
        )
      );
    }

    const meta = await getTransferById(transferId);

    if (!meta) {
      return NextResponse.json({ error: "Transfer not found" }, { status: 404 });
    }

    const totalSize = meta.files.reduce((sum, f) => sum + f.sizeBytes, 0);

    return NextResponse.json({
      shareToken: meta.shareToken,
      fileCount: meta.files.length,
      totalSize,
      expiresAt: meta.expiresAt,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
