export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { completeMultipartUpload } from "@/lib/r2";

type MultipartInfo = {
  r2Key: string;
  uploadId: string;
  parts: { PartNumber: number; ETag: string }[];
};

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
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

    const { data: transfer, error } = await supabase
      .from("transfers")
      .select("id, share_token, expires_at")
      .eq("id", transferId)
      .single();

    if (error || !transfer) {
      return NextResponse.json({ error: "Transfer not found" }, { status: 404 });
    }

    const { data: files } = await supabase
      .from("files")
      .select("filename, size_bytes")
      .eq("transfer_id", transferId);

    const totalSize = (files || []).reduce((sum, f) => sum + Number(f.size_bytes), 0);

    return NextResponse.json({
      shareToken: transfer.share_token,
      fileCount: files?.length || 0,
      totalSize,
      expiresAt: transfer.expires_at,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
