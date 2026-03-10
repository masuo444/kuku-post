export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { uploadFile } from "@/lib/storage";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const r2Key = formData.get("r2Key") as string | null;

    if (!file || !r2Key) {
      return NextResponse.json({ error: "Missing file or r2Key" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    await uploadFile(r2Key, buffer, file.type || "application/octet-stream");

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Proxy upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
