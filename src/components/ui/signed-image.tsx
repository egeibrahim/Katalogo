import { useEffect, useState } from "react";
import { getSignedImageUrl } from "@/lib/storage";

/**
 * Renders an image from Supabase storage. If the src is a path (not a full URL),
 * fetches a signed URL so the image loads. Also tries signed URL on load error.
 */
export function SignedImage({
  src,
  alt = "",
  className,
  loading,
  ...props
}: {
  src: string | null | undefined;
  alt?: string;
  className?: string;
  loading?: "lazy" | "eager";
} & Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src" | "alt">) {
  const [displaySrc, setDisplaySrc] = useState<string | null>(src ?? null);
  const [triedSigned, setTriedSigned] = useState(false);

  useEffect(() => {
    const raw = src ?? null;
    setDisplaySrc(raw);
    setTriedSigned(false);
    if (!raw) return;
    // Same-origin or data URLs: use as-is
    if (raw.startsWith("/") && !raw.startsWith("//") || raw.startsWith("data:")) return;
    const isSupabaseStorage = raw.startsWith("http") && raw.includes("/storage/v1/object/public/");
    const needsSigning = !raw.startsWith("http") || isSupabaseStorage;
    if (needsSigning) {
      getSignedImageUrl(raw).then((signed) => {
        if (signed) setDisplaySrc(signed);
      });
    }
  }, [src]);

  const handleError = () => {
    if (!src || triedSigned) return;
    setTriedSigned(true);
    getSignedImageUrl(src).then((signed) => {
      if (signed) setDisplaySrc(signed);
    });
  };

  if (!displaySrc) return <div className={className} style={{ backgroundColor: "hsl(var(--muted))" }} aria-hidden />;
  return (
    <img
      src={displaySrc}
      alt={alt}
      className={className}
      loading={loading}
      onError={handleError}
      {...props}
    />
  );
}
