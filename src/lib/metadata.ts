import { r2 } from "./r2";
import {
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";

const bucket = process.env.CF_R2_BUCKET_NAME!;

export interface FileMeta {
  filename: string;
  sizeBytes: number;
  mimeType: string;
  r2Key: string;
}

export interface TransferMeta {
  transferId: string;
  shareToken: string;
  expiresAt: string;
  createdAt: string;
  downloadCount: number;
  files: FileMeta[];
}

function metaKey(transferId: string) {
  return `_meta/${transferId}.json`;
}

function tokenKey(shareToken: string) {
  return `_tokens/${shareToken}`;
}

export async function saveTransfer(meta: TransferMeta): Promise<void> {
  const body = JSON.stringify(meta);

  await Promise.all([
    r2.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: metaKey(meta.transferId),
        Body: body,
        ContentType: "application/json",
      })
    ),
    r2.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: tokenKey(meta.shareToken),
        Body: meta.transferId,
        ContentType: "text/plain",
      })
    ),
  ]);
}

export async function getTransferById(transferId: string): Promise<TransferMeta | null> {
  try {
    const res = await r2.send(
      new GetObjectCommand({ Bucket: bucket, Key: metaKey(transferId) })
    );
    const text = await res.Body!.transformToString();
    return JSON.parse(text) as TransferMeta;
  } catch {
    return null;
  }
}

export async function getTransferByToken(shareToken: string): Promise<TransferMeta | null> {
  try {
    const res = await r2.send(
      new GetObjectCommand({ Bucket: bucket, Key: tokenKey(shareToken) })
    );
    const transferId = await res.Body!.transformToString();
    return getTransferById(transferId);
  } catch {
    return null;
  }
}

export async function deleteTransfer(meta: TransferMeta): Promise<void> {
  const keysToDelete = [
    metaKey(meta.transferId),
    tokenKey(meta.shareToken),
    ...meta.files.map((f) => f.r2Key),
  ];

  for (let i = 0; i < keysToDelete.length; i += 1000) {
    const batch = keysToDelete.slice(i, i + 1000);
    await r2.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: batch.map((Key) => ({ Key })) },
      })
    );
  }
}

export async function listAllTransferIds(): Promise<string[]> {
  const ids: string[] = [];
  let continuationToken: string | undefined;

  do {
    const res = await r2.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: "_meta/",
        ContinuationToken: continuationToken,
      })
    );

    for (const obj of res.Contents || []) {
      if (obj.Key) {
        const id = obj.Key.replace("_meta/", "").replace(".json", "");
        ids.push(id);
      }
    }

    continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (continuationToken);

  return ids;
}
