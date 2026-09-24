import { api, ApiError } from "@/lib/api";

// Kept in sync with the backend's multer fileFilter in adplaylist-be/src/routes/uploads.ts
export const SUPPORTED_IMAGE_TYPES = /^image\/(png|jpe?g|webp|gif|svg\+xml)$/;
export const SUPPORTED_IMAGE_ACCEPT = ".png,.jpg,.jpeg,.webp,.gif,.svg";
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export function readImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Couldn't read that image"));
    };
    img.src = url;
  });
}

// Returns a user-facing message if the file can't be used as a master file.
export function validateImageFile(file: File): string | null {
  if (!SUPPORTED_IMAGE_TYPES.test(file.type)) {
    return "Unsupported format. Use PNG, JPG, WEBP, GIF or SVG.";
  }
  if (file.size > MAX_UPLOAD_BYTES) return "That file is over the 8 MB limit.";
  return null;
}

export async function uploadImage(file: File) {
  try {
    const dims = await readImageDimensions(file);
    const { url } = await api.uploadFile(file, dims);
    return { url, dims };
  } catch (err) {
    throw new Error(
      err instanceof ApiError ? err.message : "Couldn't upload that file."
    );
  }
}
