export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { r2 } from "@/lib/r2";
import { PutObjectCommand } from "@aws-sdk/client-s3";

const bucket = process.env.CF_R2_BUCKET_NAME!;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const r2Key = formData.get("r2Key") as string | null;

    if (!file || !r2Key) {
      return NextResponse.json({ error: "Missing file or r2Key" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    await r2.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: r2Key,
        Body: buffer,
        ContentType: file.type || "application/octet-stream",
      })
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Proxy upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
