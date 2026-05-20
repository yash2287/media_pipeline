import sharp from "sharp";
import type { PackSlot } from "../packs/types";

export async function smartCrop(buffer: Buffer, width: number, height: number) {
  return sharp(buffer)
    .resize(width, height, { fit: "cover", position: sharp.strategy.attention })
    .toBuffer();
}

export async function dumbCrop(buffer: Buffer, width: number, height: number) {
  return sharp(buffer).resize(width, height, { fit: "cover" }).toBuffer();
}

// Pad the subject into a safe zone so the top/bottom margins are reserved
// for platform UI overlay (Stories/Reels). We resize the source to fit inside
// (width × (height - topPx - bottomPx)) and place on a backdrop the full height.
export async function fitWithSafeZone(opts: {
  input: Buffer;
  width: number;
  height: number;
  topPx: number;
  bottomPx: number;
  backdropColor?: { r: number; g: number; b: number; alpha?: number };
}) {
  const innerHeight = Math.max(64, opts.height - opts.topPx - opts.bottomPx);
  const inner = await sharp(opts.input)
    .resize(opts.width, innerHeight, { fit: "cover", position: sharp.strategy.attention })
    .toBuffer();

  const backdrop = sharp({
    create: {
      width: opts.width,
      height: opts.height,
      channels: 4,
      background: opts.backdropColor ?? { r: 0, g: 0, b: 0, alpha: 1 },
    },
  });

  return backdrop
    .composite([{ input: inner, top: opts.topPx, left: 0 }])
    .png()
    .toBuffer();
}

export function shouldUseSafeZone(slot: PackSlot) {
  return Boolean(slot.safeZone && (slot.safeZone.topPx || slot.safeZone.bottomPx));
}
