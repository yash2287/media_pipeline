export const fashionTemplates = {
  marketplace_main: ({ product_type }: Record<string, string>) =>
    `Luxury e-commerce shot of ${product_type} on clean white background, color accurate, retail-ready composition, premium fashion studio look.`,
  hero_lifestyle: ({ product_type, vibe }: Record<string, string>) =>
    `Finished fashion campaign creative featuring the provided ${product_type} as the hero subject in a ${vibe} setting, editorial shadows, realistic fabric texture, premium commercial finish, and polished advertising composition. Do not make a plain cutout or white-background catalog image.`,
};
