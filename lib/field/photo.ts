import type { PreparedPhoto } from "@/lib/field/types";

export type PhotoErrorCode = "not-image" | "too-large" | "unreadable";
export type CameraAvailability = "available" | "none" | "unknown";

export class PhotoError extends Error {
  readonly code: PhotoErrorCode;

  constructor(code: PhotoErrorCode) {
    super(code);
    this.name = "PhotoError";
    this.code = code;
  }
}

export const maxPhotoMegabytes = 25;

const maxDimension = 1600;
const jpegQuality = 0.82;

async function decodeImage(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new PhotoError("unreadable");
  }
}

function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new PhotoError("unreadable"))),
      "image/jpeg",
      jpegQuality,
    );
  });
}

export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  if (!file.type.startsWith("image/")) throw new PhotoError("not-image");
  if (file.size > maxPhotoMegabytes * 1024 * 1024) throw new PhotoError("too-large");

  const bitmap = await decodeImage(file);
  try {
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new PhotoError("unreadable");
    context.drawImage(bitmap, 0, 0, width, height);
    const blob = await canvasToJpeg(canvas);
    return {
      blob,
      mimeType: "image/jpeg",
      width,
      height,
      byteSize: blob.size,
      originalByteSize: file.size,
      fileModifiedAt: file.lastModified ? new Date(file.lastModified).toISOString() : null,
    };
  } finally {
    bitmap.close();
  }
}

export async function detectCamera(): Promise<CameraAvailability> {
  try {
    if (!navigator.mediaDevices?.enumerateDevices) return "unknown";
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.some((device) => device.kind === "videoinput") ? "available" : "none";
  } catch {
    return "unknown";
  }
}
