import type { ProductSource } from '../types.js';

export interface ProductSuggestion {
  gtin: string;
  name: string;
  brand: string;
  category: string;
  image_url: string;
  source: ProductSource;
}

/**
 * Resolve a GTIN/EAN-13 against Open Beauty Facts (free, keyless, cosmetics/hygiene
 * oriented — spec §7). Returns null on any failure so manual entry can take over.
 */
export async function lookupGtinExternal(gtin: string): Promise<ProductSuggestion | null> {
  const url =
    `https://world.openbeautyfacts.org/api/v2/product/${encodeURIComponent(gtin)}.json` +
    `?fields=product_name,brands,image_front_url,categories`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Comptoir/0.1 (stock management)' },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      status?: number;
      product?: {
        product_name?: string;
        brands?: string;
        image_front_url?: string;
        categories?: string;
      };
    };

    if (data.status !== 1 || !data.product) return null;
    const p = data.product;
    if (!p.product_name && !p.brands) return null;

    return {
      gtin,
      name: p.product_name?.trim() || '',
      brand: p.brands?.trim() || '',
      category: p.categories?.split(',')[0]?.trim() || '',
      image_url: p.image_front_url?.trim() || '',
      source: 'api',
    };
  } catch {
    return null;
  }
}
