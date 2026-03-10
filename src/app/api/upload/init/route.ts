export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getSupabase } from "@/lib/supabase";
import { createPresignedUploadUrl, createMultipartUpload, createPresignedPartUrl } from "@/lib/r2";

const CHUNK_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024; // 10GB

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { files, expiryDays } = await request.json();

    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    // Validate file sizes
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
      return NextResponse.json({ error: "Failed to create transfer" }, { status: 500 });
    }

    const uploadUrls = await Promise.all(
      files.map(async (file: { name: string; size: number; type: string }) => {
        const r2Key = `${transfer.id}/${nanoid(8)}_${file.name}`;
        const contentType = file.type || "application/octet-stream";

        await supabase.from("files").insert({
          transfer_id: transfer.id,
          filename: file.name,
          size_bytes: file.size,
          r2_key: r2Key,
          mime_type: contentType,
        });

        // Use multipart upload for large files (>100MB)
        if (file.size > CHUNK_SIZE) {
          const uploadId = await createMultipartUpload(r2Key, contentType);
          const totalParts = Math.ceil(file.size / CHUNK_SIZE);

          // Generate presigned URLs for all parts
          const partUrls = await Promise.all(
            Array.from({ length: totalParts }, (_, i) =>
              createPresignedPartUrl(r2Key, uploadId, i + 1)
            )
          );

          return {
            filename: file.name,
            r2Key,
            multipart: true,
            uploadId,
            chunkSize: CHUNK_SIZE,
            totalParts,
            partUrls,
          };
        }

        // Single upload for small files
        const uploadUrl = await createPresignedUploadUrl(r2Key, contentType);
        return {
          filename: file.name,
          r2Key,
          multipart: false,
          uploadUrl,
        };
      })
    );

    return NextResponse.json({
      transferId: transfer.id,
      shareToken,
      expiryDays: days,
      uploadUrls,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
