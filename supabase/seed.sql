insert into prompt_templates (industry, slot, prompt_template, model_id, default_params)
values
  ('jewellery', 'marketplace_main', 'Photorealistic product photo of a {product_type}, centered on pure white background. Soft studio lighting, subtle grounded shadow, no props, no watermark.', 'gpt-image-1.5', '{"quality":"medium","size":"1024x1024"}'),
  ('jewellery', 'hero_lifestyle', 'Editorial lifestyle photograph of a {product_type} with {vibe} styling, muted palette, window light, premium jewellery counter aesthetic.', 'gpt-image-1.5', '{"quality":"high","size":"1536x1024"}'),
  ('food', 'marketplace_main', 'Commercial studio product image of {product_type} on clean white background with accurate color and appetizing texture.', 'gpt-image-1.5', '{"quality":"medium","size":"1024x1024"}'),
  ('food', 'hero_lifestyle', 'Editorial tabletop scene with {product_type}, {vibe} styling, natural shadow, restaurant-grade plating direction.', 'gpt-image-1.5', '{"quality":"high","size":"1536x1024"}'),
  ('interior', 'marketplace_main', 'Catalog-ready product image of {product_type} on pure white background with realistic grounding shadow and balanced light.', 'gpt-image-1.5', '{"quality":"medium","size":"1024x1024"}'),
  ('interior', 'hero_lifestyle', 'Editorial homeware scene with {product_type} in a {vibe} room composition, daylight, restrained modern styling.', 'gpt-image-1.5', '{"quality":"high","size":"1536x1024"}'),
  ('fashion', 'marketplace_main', 'Premium e-commerce image of {product_type} on white background, accurate texture, sharp edges, luxury studio framing.', 'gpt-image-1.5', '{"quality":"medium","size":"1024x1024"}'),
  ('fashion', 'hero_lifestyle', 'Campaign-grade lifestyle image featuring {product_type} in a {vibe} setting, editorial shadows, premium retail finish.', 'gpt-image-1.5', '{"quality":"high","size":"1536x1024"}')
on conflict do nothing;