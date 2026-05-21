import type { IndustryLibrary } from "./index";

export const jewelleryTemplates: IndustryLibrary = {
  marketplace_main: (ctx) => ({
    prompt: `Photorealistic product photo of a ${ctx.product_type}, centered on pure white #FFFFFF background, soft contact shadow grounding the piece, ${ctx.primary_color} should stay true to color, ${ctx.framing} framing, ${ctx.lighting} lighting. Premium e-commerce framing.`,
    negativePrompt:
      "no text, no props, no people, no colored background, no shadow touching frame edge, no watermark",
  }),
  marketplace_gallery: (ctx) => ({
    prompt: `Gallery angle of ${ctx.product_type} on clean white background, ${ctx.lighting} lighting, fine metal/stone reflections preserved, color accurate.`,
    negativePrompt: "no text, no props, no colored background",
  }),
  marketplace_lifestyle: (ctx) => ({
    prompt: `Jewellery lifestyle scene featuring ${ctx.product_type} on a ${ctx.scene} surface with ${ctx.secondary_color} styling. ${ctx.lighting} lighting, ${ctx.color_grade} grade, magazine-quality finish, calm background blur.`,
    negativePrompt: "no plain cutout, no white catalog background, no on-image text",
  }),
  hero_lifestyle: (ctx) => ({
    prompt: `Finished jewellery advertising creative featuring the provided ${ctx.product_type} as the hero subject on a ${ctx.vibe} surface with muted ${ctx.secondary_color} styling. Soft window light, premium props, magazine-quality finish, calm background blur. Do not make a plain cutout or white-background catalog image.`,
    negativePrompt: "no plain cutout, no white catalog background, no on-image text",
  }),
  social_static: (ctx) => ({
    prompt: `Editorial jewellery social post for ${ctx.brand_name}. ${ctx.product_type} on ${ctx.scene}, ${ctx.lighting} light, ${ctx.color_grade} grade, ${ctx.tone} tone.`,
    negativePrompt: "no on-image text, no busy backgrounds",
  }),
  social_carousel: (ctx) => ({
    prompt: `Jewellery carousel slide (${ctx.carousel_slide_role}). ${ctx.product_type} composed in a ${ctx.scene} setting. Render ONE single headline reading exactly "${ctx.headline_text}"${ctx.subhead_text ? ` with ONE smaller subhead reading exactly "${ctx.subhead_text}"` : ""} in an elegant clean sans-serif typeface. Spell each string precisely. Do not echo, duplicate, ghost, or repeat the text anywhere else in the image. ${ctx.lighting} light, ${ctx.color_grade} grade.`,
    negativePrompt:
      "no duplicated text, no ghosted background lettering, no echoed headline, no misspelled text, no clashing fonts",
  }),
  social_story: (ctx) => ({
    prompt: `Jewellery 9:16 story image. Keep ${ctx.product_type} in the central 60% of the frame. Render ONE single headline reading exactly "${ctx.headline_text}" centered with a soft dark scrim. Spell it precisely. Do not echo, duplicate, ghost, or repeat the headline anywhere else in the image. ${ctx.lighting} light.`,
    negativePrompt:
      "no duplicated text, no ghosted background lettering, no echoed headline, no edge crowding, no watermark, no misspellings",
  }),
  catalog_angle: (ctx) => ({
    prompt: `Catalog jewellery angle of ${ctx.product_type}, on pure white, ${ctx.framing} framing, ${ctx.lighting} lighting, identical framing/lighting to the rest of the catalog.`,
    negativePrompt: "no inconsistent framing, no text, no props",
  }),
  catalog_variant: (ctx) => ({
    prompt: `Same jewellery piece (${ctx.product_type}) on clean white background recoloured to ${ctx.variant_label}. Keep all geometry, framing, lighting and shadow identical to the master shot.`,
    negativePrompt: "no shape changes, no different lighting, no text",
  }),
};
