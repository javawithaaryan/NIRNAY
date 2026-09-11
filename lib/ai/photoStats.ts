import type { PhotoStats } from "@/lib/ai/types";

const sampleSize = 96;

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function statsFromPixels(data: Uint8ClampedArray | number[], pixels: number): PhotoStats {
  let sumLuma = 0;
  let sumLumaSq = 0;
  let earth = 0;
  let grey = 0;
  let green = 0;
  for (let index = 0; index < pixels * 4; index += 4) {
    const r = data[index] / 255;
    const g = data[index + 1] / 255;
    const b = data[index + 2] / 255;
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    sumLuma += luma;
    sumLumaSq += luma * luma;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const saturation = max === 0 ? 0 : (max - min) / max;
    if (saturation < 0.12) grey += 1;
    else if (g > r && g > b) green += 1;
    else if (r >= g && g >= b && r - b > 0.08 && luma < 0.75) earth += 1;
  }
  const mean = sumLuma / pixels;
  const variance = Math.max(0, sumLumaSq / pixels - mean * mean);
  return {
    meanLuminance: round(mean),
    contrast: round(Math.sqrt(variance)),
    earthToneShare: round(earth / pixels),
    greyShare: round(grey / pixels),
    greenShare: round(green / pixels),
    sampledPixels: pixels,
  };
}

export async function analyzePhoto(blob: Blob): Promise<PhotoStats | null> {
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") return null;
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = sampleSize;
    canvas.height = sampleSize;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return null;
    context.drawImage(bitmap, 0, 0, sampleSize, sampleSize);
    const { data } = context.getImageData(0, 0, sampleSize, sampleSize);
    return statsFromPixels(data, sampleSize * sampleSize);
  } catch (error) {
    console.warn("Photo statistics could not be computed", error);
    return null;
  } finally {
    bitmap?.close();
  }
}
