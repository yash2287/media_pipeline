// Average-hash perceptual hash for cheap duplicate detection at intake.
import sharp from "sharp";

const HASH_SIZE = 8; // 8x8 = 64-bit fingerprint

export async function aHash(buffer: Buffer): Promise<string> {
  const { data } = await sharp(buffer)
    .grayscale()
    .resize(HASH_SIZE, HASH_SIZE, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  let sum = 0;
  for (const px of data) sum += px;
  const mean = sum / data.length;

  let hash = "";
  for (const px of data) {
    hash += px >= mean ? "1" : "0";
  }
  // Encode as hex for compactness
  let hex = "";
  for (let i = 0; i < hash.length; i += 4) {
    hex += parseInt(hash.slice(i, i + 4), 2).toString(16);
  }
  return hex;
}

export function hammingDistance(a: string, b: string): number {
  if (a.length !== b.length) return Math.max(a.length, b.length) * 4;
  let dist = 0;
  for (let i = 0; i < a.length; i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (x) {
      dist += x & 1;
      x >>= 1;
    }
  }
  return dist;
}
