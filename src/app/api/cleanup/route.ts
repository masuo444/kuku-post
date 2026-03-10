export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { deleteObjects } from "@/lib/r2";

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
      for (let i = 0; i < keys.length; i += 1000) {
        await deleteObjects(keys.slice(i, i + 1000));
      }
    }

    await supabase.from("transfers").delete().in("id", transferIds);

    return NextResponse.json({ deleted: transferIds.length });
  } catch {
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}
