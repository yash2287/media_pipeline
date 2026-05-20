// SVG text overlay composed into images via sharp.composite.
// Used by the adapt step to render on-image headlines deterministically (no AI character drift).

import sharp from "sharp";

export type TextPlacement = "top_center" | "bottom_center" | "left" | "right" | "center";
export type TextBackground = "transparent" | "scrim_dark" | "scrim_light" | "pill_accent";

export interface TextOverlaySpec {
  width: number;
  height: number;
  headline?: string;
  subhead?: string;
  cta?: string;
  fontFamily?: string;
  fontColor?: string;
  placement?: TextPlacement;
  background?: TextBackground;
  accentColor?: string;
  sizeScale?: number;
}

function stripInvalidXmlChars(input: string) {
  return input.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\uFFFE\uFFFF]/g, "");
}

function escapeXml(input: string) {
  return stripInvalidXmlChars(input).replace(/[<>&'"]/g, (ch) => {
    switch (ch) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      case '"':
        return "&quot;";
      default:
        return ch;
    }
  });
}

function escapeXmlAttribute(input: string) {
  return escapeXml(input);
}

function safeColor(input: string | undefined, fallback: string) {
  const value = input?.trim();
  if (!value) return fallback;
  if (/^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?([0-9a-fA-F]{2})?$/.test(value)) return value;
  if (/^rgba?\(\s*(\d{1,3}\s*,\s*){2}\d{1,3}(\s*,\s*(0|1|0?\.\d+))?\s*\)$/.test(value)) {
    return value;
  }
  return fallback;
}

function yForPlacement(placement: TextPlacement, height: number, blockHeight: number) {
  switch (placement) {
    case "top_center":
      return Math.round(height * 0.08);
    case "bottom_center":
      return height - blockHeight - Math.round(height * 0.08);
    case "center":
      return Math.round((height - blockHeight) / 2);
    case "left":
    case "right":
      return Math.round((height - blockHeight) / 2);
  }
}

function xAlignForPlacement(placement: TextPlacement): "start" | "middle" | "end" {
  if (placement === "left") return "start";
  if (placement === "right") return "end";
  return "middle";
}

function xForPlacement(placement: TextPlacement, width: number) {
  if (placement === "left") return Math.round(width * 0.08);
  if (placement === "right") return Math.round(width * 0.92);
  return Math.round(width / 2);
}

export async function compositeTextOverlay(input: Buffer, spec: TextOverlaySpec) {
  const headline = spec.headline?.trim() ?? "";
  const subhead = spec.subhead?.trim() ?? "";
  const cta = spec.cta?.trim() ?? "";
  if (!headline && !subhead && !cta) return input;

  const { width, height } = spec;
  const placement = spec.placement ?? "bottom_center";
  const fontColor = safeColor(spec.fontColor, "#ffffff");
  const accentColor = safeColor(spec.accentColor, "#4338ca");
  const fontFamily =
    spec.fontFamily ??
    'Inter, "Helvetica Neue", Helvetica, Arial, "Segoe UI", system-ui, sans-serif';
  const fontFamilyAttr = escapeXmlAttribute(fontFamily);

  const scale = spec.sizeScale ?? 1;
  const baseSize = Math.round(Math.min(width, height) * 0.072 * scale);
  const subSize = Math.round(baseSize * 0.42);
  const ctaSize = Math.round(baseSize * 0.34);

  const padding = Math.round(baseSize * 0.5);
  const headlineLines = headline ? Math.max(1, Math.ceil(headline.length / 22)) : 0;
  const headlineHeight = headlineLines * baseSize * 1.08;
  const subHeight = subhead ? subSize * 1.4 : 0;
  const ctaHeight = cta ? ctaSize * 2.4 : 0;

  const blockHeight = Math.round(headlineHeight + subHeight + ctaHeight + padding * 1.5);
  const blockY = yForPlacement(placement, height, blockHeight);
  const textX = xForPlacement(placement, width);
  const anchor = xAlignForPlacement(placement);

  // Background scrim
  let scrimSvg = "";
  if (spec.background === "scrim_dark") {
    scrimSvg = `<rect x="0" y="${blockY - padding}" width="${width}" height="${blockHeight + padding}" fill="rgba(0,0,0,0.45)" />`;
  } else if (spec.background === "scrim_light") {
    scrimSvg = `<rect x="0" y="${blockY - padding}" width="${width}" height="${blockHeight + padding}" fill="rgba(255,255,255,0.78)" />`;
  } else if (spec.background === "pill_accent" && headline) {
    const pillW = Math.min(width * 0.7, headline.length * baseSize * 0.62 + padding);
    const pillX = (width - pillW) / 2;
    scrimSvg = `<rect x="${pillX}" y="${blockY}" width="${pillW}" height="${baseSize * 1.6}" rx="${baseSize}" fill="${accentColor}" />`;
  }

  const headlineY = blockY + baseSize;
  const subY = headlineY + headlineHeight * 0.4 + subSize;
  const ctaY = subY + (subhead ? subSize * 0.8 : 0) + ctaSize + Math.round(padding * 0.4);

  const headlineFill =
    spec.background === "scrim_light"
      ? "#0d0a07"
      : spec.background === "pill_accent"
        ? "#ffffff"
        : fontColor;

  const headlineSvg = headline
    ? `<text x="${textX}" y="${headlineY}" font-family="${fontFamilyAttr}" font-weight="800" font-size="${baseSize}" fill="${headlineFill}" text-anchor="${anchor}" letter-spacing="-1">${escapeXml(headline)}</text>`
    : "";
  const subSvg = subhead
    ? `<text x="${textX}" y="${subY}" font-family="${fontFamilyAttr}" font-weight="500" font-size="${subSize}" fill="${headlineFill}" opacity="0.85" text-anchor="${anchor}">${escapeXml(subhead)}</text>`
    : "";
  const ctaSvg = cta
    ? `<text x="${textX}" y="${ctaY}" font-family="${fontFamilyAttr}" font-weight="700" font-size="${ctaSize}" fill="${accentColor}" text-anchor="${anchor}" letter-spacing="2">${escapeXml(cta.toUpperCase())}</text>`
    : "";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${scrimSvg}${headlineSvg}${subSvg}${ctaSvg}</svg>`;

  return sharp(input)
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .toBuffer();
}

export async function compositeWatermark(opts: {
  input: Buffer;
  width: number;
  height: number;
  text: string;
}) {
  const fontSize = Math.round(Math.min(opts.width, opts.height) * 0.022);
  const padding = Math.round(fontSize * 0.6);
  const x = opts.width - padding;
  const y = opts.height - padding;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${opts.width}" height="${opts.height}" viewBox="0 0 ${opts.width} ${opts.height}">
    <text x="${x}" y="${y}" font-family='Inter, "Helvetica Neue", Arial, sans-serif' font-weight="600" font-size="${fontSize}" fill="rgba(255,255,255,0.65)" text-anchor="end" stroke="rgba(0,0,0,0.18)" stroke-width="1" paint-order="stroke">${escapeXml(opts.text)}</text>
  </svg>`;

  return sharp(opts.input)
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .toBuffer();
}
