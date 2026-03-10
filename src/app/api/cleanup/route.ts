export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { listAllTransferIds, getTransferById, deleteTransfer } from "@/lib/metadata";

export async function DELETE() {
  try {
    const ids = await listAllTransferIds();
    let deleted = 0;

    for (const id of ids) {
      const meta = await getTransferById(id);
      if (!meta) continue;

      if (new Date(meta.expiresAt) < new Date()) {
        await deleteTransfer(meta);
        deleted++;
      }
    }

    return NextResponse.json({ deleted });
  } catch {
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}
