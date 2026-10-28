// Photo helpers: downscale a capture and read the car's paint colour.

const MAX_SIDE = 1600;

/** Re-encode any image source as a JPEG no larger than MAX_SIDE. */
export async function toJpeg(source: CanvasImageSource & { width: number; height: number }): Promise<Blob> {
  const scale = Math.min(1, MAX_SIDE / Math.max(source.width, source.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(source.width * scale);
  canvas.height = Math.round(source.height * scale);
  canvas.getContext("2d")!.drawImage(source, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/jpeg", 0.86));
}

export async function fileToJpeg(file: Blob) {
  const bitmap = await createImageBitmap(file);
  try {
    return await toJpeg(bitmap);
  } finally {
    bitmap.close();
  }
}

/**
 * The most common colour in the middle of the frame, where the car usually
 * is. Greys count (black, white and silver are real paint colours); very
 * bright pixels (sky, reflections) and near-black shadows count less.
 */
export async function paintColour(photo: Blob): Promise<string> {
  const bitmap = await createImageBitmap(photo);
  const N = 48;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = N;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  const w = bitmap.width, h = bitmap.height;
  ctx.drawImage(bitmap, w * 0.2, h * 0.3, w * 0.6, h * 0.45, 0, 0, N, N);
  bitmap.close();
  const data = ctx.getImageData(0, 0, N, N).data;
  const buckets = new Map<number, { n: number; r: number; g: number; b: number }>();
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const light = (max + min) / 2;
    const sat = max === 0 ? 0 : (max - min) / max;
    const weight = (light > 235 ? 0.2 : light < 18 ? 0.5 : 1) * (1 + sat * 1.5);
    const key = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5);
    const e = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    e.n += weight; e.r += r * weight; e.g += g * weight; e.b += b * weight;
    buckets.set(key, e);
  }
  const best = [...buckets.values()].sort((a, b) => b.n - a.n)[0];
  const hex = (v: number) => Math.round(v / best.n).toString(16).padStart(2, "0");
  return `#${hex(best.r)}${hex(best.g)}${hex(best.b)}`;
}
