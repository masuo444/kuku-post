export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import archiver from "archiver";
import { PassThrough, Readable } from "stream";
import { getTransferByToken } from "@/lib/metadata";
import { getObject } from "@/lib/r2";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { token } = await context.params;
    const singleFileKey = request.nextUrl.searchParams.get("file");

    const meta = await getTransferByToken(token);

    if (!meta) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (new Date(meta.expiresAt) < new Date()) {
      return NextResponse.json({ error: "Expired" }, { status: 410 });
    }

    // Individual file download
    if (singleFileKey) {
      const file = meta.files.find((f) => f.r2Key === singleFileKey);

      if (!file) {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
      }

      const r2Response = await getObject(file.r2Key);
      if (!r2Response.Body) {
        return NextResponse.json({ error: "File not available" }, { status: 500 });
      }

      const bodyStream = r2Response.Body as Readable;
      const webStream = Readable.toWeb(bodyStream) as ReadableStream;
      const encodedFilename = encodeURIComponent(file.filename);

      return new NextResponse(webStream, {
        headers: {
          "Content-Type": file.mimeType || "application/octet-stream",
          "Content-Disposition": `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`,
          ...(file.sizeBytes ? { "Content-Length": String(file.sizeBytes) } : {}),
        },
      });
    }

    // ZIP download
    if (meta.files.length === 0) {
      return NextResponse.json({ error: "No files" }, { status: 404 });
    }

    const passThrough = new PassThrough();
    const archive = archiver("zip", { zlib: { level: 5 } });
    archive.pipe(passThrough);

    for (const file of meta.files) {
      const r2Response = await getObject(file.r2Key);
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
