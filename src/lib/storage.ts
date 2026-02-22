import { supabase } from "@/integrations/supabase/client";

const BUCKET = "product-mockups";

/**
 * Supabase Storage key'leri sadece güvenli ASCII karakterlere izin verir.
 * Türkçe ve diğer özel karakterleri dönüştürür, sadece [a-zA-Z0-9._-] bırakır.
 */
export function sanitizeStorageFileName(name: string): string {
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")) : "";
  const base = name.includes(".") ? name.slice(0, name.lastIndexOf(".")) : name;
  const trMap: Record<string, string> = { ı: "i", İ: "I", ğ: "g", Ğ: "G", ü: "u", Ü: "U", ş: "s", Ş: "S", ö: "o", Ö: "O", ç: "c", Ç: "C" };
  let normalized = base;
  for (const [k, v] of Object.entries(trMap)) normalized = normalized.replace(new RegExp(k, "g"), v);
  normalized = normalized
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "file";
  const safeExt = ext.replace(/[^a-zA-Z0-9.]/g, "");
  return (normalized + safeExt) || "file";
}

const STORAGE_PUBLIC_PREFIX = "/storage/v1/object/public/";

/**
 * Parse Supabase storage public URL into bucket and path.
 * e.g. "https://xxx.supabase.co/storage/v1/object/public/product-mockups/products/1/gallery/x.jpg"
 *  -> { bucket: "product-mockups", path: "products/1/gallery/x.jpg" }
 */
export function parseSupabaseStorageUrl(publicUrl: string): { bucket: string; path: string } | null {
  try {
    const clean = publicUrl.split("?")[0].split("#")[0];
    const i = clean.indexOf(STORAGE_PUBLIC_PREFIX);
    if (i === -1) return null;
    const after = clean.slice(i + STORAGE_PUBLIC_PREFIX.length);
    const slash = after.indexOf("/");
    if (slash === -1) return null;
    const bucket = after.slice(0, slash);
    const path = after.slice(slash + 1);
    return path ? { bucket, path } : null;
  } catch {
    return null;
  }
}

/**
 * Extract storage path from a Supabase storage public URL (when bucket is known).
 * e.g. "https://xxx.supabase.co/storage/v1/object/public/product-mockups/products/1/gallery/x.jpg"
 *  -> "products/1/gallery/x.jpg"
 */
export function getStoragePathFromPublicUrl(publicUrl: string, bucket: string = BUCKET): string | null {
  try {
    const prefix = `${STORAGE_PUBLIC_PREFIX}${bucket}/`;
    const i = publicUrl.indexOf(prefix);
    if (i === -1) return null;
    return publicUrl.slice(i + prefix.length);
  } catch {
    return null;
  }
}

/**
 * Get a signed URL for a storage object (works for private buckets).
 * Pass either the full Supabase public URL or the path within the bucket.
 * Paths with leading slash are normalized.
 */
export async function getSignedImageUrl(publicUrlOrPath: string, bucket: string = BUCKET): Promise<string | null> {
  let path: string | null;
  let useBucket = bucket;

  if (publicUrlOrPath.startsWith("http")) {
    const parsed = parseSupabaseStorageUrl(publicUrlOrPath);
    if (parsed) {
      useBucket = parsed.bucket;
      path = parsed.path;
    } else {
      path = getStoragePathFromPublicUrl(publicUrlOrPath, bucket);
    }
  } else {
    path = publicUrlOrPath.replace(/^\//, "").trim() || null;
  }

  if (!path) return null;
  const { data, error } = await supabase.storage.from(useBucket).createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export async function uploadPublicFile(params: {
  bucket: string;
  path: string;
  file: File;
  onProgress?: (percent: number) => void;
}) {
  const { bucket, path, file, onProgress } = params;

  if (onProgress && typeof XMLHttpRequest !== "undefined") {
    return uploadWithProgress({ bucket, path, file, onProgress });
  }

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: true,
    contentType: file.type || undefined,
  });

  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/** XHR upload to report progress (percent 0–100). */
async function uploadWithProgress(params: {
  bucket: string;
  path: string;
  file: File;
  onProgress: (percent: number) => void;
}): Promise<string> {
  const { bucket, path, file, onProgress } = params;
  const baseUrl = (import.meta as any).env?.VITE_SUPABASE_URL ?? "";
  const anonKey = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";
  if (!baseUrl || !anonKey) throw new Error("Supabase URL or key missing");

  const { data: { session } } = await supabase.auth.getSession();
  const pathPart = [bucket, ...path.replace(/^\/+/, "").split("/")].map((p) => encodeURIComponent(p)).join("/");
  const url = `${baseUrl.replace(/\/$/, "")}/storage/v1/object/${pathPart}`;

  const form = new FormData();
  form.append("cacheControl", "3600");
  form.append("", file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        onProgress(Math.min(100, Math.round((100 * e.loaded) / e.total)));
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        resolve(data.publicUrl);
      } else {
        try {
          const err = JSON.parse(xhr.responseText || "{}");
          reject(new Error(err.message || err.error_description || `Upload failed ${xhr.status}`));
        } catch {
          reject(new Error(`Upload failed ${xhr.status}`));
        }
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Upload failed")));
    xhr.addEventListener("abort", () => reject(new Error("Upload aborted")));

    xhr.open("POST", url);
    xhr.setRequestHeader("apikey", anonKey);
    xhr.setRequestHeader("x-upsert", "true");
    if (session?.access_token) {
      xhr.setRequestHeader("Authorization", `Bearer ${session.access_token}`);
    }
    xhr.send(form);
  });
}
