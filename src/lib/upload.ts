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

// Video ads are MP4 only. They upload straight to storage, so they aren't
// held to the API's 25 MB cap.
export const SUPPORTED_VIDEO_ACCEPT = ".mp4";
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

export function isVideoFile(file: File) {
  return file.type.startsWith("video/") || /\.(mp4|mov|webm|m4v)$/i.test(file.name);
}

// Returns a user-facing message if the file can't be used as an ad's video.
export function validateVideoFile(file: File): string | null {
  if (file.type !== "video/mp4") return "Unsupported format. Videos must be MP4.";
  if (file.size > MAX_VIDEO_BYTES) return "That video is over the 100 MB limit.";
  return null;
}

// The library's video length filter options (lib/ads.ts VIDEO_LENGTH_OPTIONS).
function videoLengthLabel(seconds: number) {
  if (seconds < 6) return "Under 6s";
  if (seconds <= 15) return "6–15s";
  if (seconds <= 30) return "15–30s";
  return "30s+";
}

// Reads a video's size and length, and takes a still from it to use as its
// cover: what the library shows, and the ad page until the video is played.
function readVideo(file: File): Promise<{
  dims: { width: number; height: number };
  duration: number;
  cover: File;
}> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    const fail = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Couldn't read that video"));
    };
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.onerror = fail;
    // The very first frame is often black, so the still is taken a moment in.
    video.onloadedmetadata = () => {
      video.currentTime = Math.min(1, video.duration / 2);
    };
    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx || !canvas.width || !canvas.height) return fail();
      ctx.drawImage(video, 0, 0);
      canvas.toBlob(
        (blob) => {
          if (!blob) return fail();
          URL.revokeObjectURL(url);
          resolve({
            dims: { width: canvas.width, height: canvas.height },
            duration: video.duration,
            cover: new File([blob], file.name.replace(/\.[^.]+$/, "") + "-cover.jpg", {
              type: "image/jpeg",
            }),
          });
        },
        "image/jpeg",
        0.9
      );
    };
    video.src = url;
  });
}

// Uploads a video and the cover still taken from it. The video starts
// uploading straight away, while the cover is being made.
export async function uploadVideo(file: File) {
  try {
    const uploadingVideo = api.uploadFile(file);
    // Handled below with the rest; this only stops an "unhandled" warning
    // if reading the video fails first.
    uploadingVideo.catch(() => {});
    const { dims, duration, cover } = await readVideo(file);
    const [{ url: videoUrl }, { url: coverUrl }] = await Promise.all([
      uploadingVideo,
      api.uploadFile(cover, dims),
    ]);
    return { videoUrl, coverUrl, dims, videoLength: videoLengthLabel(duration) };
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : "Couldn't upload that video.");
  }
}
