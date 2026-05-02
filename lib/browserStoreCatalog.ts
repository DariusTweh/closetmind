import type { BrowserStoreGroup, CuratedBrowserStore } from '../types/browserStores';

export const BROWSER_STORE_GROUP_ORDER: BrowserStoreGroup[] = ['Popular', 'Sportswear', 'Luxury', 'Resale'];

export const CURATED_BROWSER_STORES: CuratedBrowserStore[] = [
  { key: 'zara', name: 'ZARA', url: 'https://www.zara.com/us/', domain: 'zara.com', group: 'Popular' },
  { key: 'hm', name: 'H&M', url: 'https://www2.hm.com/en_us/index.html', domain: 'hm.com', group: 'Popular' },
  { key: 'uniqlo', name: 'UNIQLO', url: 'https://www.uniqlo.com/us/en/', domain: 'uniqlo.com', group: 'Popular' },
  { key: 'mango', name: 'Mango', url: 'https://shop.mango.com/us', domain: 'mango.com', group: 'Popular' },
  { key: 'cos', name: 'COS', url: 'https://www.cos.com/en_usd/index.html', domain: 'cos.com', group: 'Popular' },
  { key: 'everlane', name: 'Everlane', url: 'https://www.everlane.com/', domain: 'everlane.com', group: 'Popular' },
  { key: 'abercrombie', name: 'Abercrombie', url: 'https://www.abercrombie.com/shop/us', domain: 'abercrombie.com', group: 'Popular' },
  { key: 'urban_outfitters', name: 'Urban Outfitters', url: 'https://www.urbanoutfitters.com/', domain: 'urbanoutfitters.com', group: 'Popular' },
  { key: 'amazon_fashion', name: 'Amazon Fashion', url: 'https://www.amazon.com/fashion', domain: 'amazon.com', group: 'Popular' },
  { key: 'target', name: 'Target', url: 'https://www.target.com/c/clothing/-/N-5xtd3', domain: 'target.com', group: 'Popular' },
  { key: 'walmart', name: 'Walmart', url: 'https://www.walmart.com/cp/clothing/5438', domain: 'walmart.com', group: 'Popular' },

  { key: 'nike', name: 'Nike', url: 'https://www.nike.com/w', domain: 'nike.com', group: 'Sportswear' },
  { key: 'adidas', name: 'Adidas', url: 'https://www.adidas.com/us', domain: 'adidas.com', group: 'Sportswear' },
  { key: 'lululemon', name: 'Lululemon', url: 'https://shop.lululemon.com/', domain: 'lululemon.com', group: 'Sportswear' },
  { key: 'new_balance', name: 'New Balance', url: 'https://www.newbalance.com/', domain: 'newbalance.com', group: 'Sportswear' },
  { key: 'the_north_face', name: 'The North Face', url: 'https://www.thenorthface.com/', domain: 'thenorthface.com', group: 'Sportswear' },
  { key: 'patagonia', name: 'Patagonia', url: 'https://www.patagonia.com/shop/clothing', domain: 'patagonia.com', group: 'Sportswear' },
  { key: 'arcteryx', name: 'Arc’teryx', url: 'https://arcteryx.com/us/en/', domain: 'arcteryx.com', group: 'Sportswear' },
  { key: 'rei', name: 'REI', url: 'https://www.rei.com/c/clothing', domain: 'rei.com', group: 'Sportswear' },

  { key: 'mr_porter', name: 'Mr Porter', url: 'https://www.mrporter.com/en-us/', domain: 'mrporter.com', group: 'Luxury' },
  { key: 'net_a_porter', name: 'NET-A-PORTER', url: 'https://www.net-a-porter.com/en-us/', domain: 'net-a-porter.com', group: 'Luxury' },
  { key: 'farfetch', name: 'Farfetch', url: 'https://www.farfetch.com/', domain: 'farfetch.com', group: 'Luxury' },
  { key: 'mytheresa', name: 'Mytheresa', url: 'https://www.mytheresa.com/en-us/men.html', domain: 'mytheresa.com', group: 'Luxury' },
  { key: 'ssense', name: 'SSENSE', url: 'https://www.ssense.com/en-us/men', domain: 'ssense.com', group: 'Luxury' },
  { key: 'kith', name: 'Kith', url: 'https://kith.com/', domain: 'kith.com', group: 'Luxury' },
  { key: 'end', name: 'END.', url: 'https://www.endclothing.com/us', domain: 'endclothing.com', group: 'Luxury' },
  { key: 'nordstrom', name: 'Nordstrom', url: 'https://www.nordstrom.com/', domain: 'nordstrom.com', group: 'Luxury' },
  { key: 'bloomingdales', name: 'Bloomingdale’s', url: 'https://www.bloomingdales.com/', domain: 'bloomingdales.com', group: 'Luxury' },
  { key: 'zappos', name: 'Zappos', url: 'https://www.zappos.com/', domain: 'zappos.com', group: 'Luxury' },

  { key: 'grailed', name: 'Grailed', url: 'https://www.grailed.com/', domain: 'grailed.com', group: 'Resale' },
  { key: 'depop', name: 'Depop', url: 'https://www.depop.com/', domain: 'depop.com', group: 'Resale' },
  { key: 'poshmark', name: 'Poshmark', url: 'https://poshmark.com/', domain: 'poshmark.com', group: 'Resale' },
  { key: 'ebay', name: 'eBay', url: 'https://www.ebay.com/b/Fashion/bn_7000259856', domain: 'ebay.com', group: 'Resale' },
  { key: 'thredup', name: 'thredUP', url: 'https://www.thredup.com/', domain: 'thredup.com', group: 'Resale' },
];

export const CURATED_BROWSER_STORE_MAP = new Map(
  CURATED_BROWSER_STORES.map((store) => [store.key, store] as const),
);

export function normalizeBrowserStoreUrl(rawValue: string) {
  const trimmed = String(rawValue || '').trim();
  if (!trimmed) return null;

  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(withScheme);
    if (!/^https?:$/i.test(parsed.protocol)) return null;
    const hostname = parsed.hostname.replace(/^www\./i, '').toLowerCase();
    if (!hostname) return null;
    return `https://${hostname}/`;
  } catch {
    return null;
  }
}

export function deriveBrowserStoreDomain(rawUrl: string) {
  const normalized = normalizeBrowserStoreUrl(rawUrl);
  if (!normalized) return null;

  try {
    return new URL(normalized).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return null;
  }
}

export function deriveBrowserStoreName(rawUrl: string) {
  const domain = deriveBrowserStoreDomain(rawUrl);
  if (!domain) return null;
  const root = domain.split('.').slice(0, -1).join('.') || domain.split('.')[0] || domain;
  return root
    .split(/[-_.]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}
