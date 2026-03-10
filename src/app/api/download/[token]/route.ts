export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const supabase = getSupabase();
    const { token } = await context.params;

    const { data: transfer, error } = await supabase
      .from("transfers")
      .select("id, share_token, expires_at, download_count, created_at")
      .eq("share_token", token)
      .single();

    if (error || !transfer) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (new Date(transfer.expires_at) < new Date()) {
      return NextResponse.json({ error: "Expired" }, { status: 410 });
    }

    const { data: files } = await supabase
      .from("files")
      .select("id, filename, size_bytes, mime_type, r2_key")
      .eq("transfer_id", transfer.id);

    // Increment download count
    await supabase
      .from("transfers")
      .update({ download_count: transfer.download_count + 1 })
      .eq("id", transfer.id);

    return NextResponse.json({
      files: (files || []).map((f) => ({
        id: f.id,
        filename: f.filename,
        sizeBytes: f.size_bytes,
        mimeType: f.mime_type,
        r2Key: f.r2_key,
      })),
      expiresAt: transfer.expires_at,
      createdAt: transfer.created_at,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
