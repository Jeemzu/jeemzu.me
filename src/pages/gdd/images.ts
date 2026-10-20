import { LIMITS } from "./document";

export function imageDimensions(bytes: Uint8Array): {
  width: number;
  height: number;
} {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes[0] === 0x89 && bytes.length >= 24) {
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset + 4 <= bytes.length) {
      if (bytes[offset] !== 0xff) break;
      while (bytes[offset] === 0xff) offset++;
      const marker = bytes[offset++];
      if (marker === 0xd9 || marker === 0xda) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (offset + 2 > bytes.length) break;
      const length = view.getUint16(offset);
      if (length < 2 || offset + length > bytes.length) break;
      if ([0xc0, 0xc1, 0xc2].includes(marker) && length >= 8) {
        return {
          width: view.getUint16(offset + 5),
          height: view.getUint16(offset + 3),
        };
      }
      offset += length;
    }
  }
  throw new Error(
    "The image is damaged or uses an unsupported image encoding.",
  );
}

export function validateDimensions(bytes: Uint8Array, path: string) {
  const dimensions = imageDimensions(bytes);
  if (
    !dimensions.width ||
    !dimensions.height ||
    dimensions.width > 16_000 ||
    dimensions.height > 16_000 ||
    dimensions.width * dimensions.height > LIMITS.pixels
  )
    throw new Error(`${path} exceeds 24 megapixels or 16,000 pixels per side.`);
  return dimensions;
}

export interface PdfImage {
  src: string;
  width: number;
  height: number;
}

export async function prepareImages(
  images: Record<string, Uint8Array>,
): Promise<Record<string, PdfImage>> {
  const result: Record<string, PdfImage> = {};
  // Decode sequentially to avoid holding many full-resolution bitmaps at once.
  for (const [path, bytes] of Object.entries(images)) {
    const dimensions = validateDimensions(bytes, path);
    const blob = new Blob([Uint8Array.from(bytes).buffer], {
      type: /\.png$/i.test(path) ? "image/png" : "image/jpeg",
    });
    try {
      const bitmap = await createImageBitmap(blob);
      bitmap.close();
    } catch {
      throw new Error(
        `Cannot decode ${path}. Re-save it as a standard PNG or JPEG.`,
      );
    }
    const src = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error(`Cannot read ${path}.`));
      reader.onload = () => {
        if (typeof reader.result !== "string")
          reject(new Error(`Cannot read ${path}.`));
        else resolve(reader.result);
      };
      reader.readAsDataURL(blob);
    });
    result[path] = { src, ...dimensions };
  }
  return result;
}
