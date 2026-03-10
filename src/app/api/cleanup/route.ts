export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { deleteFiles } from "@/lib/storage";

export async function DELETE() {
  try {
    const supabase = getSupabase();
    const { data: expired } = await supabase
      .from("transfers")
      .select("id")
      .lt("expires_at", new Date().toISOString());

    if (!expired || expired.length === 0) {
      return NextResponse.json({ deleted: 0 });
    }

    const transferIds = expired.map((t) => t.id);

    const { data: files } = await supabase
      .from("files")
      .select("r2_key")
      .in("transfer_id", transferIds);

    if (files && files.length > 0) {
      const keys = files.map((f) => f.r2_key);
      // Delete in batches of 100
      for (let i = 0; i < keys.length; i += 100) {
        await deleteFiles(keys.slice(i, i + 100));
      }
    }

    await supabase.from("transfers").delete().in("id", transferIds);

    return NextResponse.json({ deleted: transferIds.length });
  } catch {
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}
