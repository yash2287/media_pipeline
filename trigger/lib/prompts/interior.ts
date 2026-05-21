import type { IndustryLibrary } from "./index";

export const interiorTemplates: IndustryLibrary = {
  marketplace_main: (ctx) => ({
    prompt: `Premium catalog product image of ${ctx.product_type} on pure white #FFFFFF background, ${ctx.framing} framing, balanced ${ctx.lighting} lighting, soft contact shadow grounded, no props.`,
    negativePrompt: "no text, no props, no people, no colored background",
  }),
  marketplace_gallery: (ctx) => ({
    prompt: `Gallery angle of ${ctx.product_type} on clean white, ${ctx.framing} framing, balanced ${ctx.lighting} light.`,
    negativePrompt: "no text, no props, no colored background",
  }),
  marketplace_lifestyle: (ctx) => ({
    prompt: `Interior lifestyle scene of ${ctx.product_type} in a ${ctx.scene} room, ${ctx.lighting} light, ${ctx.color_grade} grade, restrained styling, premium homeware look.`,
    negativePrompt: "no clutter, no fake-looking models, no on-image text",
  }),
  hero_lifestyle: (ctx) => ({
    prompt: `Finished interior advertising creative with the provided ${ctx.product_type} as the hero subject in a ${ctx.vibe} room scene, natural daylight, restrained styling, premium homeware look, polished editorial composition. Do not make a plain cutout or white-background catalog image.`,
    negativePrompt: "no plain cutout, no white catalog background, no on-image text",
  }),
  social_static: (ctx) => ({
    prompt: `Interior social still: ${ctx.product_type} in a ${ctx.scene} room for ${ctx.brand_name}, ${ctx.lighting} light, ${ctx.color_grade} grade.`,
    negativePrompt: "no on-image text, no clutter",
  }),
  social_carousel: (ctx) => ({
    prompt: `Interior carousel slide (${ctx.carousel_slide_role}). ${ctx.product_type} in a ${ctx.scene} room. Render ONE single headline reading exactly "${ctx.headline_text}"${ctx.subhead_text ? ` with ONE smaller subhead reading exactly "${ctx.subhead_text}"` : ""} in a clean bold sans-serif typeface. Spell each string precisely. Do not echo, duplicate, ghost, or repeat the text anywhere else in the image. Tone: ${ctx.tone}.`,
    negativePrompt:
      "no duplicated text, no ghosted background lettering, no echoed headline, no misspelled text",
  }),
  social_story: (ctx) => ({
    prompt: `Interior 9:16 story image. Keep ${ctx.product_type} central. Render ONE single headline reading exactly "${ctx.headline_text}" centered with a soft dark scrim. Spell it precisely. Do not echo, duplicate, ghost, or repeat the headline anywhere else in the image.`,
    negativePrompt:
      "no duplicated text, no ghosted background lettering, no echoed headline, no edge crowding, no misspellings",
  }),
  catalog_angle: (ctx) => ({
    prompt: `Catalog interior image of ${ctx.product_type}, ${ctx.framing} angle, on pure white, ${ctx.lighting} lighting, consistent framing.`,
    negativePrompt: "no inconsistent framing, no text, no props",
  }),
};
