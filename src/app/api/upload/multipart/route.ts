export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import {
  createMultipartUpload,
  createPresignedPartUrl,
  completeMultipartUpload,
  abortMultipartUpload,
} from "@/lib/r2";

// POST: create multipart upload or presign a part
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === "create") {
      const { r2Key, contentType } = body;
      if (!r2Key) {
        return NextResponse.json({ error: "Missing r2Key" }, { status: 400 });
      }
      const uploadId = await createMultipartUpload(
        r2Key,
        contentType || "application/octet-stream"
      );
      return NextResponse.json({ uploadId });
    }

    if (action === "presign-part") {
      const { r2Key, uploadId, partNumber } = body;
      if (!r2Key || !uploadId || !partNumber) {
        return NextResponse.json({ error: "Missing params" }, { status: 400 });
      }
      const url = await createPresignedPartUrl(r2Key, uploadId, partNumber);
      return NextResponse.json({ url });
    }

    if (action === "complete") {
      const { r2Key, uploadId, parts } = body;
      if (!r2Key || !uploadId || !parts) {
        return NextResponse.json({ error: "Missing params" }, { status: 400 });
      }
      await completeMultipartUpload(r2Key, uploadId, parts);
      return NextResponse.json({ ok: true });
    }

    if (action === "abort") {
      const { r2Key, uploadId } = body;
      if (r2Key && uploadId) {
        await abortMultipartUpload(r2Key, uploadId);
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("Multipart error:", err);
    return NextResponse.json({ error: "Multipart operation failed" }, { status: 500 });
  }
}
