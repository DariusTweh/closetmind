import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  Image,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import { File, Directory, Paths } from 'expo-file-system/legacy';
import { supabase } from '../lib/supabase';
import ViewShot, { captureRef } from 'react-native-view-shot';



const { width: SCREEN_W } = Dimensions.get('window');

// ---------------- Theme ----------------
const F = {
  bg: '#FFFFFF',
  text: '#111111',
  muted: '#687076',
  border: '#E6E8EB',
  primary: '#0a84ff',
  card: '#F6F7FB',
};

// ---------------- Data ----------------
const POPULAR_SITES: { name: string; url: string; domain: string }[] = [
  // Fast-fashion & basics
  { name: 'ZARA', url: 'https://www.zara.com/us/', domain: 'zara.com' },
  { name: 'H&M', url: 'https://www2.hm.com/en_us/index.html', domain: 'hm.com' },
  { name: 'UNIQLO', url: 'https://www.uniqlo.com/us/en/', domain: 'uniqlo.com' },
  { name: 'Mango', url: 'https://shop.mango.com/us', domain: 'mango.com' },
  { name: 'COS', url: 'https://www.cos.com/en_usd/index.html', domain: 'cos.com' },
  { name: 'Everlane', url: 'https://www.everlane.com/', domain: 'everlane.com' },
  { name: 'Abercrombie', url: 'https://www.abercrombie.com/shop/us', domain: 'abercrombie.com' },
  { name: 'Urban Outfitters', url: 'https://www.urbanoutfitters.com/', domain: 'urbanoutfitters.com' },

  // Sportswear & sneakers
  { name: 'Nike', url: 'https://www.nike.com/w', domain: 'nike.com' },
  { name: 'Adidas', url: 'https://www.adidas.com/us', domain: 'adidas.com' },
  { name: 'Lululemon', url: 'https://shop.lululemon.com/', domain: 'lululemon.com' },
  { name: 'New Balance', url: 'https://www.newbalance.com/', domain: 'newbalance.com' },

  // Outdoor / performance
  { name: 'Patagonia', url: 'https://www.patagonia.com/shop/clothing', domain: 'patagonia.com' },
  { name: 'The North Face', url: 'https://www.thenorthface.com/', domain: 'thenorthface.com' },
  { name: 'Arc’teryx', url: 'https://arcteryx.com/us/en/', domain: 'arcteryx.com' },
  { name: 'REI', url: 'https://www.rei.com/c/clothing', domain: 'rei.com' },

  // Luxury / designer
  { name: 'Mr Porter', url: 'https://www.mrporter.com/en-us/', domain: 'mrporter.com' },
  { name: 'NET-A-PORTER', url: 'https://www.net-a-porter.com/en-us/', domain: 'net-a-porter.com' },
  { name: 'Farfetch', url: 'https://www.farfetch.com/', domain: 'farfetch.com' },
  { name: 'Mytheresa', url: 'https://www.mytheresa.com/en-us/men.html', domain: 'mytheresa.com' },
  { name: 'SSENSE', url: 'https://www.ssense.com/en-us/men', domain: 'ssense.com' },
  { name: 'END.', url: 'https://www.endclothing.com/us', domain: 'endclothing.com' },
  { name: 'Kith', url: 'https://kith.com/', domain: 'kith.com' },

  // Department stores
  { name: 'Nordstrom', url: 'https://www.nordstrom.com/', domain: 'nordstrom.com' },
  { name: 'Bloomingdale’s', url: 'https://www.bloomingdales.com/', domain: 'bloomingdales.com' },
  { name: 'Zappos', url: 'https://www.zappos.com/', domain: 'zappos.com' },

  // Marketplaces
  { name: 'Amazon Fashion', url: 'https://www.amazon.com/fashion', domain: 'amazon.com' },
  { name: 'Target', url: 'https://www.target.com/c/clothing/-/N-5xtd3', domain: 'target.com' },
  { name: 'Walmart', url: 'https://www.walmart.com/cp/clothing/5438', domain: 'walmart.com' },

  // Resale / thrift
  { name: 'Grailed', url: 'https://www.grailed.com/', domain: 'grailed.com' },
  { name: 'Depop', url: 'https://www.depop.com/', domain: 'depop.com' },
  { name: 'Poshmark', url: 'https://poshmark.com/', domain: 'poshmark.com' },
  { name: 'eBay', url: 'https://www.ebay.com/b/Fashion/bn_7000259856', domain: 'ebay.com' },
  { name: 'thredUP', url: 'https://www.thredup.com/', domain: 'thredup.com' },
];

const MIN_PIXELS = 220 * 220;
const MAX_ASPECT = 3.5;

