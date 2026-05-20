// Simple color-grade presets applied via sharp.
// Not a full LUT, but enough to give visible looks consistent with brief.colorGrade.

import sharp, { type Sharp } from "sharp";

export type ColorGrade =
  | "neutral"
  | "warm_magazine"
  | "cool_tech"
  | "kinfolk_natural"
  | "high_contrast";

export function applyColorGrade(image: Sharp, grade: ColorGrade | undefined | null): Sharp {
  if (!grade || grade === "neutral") return image;

  switch (grade) {
    case "warm_magazine":
      return image
        .modulate({ brightness: 1.04, saturation: 1.08, hue: 8 })
        .gamma(1.05)
        .linear(1.02, -2);

    case "cool_tech":
      return image
        .modulate({ brightness: 1.02, saturation: 0.92, hue: -8 })
        .gamma(0.96)
        .linear(1.04, -4);

    case "kinfolk_natural":
      return image
        .modulate({ brightness: 1.03, saturation: 0.85, hue: 4 })
        .gamma(1.08)
        .linear(0.98, 4);

    case "high_contrast":
      return image
        .modulate({ brightness: 1.0, saturation: 1.12 })
        .linear(1.18, -16)
        .gamma(0.96);
  }
  return image;
}

export async function pipelineGradeBuffer(input: Buffer, grade: ColorGrade | undefined | null) {
  if (!grade || grade === "neutral") return input;
  return applyColorGrade(sharp(input), grade).toBuffer();
}
