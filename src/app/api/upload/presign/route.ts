export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createPresignedUploadUrl } from "@/lib/r2";

export async function POST(request: NextRequest) {
  try {
    const { r2Key, contentType } = await request.json();

    if (!r2Key) {
      return NextResponse.json({ error: "Missing r2Key" }, { status: 400 });
    }

    const url = await createPresignedUploadUrl(
      r2Key,
      contentType || "application/octet-stream"
    );

    return NextResponse.json({ url });
  } catch (err) {
    console.error("Presign error:", err);
    return NextResponse.json({ error: "Failed to create presigned URL" }, { status: 500 });
  }
}