// --------------- Helpers ---------------
function looksLikeUrl(input: string) {
  const t = (input || '').trim().toLowerCase();
  if (!t) return false;

  // already has scheme
  if (/^https?:\/\//i.test(t)) return true;

  // localhost / IP / has a dot domain
  if (t.startsWith('localhost')) return true;
  if (/^\d{1,3}(\.\d{1,3}){3}(:\d+)?(\/.*)?$/.test(t)) return true; // IP
  if (/^[\w-]+\.[\w.-]+/.test(t)) return true; // domain.tld

  return false;
}

function buildSearchUrl(query: string) {
  const q = encodeURIComponent(query.trim());
  // pick one. DuckDuckGo is clean.
  return `https://duckduckgo.com/?q=${q}`;
}

function normalizeOrSearch(input: string): string {
  const trimmed = (input || '').trim();
  if (!trimmed) return '';

  // If it contains spaces and doesn't look like a URL, treat as search
  if (/\s/.test(trimmed) && !looksLikeUrl(trimmed)) {
    return buildSearchUrl(trimmed);
  }

  // If it looks like a URL, normalize
  try {
    if (/^https?:\/\//i.test(trimmed)) return trimmed;

    // domain without scheme
    if (/^[\w-]+\.[\w.-]+/.test(trimmed)) return `https://${trimmed}`;

    // localhost (with optional port/path)
    if (trimmed.startsWith('localhost')) return `http://${trimmed}`;

    // fallback URL constructor
    return new URL(trimmed).toString();
  } catch {
    // last ditch: treat as search
    return buildSearchUrl(trimmed);
  }
}

function safeHostname(url?: string) {
  try { return url ? new URL(url).hostname : undefined } catch { return undefined }
}

export default function ImportBrowserScreen({ navigation }: any) {
  // Web state
  const [sourceUrl, setSourceUrl] = useState(POPULAR_SITES[0].url); 
  const [currentUrl, setCurrentUrl] = useState(POPULAR_SITES[0].url); // WebView source of truth
const [addressBarText, setAddressBarText] = useState(POPULAR_SITES[0].url); // what user is typing/seeing
const [isEditingBar, setIsEditingBar] = useState(false);

  const [webLoading, setWebLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const webRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
const [canGoForward, setCanGoForward] = useState(false);


  // Images & modal
  const [webImages, setWebImages] = useState<string[]>([]);
  const [webSelected, setWebSelected] = useState<Record<string, boolean>>({});
  const [webPageMeta, setWebPageMeta] = useState<{ url?: string; domain?: string; title?: string; price?: number | null; currency?: string | null }>({});
  
  // 🔹 NEW: anchor state
  const [anchorImage, setAnchorImage] = useState<string | null>(null);
  const [anchorUrl, setAnchorUrl] = useState<string | null>(null); // which page this anchor came from
  const [showPicker, setShowPicker] = useState(false);
  const [filterProductish, setFilterProductish] = useState(true);
  const selectedList = useMemo(() => Object.keys(webSelected).filter((u) => webSelected[u]), [webSelected]);
  
  const [fabLoading, setFabLoading] = useState(false);
  const [fabMenuVisible, setFabMenuVisible] = useState(false);

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerX = useRef(new Animated.Value(-SCREEN_W * 0.8)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const DRAWER_W = Math.min(SCREEN_W * 0.82, 320);
  const screenshotRef = useRef<ViewShot>(null);

  
  useEffect(() => {
    if (drawerOpen) {
      Animated.parallel([
        Animated.timing(drawerX, { toValue: 0, duration: 250, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(drawerX, { toValue: -DRAWER_W, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [drawerOpen, drawerX, backdropOpacity, DRAWER_W]);

  // Progress bar animation (width interpolation)
  const progressAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    // When progress updates, animate the bar for smoothness
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 120,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();
  }, [progress, progressAnim]);

  // Injected scraper
  const INJECT_SCRAPE = `
    (function() {
      function abs(u){ try { return new URL(u, location.href).href } catch(e){ return null } }
      const imgNodes = Array.from(document.images || []);
      const metaImgs = Array.from(document.querySelectorAll('meta[property="og:image"], meta[name="twitter:image"], link[rel="image_src"]'))
        .map(n => n.getAttribute('content') || n.getAttribute('href'))
        .filter(Boolean);
      let product = null;
      const ldJson = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
      for (const s of ldJson){
        try {
          const json = JSON.parse(s.textContent || '{}');
          const arr = Array.isArray(json) ? json : [json];
          for (const entry of arr){
            if (entry['@type'] === 'Product') { product = entry; break; }
            if (Array.isArray(entry['@graph'])){
              const p = (entry['@graph'] || []).find(x => x['@type'] === 'Product');
              if (p) { product = p; break; }
            }
          }
          if (product) break;
        } catch(e){}
      }
      function dimsFromNode(img){
        const w = img.naturalWidth || parseInt(img.width)||0;
        const h = img.naturalHeight || parseInt(img.height)||0;
        return { w, h };
      }
      const imgs = imgNodes.map(n => {
        const {w,h} = dimsFromNode(n);
        return { src: n.currentSrc || n.src, w, h };
      })
      .filter(i => i.src && (i.w*i.h) > ${MIN_PIXELS})
      .filter(i => {
        const a = i.w && i.h ? (Math.max(i.w,i.h)/Math.min(i.w,i.h)) : 1;
        return a <= ${MAX_ASPECT};
      })
      .map(i => abs(i.src))
      .filter(Boolean);

      const extra = (product && product.image) ? (Array.isArray(product.image) ? product.image : [product.image]) : [];
      const all = Array.from(new Set([ ...imgs, ...metaImgs.map(abs).filter(Boolean), ...extra.map(abs).filter(Boolean) ]));

      const meta = {
        url: location.href,
        domain: location.hostname,
        title: document.title || null,
        price: (function(){
          try {
            const o = product && (product.offers || (Array.isArray(product.offers) ? product.offers[0] : null));
            const p = o && (o.price || o.lowPrice || o.highPrice);
            return p ? Number(p) : null;
          } catch(e){ return null }
        })(),
        currency: (function(){
          try {
            const o = product && (product.offers || (Array.isArray(product.offers) ? product.offers[0] : null));
            return o && (o.priceCurrency || o.currency) || null;
          } catch(e){ return null }
        })(),
      };

      window.ReactNativeWebView.postMessage(JSON.stringify({ type:'IMAGES', images: all.slice(0, 120), meta }));
    })(); true;`;

  // WebView bridge
const onWebMessage = (event: any) => {
  try {
    const payload = JSON.parse(event?.nativeEvent?.data);
    if (payload?.type === 'IMAGES') {
      const imgs: string[] = Array.from(new Set(payload.images || []));
      setWebImages(imgs);
      setWebSelected({});
      const pageUrl = payload.meta?.url || currentUrl;

      setWebPageMeta({
        url: pageUrl,
        domain: payload.meta?.domain || safeHostname(currentUrl),
        title: payload.meta?.title || undefined,
        price: payload.meta?.price ?? null,
        currency: payload.meta?.currency ?? null,
      });

      // 🔹 Anchor for this page = first scraped image
      setAnchorImage(imgs[0] ?? null);
      setAnchorUrl(pageUrl);

      setShowPicker(true);
    }
  } catch (e) {
    console.error('onWebMessage parse error:', e);
  }
};

  

  // Product-ish filter
  const filteredImages = useMemo(() => {
    if (!filterProductish) return webImages;
    return webImages.filter((u) => {
      const lowered = u.toLowerCase();
      if (lowered.includes('sprite') || lowered.includes('logo') || lowered.includes('icon')) return false;
      if (lowered.includes('thumb') || lowered.includes('placeholder')) return false;
      return true;
    });
  }, [webImages, filterProductish]);
  // 🔹 Ensure we always have an anchor when there are images
  useEffect(() => {
    if (!anchorImage && filteredImages.length > 0) {
      setAnchorImage(filteredImages[0]);
      setAnchorUrl(webPageMeta.url || currentUrl);
    }
  }, [anchorImage, filteredImages, webPageMeta.url, currentUrl]);

  // Toggle selection
  function toggle(u: string) {
    setWebSelected((p) => ({ ...p, [u]: !p[u] }));
    setAnchorImage(u);
  }
  function selectAll() {
    const next: Record<string, boolean> = {};
    filteredImages.forEach((u) => { next[u] = true; });
    setWebSelected(next);
  }
  function clearAll() {
    setWebSelected({});
  }

  // Import helpers (unchanged core)
  function makeImportMeta(method: 'pick' | 'autoscan', chosenFirst?: string) {
    return {
      method,
      source_url: webPageMeta.url || currentUrl,
      source_domain: webPageMeta.domain || safeHostname(currentUrl) || null,
      retailer_name: null,
      brand: null,
      price: webPageMeta.price ?? null,
      currency: webPageMeta.currency ?? null,
      source_image_url: chosenFirst || null,
    };
  }
  function normalizeSeason(input: string): string {
    if (!input) return 'all';
    const s = input.toLowerCase();
    if (s.includes('fall') && s.includes('winter')) return 'fall';
    if (s.includes('spring') && s.includes('summer')) return 'spring';
    if (['spring', 'summer', 'fall', 'winter', 'all'].includes(s)) return s;
    return 'all'; // fallback
  }
  // --- byte helpers ---
function guessMimeFromExt(ext: string) {
  const e = ext.toLowerCase();
  if (e === 'png') return 'image/png';
  if (e === 'webp') return 'image/webp';
  if (e === 'gif') return 'image/gif';
  return 'image/jpeg';
}

// Robust base64 -> Uint8Array (no atob needed)
function base64ToUint8Array(b64: string) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let bufferLength = b64.length * 0.75, len = b64.length, i, p = 0;
  if (b64[b64.length - 1] === '=') bufferLength--;
  if (b64[b64.length - 2] === '=') bufferLength--;
  const bytes = new Uint8Array(bufferLength);
  let encoded1, encoded2, encoded3, encoded4;
  for (i = 0; i < len; i += 4) {
    encoded1 = chars.indexOf(b64[i]);
    encoded2 = chars.indexOf(b64[i + 1]);
    encoded3 = chars.indexOf(b64[i + 2]);
    encoded4 = chars.indexOf(b64[i + 3]);
    bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
    if (encoded3 !== 64) bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    if (encoded4 !== 64) bytes[p++] = ((encoded3 & 3) << 6) | encoded4;
  }
  return bytes;
}
 

// Always produce bytes from a URI (remote https OR local file://)
async function bytesFromUri(uri: string): Promise<{ bytes: Uint8Array; mime: string; ext: string }> {
  if (/^file:\/\//i.test(uri)) {
    // local: read base64 then decode
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) throw new Error('Local file not found');
    const ext = (uri.split('?')[0].split('.').pop() || 'jpg').toLowerCase();
    const mime = guessMimeFromExt(ext);
    const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    const bytes = base64ToUint8Array(b64);
    if (bytes.length === 0) throw new Error('Local file read produced 0 bytes');
    return { bytes, mime, ext };
  } else {
    // remote: fetch ArrayBuffer directly
    const res = await fetch(uri);
    if (!res.ok) throw new Error(`Fetch failed ${res.status}`);
    const ab = await res.arrayBuffer();
    const bytes = new Uint8Array(ab);
    if (bytes.length === 0) throw new Error('Remote fetch produced 0 bytes');
    // try infer ext from URL; mime from header if present
    const ext = (uri.split('?')[0].split('.').pop() || 'jpg').toLowerCase();
    const headerMime = res.headers.get('content-type') || '';
    const mime = headerMime && headerMime.startsWith('image/') ? headerMime : guessMimeFromExt(ext);
    return { bytes, mime, ext };
  }
}
async function uploadImageToSupabase(uri: string): Promise<string> {
  let workingUri = uri;
  if (/^https?:\/\//i.test(uri)) {
    // leave as is → handled by fetch in bytesFromUri
    workingUri = uri;
  } else {
    // local file (from ImagePicker etc.)
    workingUri = await ensureLocalUri(uri);
  }

  const { bytes, mime, ext } = await bytesFromUri(workingUri);

  const fileName = `${Date.now()}_${Math.floor(Math.random() * 1e6)}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('clothes')
    .upload(fileName, bytes, {
      contentType: mime,
      upsert: false,
    });
  if (uploadError) throw new Error(uploadError.message);

  const { data: publicUrlData } = supabase.storage.from('clothes').getPublicUrl(fileName);
  if (!publicUrlData?.publicUrl) throw new Error('Failed to get public URL');

  return publicUrlData.publicUrl;
}
async function ensureLocalUri(uri: string): Promise<string> {
  if (uri.startsWith('file://') || uri.startsWith('/')) {
    return uri;
  }

  const fileName = `import_${Date.now()}.jpg`;
  const dest = FileSystem.cacheDirectory + fileName;

  const downloadRes = await FileSystem.downloadAsync(uri, dest);
  if (!downloadRes || !downloadRes.uri) {
    throw new Error('Failed to download image');
  }

  return downloadRes.uri;
}

async function addSelectedForImport(listOverride?: string[]) {
  // Decide what we’re importing
  const effectiveList =
    listOverride && listOverride.length
      ? listOverride                    // explicit override (FAB anchor)
      : selectedList.length
      ? selectedList                    // manual multi-select from grid
      : anchorImage
      ? [anchorImage]                   // fallback: anchor
      : [];

  console.log('[addSelectedForImport] listOverride:', listOverride);
  console.log('[addSelectedForImport] selectedList:', selectedList);
  console.log('[addSelectedForImport] anchorImage:', anchorImage);
  console.log('[addSelectedForImport] effectiveList:', effectiveList);

  if (!effectiveList.length) {
    return Alert.alert(
      'No item selected',
      'Tap a product image first so we have an anchor.'
    );
  }

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('Not logged in.');

    for (const uri of effectiveList) {
      console.log('[Import] Tagging + uploading:', uri);

      // --- AI tagging ---
      const tagResp = await fetch('http://192.168.0.187:5000/tag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: uri }),
      });

      const raw = (await tagResp.text()).trim();
      const cleaned = raw.replace(/^```(?:json)?\n?|```$/g, '').trim();
      const tags = JSON.parse(cleaned);
      if (tags?.error) throw new Error(tags.error);

      // --- Meta ---
      const importMeta = makeImportMeta('pick', uri);

      // --- Upload attempt ---
      const isRemote = /^https?:\/\//i.test(uri);
      const localUri = isRemote ? await ensureLocalUri(uri) : uri;

      const publicUrl = await uploadImageToSupabase(localUri);
      if (!publicUrl) throw new Error('Upload returned null');

      // --- Insert row ---
      const insertPayload = {
        user_id: user.id,
        name: tags.name || importMeta.retailer_name || 'Imported Item',
        type: tags.type,
        main_category: tags.main_category,
        primary_color: tags.primary_color,
        secondary_colors: tags.secondary_colors || [],
        pattern_description: tags.pattern_description || '',
        vibe_tags: tags.vibe_tags || [],
        season: normalizeSeason(tags.season),
        image_url: publicUrl,
        source_url: importMeta.source_url ?? null,
        source_domain: importMeta.source_domain ?? null,
        retailer_name: importMeta.retailer_name ?? null,
        brand: importMeta.brand ?? (tags?.brand ?? null),
        retail_price: importMeta.price ?? null,
        currency: importMeta.currency ?? null,
        source_image_url: uri,
        import_method: 'pick',
      };

      const { error: insertError } = await supabase
        .from('wardrobe')
        .insert([insertPayload]);
      if (insertError) throw new Error(insertError.message);
    }

    Alert.alert('Done', `${effectiveList.length} item(s) added to your closet.`);
    setShowPicker(false);
    setWebSelected({});
  } catch (err: any) {
    console.error('❌ Import Error (outer catch):', err);

  if (screenshotRef?.current) {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('Not logged in.');
      console.log('⛔ Falling back to screenshot...');
      const screenshotUri = await captureRef(screenshotRef, {
        format: 'jpg',
        quality: 0.95,
      });
      console.log('📸 Screenshot captured at:', screenshotUri);

      const fallbackUrl = await uploadImageToSupabase(screenshotUri);
      console.log('🖼️ Screenshot uploaded to:', fallbackUrl);

      // ✅ Send fallback image to tagger
      const tagResp = await fetch('http://192.168.0.187:5000/tag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: fallbackUrl }),
      });

      const raw = (await tagResp.text()).trim();
      const cleaned = raw.replace(/^```(?:json)?\n?|```$/g, '').trim();
      const tags = JSON.parse(cleaned);
      if (tags?.error) throw new Error(tags.error);

      const fallbackPayload = {
        user_id: user?.id ?? null,
        name: tags.name || 'Imported Screenshot',
        type: tags.type,
        main_category: tags.main_category,
        primary_color: tags.primary_color,
        secondary_colors: tags.secondary_colors || [],
        pattern_description: tags.pattern_description || '',
        vibe_tags: tags.vibe_tags || [],
        season: normalizeSeason(tags.season),
        image_url: fallbackUrl,
        source_url: null,
        source_domain: null,
        retailer_name: null,
        brand: tags?.brand ?? null,
        retail_price: null,
        currency: null,
        source_image_url: 'screenshot',
        import_method: 'screenshot',
      };

      const { error: insertError } = await supabase.from('wardrobe').insert([fallbackPayload]);
      if (insertError) throw new Error(insertError.message);

      Alert.alert('Success', 'Screenshot used and tagged. Added to your closet.');
      return;
    } catch (ssErr) {
      console.error('❌ Screenshot fallback failed:', ssErr);
    }
  } else {
    console.error('❌ Screenshot ref missing!');
  }

  Alert.alert('Import Error', err?.message || 'Failed to tag and import item.');
  }
}

async function tryOnAnchor() {
  if (!anchorImage) {
    Alert.alert(
      'No item selected',
      'Tap a product image first so we know what to try on.'
    );
    return;
  }

  try {
    const src = anchorImage;

    // Build metadata about where this came from
    const importMeta = makeImportMeta('pick', src);

    // Make sure we have a local file we can upload
    const isRemote = /^https?:\/\//i.test(src);
    const localUri = isRemote ? await ensureLocalUri(src) : src;

    // Upload to Supabase so TryOn backend has a stable URL
    const publicUrl = await uploadImageToSupabase(localUri);
    if (!publicUrl) throw new Error('Upload returned null');

        // -----------------------------
    // 🔥 STEP 1.2 — TAG & BUILD LOCKED ITEM
    // -----------------------------
    const tagResp = await fetch(`http://192.168.0.187:5000/tag`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: publicUrl }), // tag the uploaded Supabase image
    });

    const tags = await tagResp.json();
    if (!tagResp.ok || tags?.error) {
      throw new Error(tags?.error || 'Tagging failed');
    }

    // Build the locked item used for styling + try-on
    const lockedItem = {
      id: `ext_${Date.now()}`,
      image_url: publicUrl,
      name: tags.name,
      main_category: tags.main_category,
      type: tags.type,
      primary_color: tags.primary_color,
      secondary_colors: tags.secondary_colors || [],
      pattern_description: tags.pattern_description,
      vibe_tags: tags.vibe_tags || [],
      season: tags.season || 'all',
      meta: importMeta,
    };


    // 🔥 Navigate to TryOnScreen for pure try-on around this one item
    navigation.navigate('TryOn', {
      mode: 'quick',
      lockedItem,
    });

  } catch (err: any) {
    console.error('❌ TryOnAnchor error:', err);

    // --- Screenshot fallback if direct flow breaks ---
    if (screenshotRef?.current) {
      try {
        console.log('⛔ Falling back to screenshot for try-on anchor.');
        const screenshotUri = await captureRef(screenshotRef, {
          format: 'jpg',
          quality: 0.95,
        });
        console.log('📸 Screenshot captured at:', screenshotUri);

        const fallbackUrl = await uploadImageToSupabase(screenshotUri);
        console.log('🖼️ Screenshot uploaded to:', fallbackUrl);

        const importMeta = makeImportMeta('screenshot', fallbackUrl);

        navigation.navigate('TryOn', {
          mode: 'external',
          clothingImageUrl: fallbackUrl,
          sourceImageUrl: null,
          importMeta,
        });

        return;
      } catch (ssErr) {
        console.error('❌ Screenshot fallback for try-on failed:', ssErr);
      }
    }

    Alert.alert(
      'Try-on error',
      err?.message || 'Could not start try-on for this item.'
    );
  }
}
async function handleAddToCloset() {
  console.log('[FAB] handleAddToCloset called');
  console.log('[FAB] selectedList:', selectedList);
  console.log('[FAB] anchorImage:', anchorImage);

  // Respect explicit multi-select first
  if (selectedList.length > 0) {
    await addSelectedForImport();       // uses selectedList
    return;
  }

  // Otherwise: anchor method
  if (!anchorImage) {
    Alert.alert(
      'No item selected',
      'Tap the FAB once to detect a product image, then long-press to add it.'
    );
    return;
  }

  await addSelectedForImport([anchorImage]); // force the anchor
}






async function styleSelected() {
  const chosen = selectedList;
  if (chosen.length !== 1) return Alert.alert('Select exactly one image to style.');
  const anchorUrl = chosen[0];

  try {
    // --- Try tagging original image
    const tagResponse = await fetch('http://192.168.0.187:5000/tag', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: anchorUrl }),
    });

    const raw = (await tagResponse.text()).trim();
    const cleaned = raw.replace(/^```(?:json)?\n?|```$/g, '').trim();
    const tags = JSON.parse(cleaned);
    if (tags?.error) throw new Error(tags.error);

    const lockedItem = {
      id: `ext_${Date.now()}`,
      name: tags?.name || (webPageMeta.title?.slice(0, 80) ?? 'Imported Item'),
      type: tags?.type,
      main_category: tags?.main_category,
      primary_color: tags?.primary_color,
      secondary_colors: tags?.secondary_colors || [],
      pattern_description: tags?.pattern_description || null,
      vibe_tags: tags?.vibe_tags || [],
      season: tags?.season || 'all',
      image_url: anchorUrl,
      meta: makeImportMeta('pick', anchorUrl),
    };

    navigation.navigate('StyleItemScreen', { item: lockedItem, externalTryOn: true });

  } catch (err: any) {
    console.error('❌ Try-On Tagging Error:', err);

    // --- SCREENSHOT FALLBACK ---
    if (screenshotRef?.current) {
      try {
        console.log('⛔ Falling back to screenshot for try-on...');
        const screenshotUri = await captureRef(screenshotRef, {
          format: 'jpg',
          quality: 0.95,
        });
        console.log('📸 Screenshot captured at:', screenshotUri);

        const fallbackUrl = await uploadImageToSupabase(screenshotUri);
        console.log('🖼️ Screenshot uploaded to:', fallbackUrl);

        // Re-run tagging with screenshot URL
        const tagResponse = await fetch('http://192.168.0.187:5000/tag', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_url: fallbackUrl }),
        });

        const raw = (await tagResponse.text()).trim();
        const cleaned = raw.replace(/^```(?:json)?\n?|```$/g, '').trim();
        const tags = JSON.parse(cleaned);
        if (tags?.error) throw new Error(tags.error);

        const lockedItem = {
          id: `ext_${Date.now()}`,
          name: tags?.name || 'Screenshot Import',
          type: tags?.type,
          main_category: tags?.main_category,
          primary_color: tags?.primary_color,
          secondary_colors: tags?.secondary_colors || [],
          pattern_description: tags?.pattern_description || null,
          vibe_tags: tags?.vibe_tags || [],
          season: tags?.season || 'all',
          image_url: fallbackUrl,
          meta: { source_image_url: 'screenshot', import_method: 'screenshot' },
        };

        navigation.navigate('StyleItemScreen', { item: lockedItem, externalTryOn: true });
        return;

      } catch (ssErr) {
        console.error('❌ Screenshot fallback for try-on failed:', ssErr);
        Alert.alert('Fallback Error', ssErr?.message || 'Screenshot tagging failed.');
        return;
      }
    }

    Alert.alert('Try-On error', err?.message || 'Failed to start styling.');
  }
}
  async function smartStyleFromCurrentPage() {
    const currentUrl = webPageMeta.url || currentUrl;
    if (!currentUrl) {
      Alert.alert('No page loaded', 'Open a product page first.');
      return;
    }

    if (fabLoading) return;
    setFabLoading(true);

    try {
      // 1) Ask backend to scan the current page for a product
      const resp = await fetch('http://192.168.0.187:5000/import/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: currentUrl }),
      });

      if (!resp.ok) {
        throw new Error(`Scan failed (${resp.status})`);
      }

      const data = await resp.json();
      if (!data?.ok || !data?.product) {
        throw new Error(data?.error || 'No product found on this page.');
      }

      const p = data.product;
      const images: string[] = Array.from(
        new Set([
          ...(p.images || []),
          ...(Array.isArray(p.image) ? p.image : p.image ? [p.image] : []),
        ])
      );

      const anchorUrl = images[0];
      if (!anchorUrl) {
        throw new Error('No usable product image found.');
      }

      // 2) Tag that hero image using your existing /tag endpoint
      const tagResp = await fetch('http://192.168.0.187:5000/tag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: anchorUrl }),
      });

      const raw = (await tagResp.text()).trim();
      const cleaned = raw.replace(/^```(?:json)?\n?|```$/g, '').trim();
      const tags = JSON.parse(cleaned);

      if (tags?.error) {
        throw new Error(tags.error);
      }

      // 3) Build an external "locked item" object (same shape StyleItemScreen expects)
      const lockedItem = {
        id: `ext_${Date.now()}`,
        name: tags?.name || (p.title?.slice(0, 80) ?? 'Imported Item'),
        type: tags?.type,
        main_category: tags?.main_category,
        primary_color: tags?.primary_color,
        secondary_colors: tags?.secondary_colors || [],
        pattern_description: tags?.pattern_description || null,
        vibe_tags: tags?.vibe_tags || [],
        season: tags?.season || 'all',
        image_url: anchorUrl,
        meta: {
          method: 'autoscan',
          source_url: p.url || currentUrl,
          source_domain: p.domain || safeHostname(currentUrl),
          retailer_name: p.retailer || null,
          brand: tags?.brand ?? p.brand ?? null,
          price: p.price ?? null,
          currency: p.currency ?? null,
          source_image_url: anchorUrl,
        },
      };

      // 4) Jump straight into your StyleItem screen with this external item
      navigation.navigate('StyleItemScreen', {
        item: lockedItem,
        externalTryOn: true,
      });

    } catch (e: any) {
      console.error('❌ smartStyleFromCurrentPage error:', e?.message || e);
      Alert.alert(
        'Smart Style failed',
        e?.message || 'Could not detect and style this product automatically. Try using "Find Images on Page" and selecting an image manually.'
      );
    } finally {
      setFabLoading(false);
    }
  }



  async function autoscanPage() {
    const current = webPageMeta.url || currentUrl;
    try {
      const resp = await fetch('http://192.168.0.187:5000/import/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: current }),
      });
      if (!resp.ok) throw new Error(`Scan failed (${resp.status})`);
      const data = await resp.json();
      if (!data?.ok || !data?.product) throw new Error(data?.error || 'No product found.');
      const p = data.product;

      const imgs: string[] = Array.from(new Set([...(p.images || []), ...webImages]));
      setWebImages(imgs);
      setWebSelected({});
      setWebPageMeta({
        url: p.url || current,
        domain: p.domain || safeHostname(current),
        title: p.title || webPageMeta.title,
        price: p.price ?? webPageMeta.price ?? null,
        currency: p.currency ?? webPageMeta.currency ?? null,
      });
          // 🔹 NEW: set / refresh anchor for this page
      setAnchorImage(imgs[0] ?? null);
      setAnchorUrl(pageUrl);
      setShowPicker(true);
    } catch (e: any) {
      Alert.alert('Autoscan error', e?.message || 'Failed to scan.');
    }
  }

  // ---------------- UI ----------------

  return (
    <View style={{ flex: 1, backgroundColor: F.bg }}>
      {/* Header + URL (SafeArea) */}
      <SafeAreaView style={{ backgroundColor: F.bg }}>
        <View style={styles.topBar}>
  <TouchableOpacity onPress={() => setDrawerOpen(true)} style={styles.iconBtn} accessibilityLabel="Open menu">
    <Text style={{ color: F.text, fontWeight: '700' }}>☰</Text>
  </TouchableOpacity>

  <TextInput
    style={[styles.urlInput, { borderColor: F.border, color: F.text }]}
    value={addressBarText}
    onChangeText={setAddressBarText}
    onFocus={() => setIsEditingBar(true)}
    onBlur={() => setIsEditingBar(false)}
    autoCapitalize="none"
    autoCorrect={false}
    keyboardType={Platform.select({ ios: 'url', android: 'default' })}
    placeholder="Search or enter website"
    placeholderTextColor={F.muted}
    returnKeyType="go"
    onSubmitEditing={() => {
      const next = normalizeOrSearch(addressBarText);
      if (!next) return;
      setSourceUrl(next); 
      setCurrentUrl(next);
      setAddressBarText(next);

      // @ts-ignore
      if (Platform.OS === 'ios') (global as any).Keyboard?.dismiss?.();
    }}
  />

  {/* Right-side browser controls */}
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
    <TouchableOpacity
      onPress={() => webRef.current?.goBack()}
      disabled={!canGoBack}
      style={[styles.iconBtn, { opacity: canGoBack ? 1 : 0.35 }]}
      accessibilityLabel="Back"
    >
      <Text style={{ color: F.text, fontWeight: '700' }}>‹</Text>
    </TouchableOpacity>

    <TouchableOpacity
      onPress={() => webRef.current?.goForward()}
      disabled={!canGoForward}
      style={[styles.iconBtn, { opacity: canGoForward ? 1 : 0.35 }]}
      accessibilityLabel="Forward"
    >
      <Text style={{ color: F.text, fontWeight: '700' }}>›</Text>
    </TouchableOpacity>

    <TouchableOpacity
      onPress={() => webRef.current?.reload()}
      style={styles.iconBtn}
      accessibilityLabel="Reload"
    >
      <Text style={{ color: F.text, fontWeight: '700' }}>↻</Text>
    </TouchableOpacity>
  </View>
</View>


        {/* Safari-style progress bar */}
        <View style={{ height: 2, backgroundColor: '#EFEFEF' }}>
          <Animated.View
            style={{
              height: 2,
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }) as any,
              backgroundColor: F.primary,
              opacity: progress < 1 && webLoading ? 1 : 0,
            }}
          />
        </View>
      </SafeAreaView>

      {/* WebView (no SafeArea) */}
     <WebView
      ref={webRef}
      source={{ uri: sourceUrl  }}
      onNavigationStateChange={(nav) => {
      const next = nav?.url;
      if (next) {
        setCurrentUrl(next);
        if (!isEditingBar) setAddressBarText(next);
      }
      setCanGoBack(!!nav?.canGoBack);
      setCanGoForward(!!nav?.canGoForward);
    }}

  onLoadStart={() => { setWebLoading(true); setProgress(0.05); }}
  onLoadProgress={({ nativeEvent }) => {
    setProgress(Math.max(0.05, nativeEvent.progress || 0));
  }}
  onLoadEnd={() => {
    setProgress(1);
    setTimeout(() => setWebLoading(false), 150);
  }}
  onMessage={onWebMessage}
  javaScriptEnabled
  domStorageEnabled
  setSupportMultipleWindows={false}
  applicationNameForUserAgent="Closana/Importer"
  contentInsetAdjustmentBehavior="never"
  automaticallyAdjustContentInsets={false}
  bounces={false}
  style={{ flex: 1, backgroundColor: F.bg }}
