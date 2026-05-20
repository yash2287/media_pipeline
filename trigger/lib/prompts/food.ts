import type { IndustryLibrary } from "./index";

export const foodTemplates: IndustryLibrary = {
  marketplace_main: (ctx) => ({
    prompt: `Commercial studio photograph of ${ctx.product_type} on clean pure white #FFFFFF background with appetizing but natural color balance. Soft contact shadow. ${ctx.framing} framing, ${ctx.lighting} lighting.`,
    negativePrompt: "no text, no props, no colored background",
  }),
  marketplace_lifestyle: (ctx) => ({
    prompt: `Lifestyle food image of ${ctx.product_type} in a ${ctx.scene} tabletop, appetizing styling, ${ctx.lighting} light, ${ctx.color_grade} grade, restaurant-grade photography.`,
    negativePrompt: "no AI-looking food, no melting artifacts, no extra fingers",
  }),
  hero_lifestyle: (ctx) => ({
    prompt: `Finished social media food creative featuring the provided ${ctx.product_type} as the hero subject in a ${ctx.vibe} tabletop scene. Add appetizing props, sauce detail, realistic steam, soft directional light, restaurant-grade styling, polished advertising composition. Do not make a plain cutout or white-background catalog image.`,
    negativePrompt: "no plain cutout, no white catalog background",
  }),
  social_static: (ctx) => ({
    prompt: `Food social still for ${ctx.brand_name}: ${ctx.product_type} on a ${ctx.scene} table, ${ctx.lighting} light, ${ctx.color_grade} grade.`,
    negativePrompt: "no on-image text, no busy backgrounds",
  }),
  social_carousel: (ctx) => ({
    prompt: `Food carousel slide (${ctx.carousel_slide_role}). ${ctx.product_type} composed appetizingly. Render headline "${ctx.headline_text}"${ctx.subhead_text ? ` and subhead "${ctx.subhead_text}"` : ""} with a clean bold sans-serif typeface. Tone: ${ctx.tone}.`,
    negativePrompt: "no misspelled text, no garbled characters",
  }),
  social_story: (ctx) => ({
    prompt: `9:16 vertical food story image of ${ctx.product_type} for ${ctx.brand_name}. Subject in central 60% safe zone. Render "${ctx.headline_text}" centered with soft scrim.`,
    negativePrompt: "no UI overlap, no edge crowding",
  }),
  catalog_angle: (ctx) => ({
    prompt: `Catalog food image of ${ctx.product_type}, ${ctx.framing} angle, on pure white, ${ctx.lighting} lighting, color accurate, consistent framing.`,
    negativePrompt: "no text, no props, no colored background",
  }),
};
