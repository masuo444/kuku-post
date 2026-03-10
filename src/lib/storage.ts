import { getSupabase } from "./supabase";

const BUCKET = "transfers";

export async function ensureBucket() {
  const supabase = getSupabase();
  const { data } = await supabase.storage.getBucket(BUCKET);
  if (!data) {
    await supabase.storage.createBucket(BUCKET, {
      public: false,
      fileSizeLimit: 10 * 1024 * 1024 * 1024, // 10GB
    });
  }
}

export async function uploadFile(
  key: string,
  body: Buffer,
  contentType: string
): Promise<void> {
  const supabase = getSupabase();
  await ensureBucket();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(key, body, {
      contentType,
      upsert: true,
    });
  if (error) throw error;
}

export async function downloadFile(key: string): Promise<{ data: Blob; error: null } | { data: null; error: Error }> {
  const supabase = getSupabase();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(key);
  if (error) return { data: null, error };
  return { data, error: null };
}

export async function deleteFiles(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const supabase = getSupabase();
  const { error } = await supabase.storage
    .from(BUCKET)
    .remove(keys);
  if (error) throw error;
}
