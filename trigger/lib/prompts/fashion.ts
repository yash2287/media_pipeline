import type { IndustryLibrary } from "./index";

export const fashionTemplates: IndustryLibrary = {
  marketplace_main: (ctx) => ({
    prompt: `Luxury e-commerce shot of ${ctx.product_type} on clean pure white #FFFFFF background, color accurate, retail-ready composition, premium fashion studio look, ${ctx.framing} framing, ${ctx.lighting} lighting.`,
    negativePrompt: "no text, no props, no people, no colored background",
  }),
  marketplace_gallery: (ctx) => ({
    prompt: `Fashion gallery angle of ${ctx.product_type} on clean white background, ${ctx.lighting} lighting, realistic fabric texture preserved.`,
    negativePrompt: "no text, no colored background",
  }),
  marketplace_lifestyle: (ctx) => ({
    prompt: `Fashion lifestyle scene of ${ctx.product_type} in a ${ctx.scene} setting, ${ctx.lighting} light, ${ctx.color_grade} grade, editorial shadows, realistic fabric texture.`,
    negativePrompt: "no fake-looking model proportions, no extra fingers",
  }),
  hero_lifestyle: (ctx) => ({
    prompt: `Finished fashion campaign creative featuring the provided ${ctx.product_type} as the hero subject in a ${ctx.vibe} setting, editorial shadows, realistic fabric texture, premium commercial finish, polished advertising composition. Do not make a plain cutout or white-background catalog image.`,
    negativePrompt: "no plain cutout, no white catalog background",
  }),
  social_static: (ctx) => ({
    prompt: `Fashion social still for ${ctx.brand_name}: ${ctx.product_type} in a ${ctx.scene} setting, ${ctx.lighting} light, ${ctx.color_grade} grade, ${ctx.tone} tone.`,
    negativePrompt: "no on-image text, no clutter",
  }),
  social_carousel: (ctx) => ({
    prompt: `Fashion carousel slide (${ctx.carousel_slide_role}). ${ctx.product_type} composed editorially. Render headline "${ctx.headline_text}"${ctx.subhead_text ? ` and subhead "${ctx.subhead_text}"` : ""} with a refined bold sans-serif typeface. Tone: ${ctx.tone}.`,
    negativePrompt: "no misspelled text, no clashing fonts",
  }),
  social_story: (ctx) => ({
    prompt: `Fashion 9:16 story image. Keep ${ctx.product_type} in the central 60% safe zone. Render "${ctx.headline_text}" centered with a soft dark scrim.`,
    negativePrompt: "no edge crowding, no watermark",
  }),
  catalog_angle: (ctx) => ({
    prompt: `Fashion catalog angle of ${ctx.product_type}, ${ctx.framing} framing, on pure white, ${ctx.lighting} lighting, consistent framing with the rest of the catalog.`,
    negativePrompt: "no inconsistent framing, no text, no props",
  }),
};
