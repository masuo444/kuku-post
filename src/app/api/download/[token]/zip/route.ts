export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import archiver from "archiver";
import { PassThrough, Readable } from "stream";
import { getSupabase } from "@/lib/supabase";
import { getObject } from "@/lib/r2";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const supabase = getSupabase();
    const { token } = await context.params;
    const singleFileKey = request.nextUrl.searchParams.get("file");

    const { data: transfer, error } = await supabase
      .from("transfers")
      .select("id, expires_at")
      .eq("share_token", token)
      .single();

    if (error || !transfer) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (new Date(transfer.expires_at) < new Date()) {
      return NextResponse.json({ error: "Expired" }, { status: 410 });
    }

    // 個別ファイルダウンロード
    if (singleFileKey) {
      const { data: file } = await supabase
        .from("files")
        .select("filename, r2_key, mime_type, size_bytes")
        .eq("transfer_id", transfer.id)
        .eq("r2_key", singleFileKey)
        .single();

      if (!file) {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
      }

      const r2Response = await getObject(file.r2_key);
      if (!r2Response.Body) {
        return NextResponse.json({ error: "File not available" }, { status: 500 });
      }

      const bodyStream = r2Response.Body as Readable;
      const webStream = Readable.toWeb(bodyStream) as ReadableStream;
      const encodedFilename = encodeURIComponent(file.filename);

      return new NextResponse(webStream, {
        headers: {
          "Content-Type": file.mime_type || "application/octet-stream",
          "Content-Disposition": `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`,
          ...(file.size_bytes ? { "Content-Length": String(file.size_bytes) } : {}),
        },
      });
    }

    // ZIPダウンロード
    const { data: files } = await supabase
      .from("files")
      .select("filename, r2_key")
      .eq("transfer_id", transfer.id);

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files" }, { status: 404 });
    }

    const passThrough = new PassThrough();
    const archive = archiver("zip", { zlib: { level: 5 } });
    archive.pipe(passThrough);

    for (const file of files) {
      const r2Response = await getObject(file.r2_key);
      if (r2Response.Body) {
        const bodyStream = r2Response.Body as Readable;
        archive.append(bodyStream, { name: file.filename });
      }
    }

    archive.finalize();
    const webStream = Readable.toWeb(passThrough) as ReadableStream;

    return new NextResponse(webStream, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="kuku-files.zip"`,
      },
    });
  } catch (err) {
    console.error("Download error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
