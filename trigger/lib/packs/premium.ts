import type { PackSlot } from "./types";

export const premiumPack: PackSlot[] = [
  {
    slot: "premium_square",
    intent: "hero_lifestyle",
    width: 4096,
    height: 4096,
    format: "png",
    modelPreference: "gpt_image_high",
    upscaleNeeded: true,
    description: "Premium editorial square — magazine-quality hero.",
  },
  {
    slot: "hero_landscape",
    intent: "hero_lifestyle",
    width: 4096,
    height: 2304,
    format: "png",
    modelPreference: "gpt_image_high",
    upscaleNeeded: true,
    description: "16:9 hero for website banner / press.",
  },
  {
    slot: "hero_vertical",
    intent: "hero_lifestyle",
    width: 2304,
    height: 4096,
    format: "png",
    modelPreference: "gpt_image_high",
    upscaleNeeded: true,
    description: "9:16 vertical for premium social.",
  },
  {
    slot: "premium_detail_macro",
    intent: "hero_lifestyle",
    width: 4096,
    height: 4096,
    format: "png",
    modelPreference: "gpt_image_high",
    upscaleNeeded: true,
    description: "Macro detail close-up emphasising material and craft.",
  },
];
