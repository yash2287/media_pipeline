// Deterministic QA rules — sampled pixel checks, fill-ratio, palette drift.
// Runs before the vision-LLM pass so we can fail-fast on clear compliance issues.

import sharp from "sharp";

export interface DeterministicQaInput {
  buffer: Buffer;
  requirePureWhiteBg?: boolean;
  minFillRatio?: number;
  brandPalette?: Array<{ hex: string }>;
}

export interface DeterministicQaResult {
  pureWhiteBgOk: boolean | null;
  pureWhiteBgScore: number; // 0-100
  fillRatio: number | null;
  fillRatioOk: boolean | null;
  paletteDriftDeltaE: number | null;
  paletteDriftOk: boolean | null;
  notes: string[];
}

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  const value = parseInt(clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

// Quick perceptual distance — sRGB Euclidean. Not true ΔE76 but fast and good enough.
function colorDistance(a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }) {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

async function sampleCorners(image: sharp.Sharp) {
  const meta = await image.metadata();
  const w = meta.width ?? 1;
  const h = meta.height ?? 1;
  const cornerSize = Math.max(8, Math.floor(Math.min(w, h) * 0.04));
  const samples: Array<{ r: number; g: number; b: number }> = [];

  for (const [left, top] of [
    [0, 0],
    [w - cornerSize, 0],
    [0, h - cornerSize],
    [w - cornerSize, h - cornerSize],
  ]) {
    const region = await image
      .clone()
      .extract({ left, top, width: cornerSize, height: cornerSize })
      .raw()
      .toBuffer({ resolveWithObject: true });
    let r = 0;
    let g = 0;
    let b = 0;
    const channels = region.info.channels;
    const totalPixels = (region.info.width * region.info.height);
    for (let i = 0; i < region.data.length; i += channels) {
      r += region.data[i];
      g += region.data[i + 1];
      b += region.data[i + 2];
    }
    samples.push({
      r: r / totalPixels,
      g: g / totalPixels,
      b: b / totalPixels,
    });
  }

  return samples;
}

async function fillRatio(image: sharp.Sharp) {
  // Approximate fill ratio: count "non-background" pixels by alpha (if present)
  // or by luminance distance from sampled background corners.
  const meta = await image.metadata();
  const channels = meta.channels ?? 3;
  const { data, info } = await image.clone().raw().toBuffer({ resolveWithObject: true });
  const totalPixels = info.width * info.height;

  if (channels === 4) {
    let opaque = 0;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 32) opaque++;
    }
    return opaque / totalPixels;
  }

  // No alpha — assume white-ish background means non-fill.
  let nonBg = 0;
  const tolerance = 28;
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (255 - r > tolerance || 255 - g > tolerance || 255 - b > tolerance) {
      nonBg++;
    }
  }
  return nonBg / totalPixels;
}

async function paletteDrift(image: sharp.Sharp, palette: Array<{ hex: string }>) {
  if (!palette?.length) return null;
  // Downsample to 64×64 then count dominant cluster distance to palette.
  const sampled = await image.clone().resize(64, 64, { fit: "inside" }).raw().toBuffer({ resolveWithObject: true });
  const channels = sampled.info.channels;
  const counts = new Map<string, number>();
  for (let i = 0; i < sampled.data.length; i += channels) {
    const r = sampled.data[i] - (sampled.data[i] % 32);
    const g = sampled.data[i + 1] - (sampled.data[i + 1] % 32);
    const b = sampled.data[i + 2] - (sampled.data[i + 2] % 32);
    const key = `${r}:${g}:${b}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  // Top 3 clusters
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);

  let minDelta = Infinity;
  for (const [key] of top) {
    const [r, g, b] = key.split(":").map(Number);
    for (const swatch of palette) {
      const target = hexToRgb(swatch.hex);
      const d = colorDistance({ r, g, b }, target);
      if (d < minDelta) minDelta = d;
    }
  }
  return Number(minDelta.toFixed(2));
}

export async function runDeterministicQa(input: DeterministicQaInput): Promise<DeterministicQaResult> {
  const image = sharp(input.buffer);
  const notes: string[] = [];

  // Pure white background check
  let pureWhiteBgOk: boolean | null = null;
  let pureWhiteBgScore = 100;
  if (input.requirePureWhiteBg) {
    const corners = await sampleCorners(image);
    const maxDelta = Math.max(
      ...corners.map((c) => Math.max(255 - c.r, 255 - c.g, 255 - c.b)),
    );
    pureWhiteBgScore = Math.max(0, 100 - Math.round(maxDelta * 2));
    pureWhiteBgOk = maxDelta <= 6; // ≤6/255 = essentially pure white
    if (!pureWhiteBgOk) {
      notes.push(`Background not pure white — corner delta ${maxDelta}/255.`);
    }
  }

  // Fill ratio
  let fillRatioOk: boolean | null = null;
  let fillVal: number | null = null;
  if (input.minFillRatio != null) {
    fillVal = await fillRatio(image);
    fillRatioOk = fillVal >= input.minFillRatio;
    if (!fillRatioOk) {
      notes.push(`Fill ratio ${(fillVal * 100).toFixed(1)}% below required ${(input.minFillRatio * 100).toFixed(0)}%.`);
    }
  }

  // Palette drift
  let paletteDriftDeltaE: number | null = null;
  let paletteDriftOk: boolean | null = null;
  if (input.brandPalette?.length) {
    paletteDriftDeltaE = await paletteDrift(image, input.brandPalette);
    paletteDriftOk = paletteDriftDeltaE == null ? null : paletteDriftDeltaE < 80;
    if (paletteDriftOk === false) {
      notes.push(`Dominant colors drift ΔE≈${paletteDriftDeltaE} from brand palette.`);
    }
  }

  return {
    pureWhiteBgOk,
    pureWhiteBgScore,
    fillRatio: fillVal,
    fillRatioOk,
    paletteDriftDeltaE,
    paletteDriftOk,
    notes,
  };
}