/>

      

    
      {/* 🔵 Floating Action Button */}

      <SafeAreaView
          pointerEvents="box-none"
          style={{ position: 'absolute', bottom: 24, right: 20 }}
        >
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => webRef.current?.injectJavaScript(INJECT_SCRAPE)} // tap = find images
            onLongPress={() => setFabMenuVisible(true)}                    // long press = menu
            delayLongPress={300}
            style={[
              styles.fab,
              anchorImage ? styles.fabAnchored : styles.fabIdle,
            ]}
          >
            {fabLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.fabIcon}>
                {anchorImage ? '✓' : '★'}
              </Text>
            )}
          </TouchableOpacity>
        </SafeAreaView>


      {/* Drawer Backdrop */}
      {/** Tap outside to close */}
      <Animated.View
        pointerEvents={drawerOpen ? 'auto' : 'none'}
        style={[
          StyleSheet.absoluteFillObject,
          { backgroundColor: 'black', opacity: backdropOpacity },
        ]}
      >
        <TouchableOpacity style={{ flex: 1 }} onPress={() => setDrawerOpen(false)} />
      </Animated.View>

      {/* Drawer */}
      <Animated.View
        style={[
          styles.drawer,
          { width: DRAWER_W, transform: [{ translateX: drawerX }] },
        ]}
      >
        <SafeAreaView>
          <Text style={styles.drawerTitle}>Popular</Text>
          
          
