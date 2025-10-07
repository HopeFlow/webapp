import { SafeUser } from "@/helpers/server/auth";
import { useEffect, useState } from "react";

export function useProfileFields(user?: SafeUser | null) {
  const [name, setName] = useState<string>(
    user ? [user.firstName, user.lastName].filter(Boolean).join(" ") : "",
  );
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const loadingImage = !!user?.imageUrl && !file && !previewUrl;

  // load existing user image (turn URL into a File so server receives multipart file)
  useEffect(() => {
    let revoked: string | null = null;
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      revoked = url;
    }
    return () => {
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [file]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!user?.imageUrl || file) return; // already have file, skip
      try {
        const res = await fetch(user.imageUrl);
        const blob = await res.blob();
        if (cancelled) return;
        setFile(
          new File([blob], "user_photo", { type: blob.type || "image/jpeg" }),
        );
      } catch (err) {
        console.warn("Failed to fetch existing image", err);
        // optional: set an error flag so you don't keep showing spinner
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [user?.imageUrl, file]);

  return {
    name,
    setName,
    file,
    setFile,
    previewUrl,
    setPreviewUrl,
    loadingImage,
  };
}
