/**
 * Binary object storage for member media. Replaces legacy local-disk folders
 * (`users/{id}/`, `users/{id}/avata/`, `img/node/`) which stored uploads —
 * including scripts — inside the public web root.
 */
export interface StoredObject {
  key: string;
  url: string;
  contentType: string;
  sizeBytes: number;
}

export interface MediaStorage {
  put(key: string, data: Buffer, contentType: string): Promise<StoredObject>;
  delete(key: string): Promise<void>;
  /** Public or signed URL served back to clients. */
  getUrl(key: string): string;
}