<ScrollView
  showsVerticalScrollIndicator={false}
  contentContainerStyle={{ paddingBottom: 24 }}
>
          {POPULAR_SITES.map((s) => (
            <TouchableOpacity
              key={s.name}
              style={styles.drawerItem}
              onPress={() => {
                setDrawerOpen(false);
                setSourceUrl(s.url);
                setCurrentUrl(s.url);
                setAddressBarText(s.url);

              }}
            >
              <View style={styles.faviconCircle}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>
                  {s.name.slice(0, 1)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.siteName}>{s.name}</Text>
                <Text style={styles.siteDomain}>{s.domain}</Text>
              </View>
            </TouchableOpacity>
          ))}
          </ScrollView>
        </SafeAreaView>
      </Animated.View>

      {/* Image Picker Modal */}
      <Modal visible={showPicker} animationType="slide" onRequestClose={() => setShowPicker(false)}>
        <SafeAreaView style={[styles.container, { backgroundColor: F.bg }]}>
          <View style={[styles.modalHeader, { borderBottomColor: F.border }]}>
            <Text style={styles.modalHeaderTitle}>Found Images</Text>
            <Text style={[styles.modalHeaderSub, { color: F.muted }]}>
              {webPageMeta.domain ? `From ${webPageMeta.domain}` : 'Picked images'}
              {webPageMeta.price != null ? ` · ${webPageMeta.currency || ''}${webPageMeta.price}` : ''}
            </Text>
          </View>

          <View style={styles.controlsRow}>
            <TouchableOpacity onPress={() => setFilterProductish((v) => !v)} style={[styles.controlBtn, { backgroundColor: F.card }]}>
              <Text style={{ color: F.text }}>{filterProductish ? 'Filter: On' : 'Filter: Off'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={selectAll} style={[styles.controlBtn, { backgroundColor: F.card }]}>
              <Text style={{ color: F.text }}>Select All</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={clearAll} style={[styles.controlBtn, { backgroundColor: F.card }]}>
              <Text style={{ color: F.text }}>Clear</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
            <TouchableOpacity onPress={() => setShowPicker(false)} style={styles.doneBtn}>
              <Text style={[styles.doneBtnText, { color: F.primary }]}>Done</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.grid}>
            {filteredImages.map((u) => (
              <TouchableOpacity key={u} onPress={() => toggle(u)} style={styles.gridItem}>
                <View style={[styles.imageCard, { borderColor: webSelected[u] ? F.primary : F.border }]}>
                  <Image source={{ uri: u }} style={styles.image} />
                </View>
                <View style={[styles.badge, { backgroundColor: webSelected[u] ? F.primary : 'rgba(0,0,0,0.45)' }]}>
                  <Text style={styles.badgeText}>{webSelected[u] ? '✓' : '+'}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {/* Hidden ViewShot for screenshot fallback */}
          <ViewShot
            ref={screenshotRef}
            options={{ format: 'jpg', quality: 0.95 }}
            style={{
              position: 'absolute',
              top: -9999, // hide off-screen
              width: 400,
              height: 400,
              backgroundColor: '#fff',
            }}
          >
            {selectedList.map((uri) => (
              <Image
                key={uri}
                source={{ uri }}
                style={{ width: '100%', height: '100%', resizeMode: 'contain' }}
              />
            ))}
          </ViewShot>

          <View style={[styles.stickyBar, { borderTopColor: F.border, backgroundColor: F.bg }]}>
            <View style={styles.row}>
              <TouchableOpacity onPress={addSelectedForImport} style={[styles.primaryBtn, { backgroundColor: F.primary }]}>
                <Text style={styles.btnTextWhite}>Add {selectedList.length || ''} to Closet</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={styleSelected} style={[styles.outlineBtn, { borderColor: F.border }]}>
                <Text style={[styles.btnText, { color: F.text }]}>Style 1</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.tipText, { color: F.muted }]}>Tip: pick multiple to import or pick one to style before saving.</Text>
          </View>
        </SafeAreaView>
      </Modal>

      {/* FAB Menu Modal */}
      {/* FAB Action Menu */}
      <Modal
        visible={fabMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFabMenuVisible(false)}
      >
        <View style={styles.menuBackdrop}>
          {/* Tap outside to close */}
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setFabMenuVisible(false)} />

          <View style={styles.menuCard}>
            <Text style={styles.menuTitle}>What do you want to do?</Text>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={async () => {
                setFabMenuVisible(false);
                await tryOnAnchor();
              }}
            >
              <Text style={styles.menuItemText}>Try On</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={async () => {
                setFabMenuVisible(false);
                await handleStyleItem();
              }}
            >
              <Text style={styles.menuItemText}>Style Item</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={async () => {
                setFabMenuVisible(false);
                await handleFindRecommendation();
              }}
            >
              <Text style={styles.menuItemText}>Find Recommendation</Text>
            </TouchableOpacity>

            <TouchableOpacity
  style={[styles.menuItem, { borderBottomWidth: 0 }]}
  onPress={async () => {
    try {
      setFabMenuVisible(false);
      setFabLoading(true);

      console.log('[FAB] Add to Closet pressed');
      await handleAddToCloset();
      console.log('[FAB] Add to Closet finished');
    } catch (e) {
      console.error('❌ FAB Add to Closet error:', e);
    } finally {
      setFabLoading(false);
    }
  }}
