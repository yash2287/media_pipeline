import { catalogPack } from "./catalog";
import { marketplacePack } from "./marketplace";
import { premiumPack } from "./premium";
import { socialPack } from "./social";
import type { PackSlot } from "./types";

export const packSpecs: Record<string, PackSlot[]> = {
  marketplace: marketplacePack,
  social: socialPack,
  premium: premiumPack,
  catalog: catalogPack,
};

export type { PackSlot } from "./types";

export function resolvePackSlots(
  packType: string,
  targetMarketplaces: string[] = [],
): PackSlot[] {
  const spec = packSpecs[packType] ?? marketplacePack;
  if (!targetMarketplaces?.length) return spec;
  return spec.filter(
    (slot) => !slot.marketplace || slot.marketplace === "any" || targetMarketplaces.includes(slot.marketplace),
  );
}
