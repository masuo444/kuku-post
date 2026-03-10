export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getSupabase } from "@/lib/supabase";

const MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024; // 10GB

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
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

    const days = [1, 3, 7, 30].includes(expiryDays) ? expiryDays : 7;
    const shareToken = nanoid(10);
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

    const { data: transfer, error: transferError } = await supabase
      .from("transfers")
      .insert({ share_token: shareToken, expires_at: expiresAt })
      .select("id")
      .single();

    if (transferError || !transfer) {
      console.error("Transfer insert error:", transferError);
      return NextResponse.json({
        error: "Failed to create transfer",
        detail: transferError?.message,
        code: transferError?.code,
        url: process.env.NEXT_PUBLIC_SUPABASE_URL ? "set" : "missing",
        key: process.env.SUPABASE_SERVICE_ROLE_KEY ? "set" : "missing",
      }, { status: 500 });
    }

    const uploadUrls = await Promise.all(
      files.map(async (file: { name: string; size: number; type: string }) => {
        const r2Key = `${transfer.id}/${nanoid(8)}_${file.name}`;
        const contentType = file.type || "application/octet-stream";

        const { error: fileError } = await supabase.from("files").insert({
          transfer_id: transfer.id,
          filename: file.name,
          size_bytes: file.size,
          r2_key: r2Key,
          mime_type: contentType,
        });

        if (fileError) {
          console.error("File insert error:", fileError);
        }

        return {
          filename: file.name,
          r2Key,
          multipart: false,
        };
      })
    );

    return NextResponse.json({
      transferId: transfer.id,
      shareToken,
      expiryDays: days,
      uploadUrls,
    });
  } catch (err) {
    console.error("Init error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