>
  <Text style={styles.menuItemText}>Add to Closet</Text>
</TouchableOpacity>

          </View>
        </View>
      </Modal>
     
    </View>
  );
}

// ---------------- Styles ----------------
const styles = StyleSheet.create({
  container: { flex: 1 },

  topBar: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 12,
  paddingTop: 8,
  paddingBottom: 8,
  gap: 8,
  flexWrap: 'nowrap',
},

  iconBtn: {
  paddingHorizontal: 10,
  paddingVertical: 8,
  borderRadius: 10,
  borderWidth: 1,
  borderColor: F.border,
  backgroundColor: 'rgba(0,0,0,0.04)', // subtle so you can see it
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 34,
},
urlInput: {
  flex: 1,
  borderWidth: 1,
  borderRadius: 10,
  paddingHorizontal: 12,
  height: 40,
  minWidth: 0, // ✅ important on some layouts so it can shrink
},


  bottomBar: { padding: 12, gap: 8 },
  row: { flexDirection: 'row', gap: 8 },
  findBtn: { flex: 1, padding: 12, borderRadius: 10, },
  outlineBtn: { padding: 12, backgroundColor: '#fff', borderWidth: 1, borderRadius: 10 },

  btnTextWhite: { color: 'white', textAlign: 'center', fontWeight: '700' },
  btnText: { textAlign: 'center', fontWeight: '600' },

  // Drawer
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#fff',
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 12,
    paddingHorizontal: 14,
  },
  drawerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: F.text,
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: 12,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: F.border,
    gap: 12,
  },
  faviconCircle: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#111',
    alignItems: 'center', justifyContent: 'center',
  },
  siteName: { color: F.text, fontWeight: '600' },
  siteDomain: { color: F.muted, fontSize: 12 },
    fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: F.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 6,
  },
  
    fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: F.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 6,
  },
  fabIcon: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  fabIdle: {
  backgroundColor: F.primary, // default look
},

