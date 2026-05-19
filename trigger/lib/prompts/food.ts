export const foodTemplates = {
  marketplace_main: ({ product_type }: Record<string, string>) =>
    `Commercial studio photograph of ${product_type} on clean white background with appetizing but natural color balance.`,
  hero_lifestyle: ({ product_type, vibe }: Record<string, string>) =>
    `Finished social media food creative featuring the provided ${product_type} as the hero subject in a ${vibe} tabletop scene. Add appetizing props, sauce detail, realistic steam, soft directional light, restaurant-grade styling, and a polished advertising composition. Do not make a plain cutout or white-background catalog image.`,
};
