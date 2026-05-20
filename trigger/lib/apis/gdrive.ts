import JSZip from "jszip";
import { generateSocialCaption } from "./openai-image";
import { resolveAssetUrl, uploadBuffer } from "../state";

type FinalAsset = {
  id: string;
  sku_id: string;
  storage_path: string;
  width?: number | null;
  height?: number | null;
  mime_type?: string | null;
  metadata?: Record<string, unknown> | null;
  qa_score?: number | null;
};

type CompanionAsset = {
  id: string;
  sku_id: string;
  storage_path: string;
  metadata?: Record<string, unknown> | null;
};

async function fetchAssetBuffer(storagePath: string) {
  const signedUrl = await resolveAssetUrl(storagePath);
  const response = await fetch(signedUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch delivery asset ${storagePath}: ${response.status} ${response.statusText}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

function fileName(storagePath: string) {
  return storagePath.split("/").at(-1) || "asset.bin";
}

function marketplaceFolder(metadata: Record<string, unknown> | null | undefined) {
  const mp = String(metadata?.marketplace ?? "").trim();
  if (!mp || mp === "any") return "Universal";
  // Title-case for folder display
  return mp[0]?.toUpperCase() + mp.slice(1);
}

function csvEscape(value: string | number | null | undefined) {
  const str = value == null ? "" : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildAmazonCsv(assets: FinalAsset[]) {
  const header = [
    "sku",
    "image_intent",
    "image_filename",
    "width",
    "height",
    "qa_score",
  ];
  const rows = assets
    .filter((a) => String(a.metadata?.marketplace ?? "") === "amazon")
    .map((a) =>
      [
        csvEscape(a.sku_id),
        csvEscape(String(a.metadata?.intent ?? "")),
        csvEscape(fileName(a.storage_path)),
        csvEscape(a.width ?? ""),
        csvEscape(a.height ?? ""),
        csvEscape(a.qa_score ?? ""),
      ].join(","),
    );
  if (!rows.length) return null;
  return `${header.join(",")}\n${rows.join("\n")}`;
}

function buildShopifyCsv(assets: FinalAsset[]) {
  const header = [
    "Handle",
    "Title",
    "Image Src",
    "Image Position",
    "Image Alt Text",
    "Variant SKU",
  ];
  const grouped = new Map<string, FinalAsset[]>();
  for (const a of assets.filter((a) => String(a.metadata?.marketplace ?? "") === "shopify")) {
    const arr = grouped.get(a.sku_id) ?? [];
    arr.push(a);
    grouped.set(a.sku_id, arr);
  }
  if (!grouped.size) return null;
  const rows: string[] = [];
  for (const [sku, list] of grouped) {
    list.forEach((a, idx) => {
      rows.push(
        [
          csvEscape(sku.toLowerCase()),
          csvEscape(`Product ${sku}`),
          csvEscape(fileName(a.storage_path)),
          csvEscape(idx + 1),
          csvEscape(String(a.metadata?.intent ?? "")),
          csvEscape(sku),
        ].join(","),
      );
    });
  }
  return `${header.join(",")}\n${rows.join("\n")}`;
}

function buildEtsyCsv(assets: FinalAsset[]) {
  const header = ["title", "image_filename", "tags"];
  const rows = assets
    .filter((a) => String(a.metadata?.marketplace ?? "") === "etsy")
    .map((a) =>
      [
        csvEscape(`SKU ${a.sku_id}`),
        csvEscape(fileName(a.storage_path)),
        csvEscape(String(a.metadata?.intent ?? "")),
      ].join(","),
    );
  if (!rows.length) return null;
  return `${header.join(",")}\n${rows.join("\n")}`;
}

function buildManifest(assets: FinalAsset[]) {
  return JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      count: assets.length,
      assets: assets.map((a) => ({
        skuId: a.sku_id,
        slot: String(a.metadata?.slot ?? ""),
        intent: String(a.metadata?.intent ?? ""),
        marketplace: String(a.metadata?.marketplace ?? "any"),
        width: a.width,
        height: a.height,
        qaScore: a.qa_score,
        path: a.storage_path,
        filename: fileName(a.storage_path),
      })),
    },
    null,
    2,
  );
}

export async function createDeliveryBundle(opts: {
  projectId: string;
  assets: FinalAsset[];
  companionAssets?: CompanionAsset[];
  brandName?: string;
  productTypeBySku?: Record<string, string>;
  brief?: {
    hook?: string;
    cta?: string;
    tone?: string[];
    captionAutoGen?: boolean;
    generateListingCsv?: boolean;
  };
}) {
  if (opts.assets.length === 0) {
    throw new Error("No final assets available to include in the delivery bundle.");
  }

  const zip = new JSZip();

  // ----- Per-marketplace folders -----
  for (const asset of opts.assets) {
    const folder = marketplaceFolder(asset.metadata);
    const buffer = await fetchAssetBuffer(asset.storage_path);
    zip.folder(folder)?.file(fileName(asset.storage_path), buffer);
  }

  // ----- Companions -----
  for (const companion of opts.companionAssets ?? []) {
    const folder = `${marketplaceFolder(companion.metadata)}/_alt-formats`;
    const buffer = await fetchAssetBuffer(companion.storage_path);
    zip.folder(folder)?.file(fileName(companion.storage_path), buffer);
  }

  // ----- Captions for social ----
  if (opts.brief?.captionAutoGen) {
    const socialAssets = opts.assets.filter((a) => {
      const mp = String(a.metadata?.marketplace ?? "");
      return ["instagram", "pinterest", "linkedin", "tiktok"].includes(mp);
    });
    for (const asset of socialAssets) {
      try {
        const caption = await generateSocialCaption({
          brandName: opts.brandName ?? "the brand",
          productType: opts.productTypeBySku?.[asset.sku_id] ?? "product",
          tone: (opts.brief?.tone ?? []).join(", "),
          hook: opts.brief?.hook ?? "",
          cta: opts.brief?.cta ?? "",
          marketplace: String(asset.metadata?.marketplace ?? "instagram"),
        });
        const folder = marketplaceFolder(asset.metadata);
        const baseName = fileName(asset.storage_path).replace(/\.[^.]+$/, "");
        zip
          .folder(folder)
          ?.file(
            `${baseName}.caption.txt`,
            `${caption.caption}\n\n${caption.hashtags.join(" ")}\n\nAlt: ${caption.alt_text}\n`,
          );
      } catch (err) {
        console.warn("Caption generation failed for", asset.sku_id, err);
      }
    }
  }

  // ----- Listing CSVs -----
  if (opts.brief?.generateListingCsv !== false) {
    const amazon = buildAmazonCsv(opts.assets);
    const shopify = buildShopifyCsv(opts.assets);
    const etsy = buildEtsyCsv(opts.assets);
    if (amazon) zip.file("Amazon/_amazon_listing.csv", amazon);
    if (shopify) zip.file("Shopify/_shopify_products.csv", shopify);
    if (etsy) zip.file("Etsy/_etsy_listings.csv", etsy);
  }

  // ----- Manifest -----
  zip.file("manifest.json", buildManifest(opts.assets));

  const archive = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  const storagePath = `${opts.projectId}/deliveries/${Date.now()}-approved-pack.zip`;
  await uploadBuffer(storagePath, archive, "application/zip");
  const shareUrl = await resolveAssetUrl(storagePath, 7 * 24 * 60 * 60);

  return {
    provider: "supabase-storage",
    bundlePath: storagePath,
    folderId: storagePath,
    shareUrl,
    count: opts.assets.length,
  };
}