fabAnchored: {
  backgroundColor: '#22c55e', // or whatever “locked” color you like
},

  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  menuCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: F.text,
    marginBottom: 8,
  },
  menuItem: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: F.border,
  },
  menuItemText: {
    fontSize: 15,
    color: F.text,
  },



  // Modal
  modalHeader: { padding: 12, borderBottomWidth: 1 },
  modalHeaderTitle: { color: F.text, fontSize: 18, fontWeight: '700' },
  modalHeaderSub: { marginTop: 4 },

  controlsRow: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 4, flexDirection: 'row', alignItems: 'center', gap: 8 },
  controlBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12 },
  doneBtn: { paddingVertical: 8, paddingHorizontal: 12 },
  doneBtnText: { fontWeight: '600' },

  grid: { padding: 12, flexDirection: 'row', flexWrap: 'wrap' },
  gridItem: { width: '31.5%', marginRight: '2.75%', marginBottom: 12 },
  imageCard: { borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: F.border },
  image: { width: '100%', aspectRatio: 1 },
  badge: {
    position: 'absolute', top: 6, right: 6,
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { color: 'white', fontWeight: '700' },

  stickyBar: { padding: 12, borderTopWidth: 1, borderTopColor: F.border },
  primaryBtn: { flex: 1, padding: 14, borderRadius: 12 },
  tipText: { marginTop: 8, textAlign: 'center' },
});
