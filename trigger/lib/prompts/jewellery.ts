export const jewelleryTemplates = {
  marketplace_main: ({ product_type, primary_color }: Record<string, string>) =>
    `Photorealistic product photo of a ${product_type}, centered on pure white background. Soft studio shadow. ${primary_color} should stay true to color. No props, no text, no watermark. Premium e-commerce framing.`,
  hero_lifestyle: ({ product_type, vibe, secondary_color }: Record<string, string>) =>
    `Finished jewellery advertising creative featuring the provided ${product_type} as the hero subject on a ${vibe} surface with muted ${secondary_color} styling. Soft window light, premium props, magazine-quality finish, and calm background blur. Do not make a plain cutout or white-background catalog image.`,
};
