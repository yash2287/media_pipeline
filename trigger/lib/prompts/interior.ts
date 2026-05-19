export const interiorTemplates = {
  marketplace_main: ({ product_type }: Record<string, string>) =>
    `Premium catalog product image of ${product_type} on white background, front-facing, balanced lighting, shadow grounded, no props.`,
  hero_lifestyle: ({ product_type, vibe }: Record<string, string>) =>
    `Finished interior advertising creative with the provided ${product_type} as the hero subject in a ${vibe} room scene, natural daylight, restrained styling, premium homeware look, and polished editorial composition. Do not make a plain cutout or white-background catalog image.`,
};
