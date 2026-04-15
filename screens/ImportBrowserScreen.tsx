import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  Image,
  InteractionManager,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import { apiPost } from '../lib/api';
import {
  extractNormalizedTags,
  type TaggingImportContext,
  type TaggingResponse,
} from '../lib/tagging';
import {
  buildExternalItemPayload,
  buildWardrobeInsertPayloadFromExternalItem,
  isExternalItemLike,
} from '../lib/wardrobePayload';
import { insertWardrobeItemWithCompatibility, uploadWardrobeImageBytes } from '../lib/wardrobeStorage';
import { supabase } from '../lib/supabase';
import ViewShot, { captureRef } from 'react-native-view-shot';
import BrowserActionTray from '../components/browser/BrowserActionTray';
import BrowserDrawer from '../components/browser/BrowserDrawer';
import BrowserImagePickerModal from '../components/browser/BrowserImagePickerModal';
import BrowserTopBar from '../components/browser/BrowserTopBar';
import { getActiveStyleCanvasSession, type ActiveStyleCanvasSession } from '../lib/styleCanvasSession';
import { browserItemsToCanvasItems, buildBrowserItemsFromImageUrls } from '../utils/styleCanvasAdapters';



const { width: SCREEN_W } = Dimensions.get('window');

// ---------------- Theme ----------------
const F = {
  bg: '#fafaff',
  text: '#1c1c1c',
  muted: 'rgba(28, 28, 28, 0.72)',
  border: '#daddd8',
  primary: '#1c1c1c',
  card: '#eef0f2',
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
const MAX_IMPORT_QUEUE_ITEMS = 12;
const HTTP_URL_PATTERN = /^https?:\/\//i;
const IP_HOST_PATTERN = /^\d{1,3}(\.\d{1,3}){3}$/;

const devLog = (...args: any[]) => {
  if (__DEV__) {
    console.log(...args);
  }
};

function buildTagImportContext(importMeta: Record<string, any> = {}, sourceImageUrl?: string | null): TaggingImportContext {
  return {
    source_url: importMeta?.source_url ?? importMeta?.product_url ?? null,
    product_url: importMeta?.product_url ?? importMeta?.source_url ?? null,
    source_domain: importMeta?.source_domain ?? null,
    retailer: importMeta?.retailer ?? importMeta?.retailer_name ?? null,
    retailer_name: importMeta?.retailer_name ?? null,
    brand: importMeta?.brand ?? null,
    price: importMeta?.price ?? importMeta?.retail_price ?? null,
    retail_price: importMeta?.retail_price ?? importMeta?.price ?? null,
    currency: importMeta?.currency ?? null,
    source_image_url: sourceImageUrl ?? importMeta?.source_image_url ?? null,
    original_image_url:
      importMeta?.original_image_url ?? sourceImageUrl ?? importMeta?.source_image_url ?? null,
    source_type: importMeta?.source_type ?? null,
    source_id: importMeta?.source_id ?? null,
    external_product_id: importMeta?.external_product_id ?? null,
    source_title: importMeta?.source_title ?? importMeta?.title ?? importMeta?.name ?? null,
  };
}

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

function buildImportQueueMessage(total: number) {
  return `You can queue up to ${MAX_IMPORT_QUEUE_ITEMS} items at once. Using the first ${Math.min(total, MAX_IMPORT_QUEUE_ITEMS)}.`;
}

function capImportQueue(urls: string[], shouldAlert = false) {
  const unique = Array.from(new Set((urls || []).filter(Boolean)));
  if (shouldAlert && unique.length > MAX_IMPORT_QUEUE_ITEMS) {
    Alert.alert('Import limit', buildImportQueueMessage(unique.length));
  }
  return unique.slice(0, MAX_IMPORT_QUEUE_ITEMS);
}

function getBrowserNavigationBlockReason(rawUrl?: string) {
  const nextUrl = String(rawUrl || '').trim();
  if (!nextUrl || nextUrl === 'about:blank' || nextUrl === 'about:srcdoc') return null;
  if (!HTTP_URL_PATTERN.test(nextUrl)) {
    return 'Only standard http(s) pages can be opened in the in-app browser.';
  }

  try {
    const parsed = new URL(nextUrl);
    const hostname = parsed.hostname.toLowerCase();
    const isLocalLike = hostname === 'localhost' || hostname === '127.0.0.1' || IP_HOST_PATTERN.test(hostname);

    if (!__DEV__ && isLocalLike) {
      return 'Local and direct IP hosts are blocked in the production browser.';
    }
  } catch {
    return 'This link could not be parsed.';
  }

  return null;
}

export default function ImportBrowserScreen({ navigation }: any) {
  const route = useRoute<any>();
  const routeInitialUrl = normalizeOrSearch(String(route?.params?.initialUrl || '').trim()) || POPULAR_SITES[0].url;
  // Web state
  const [sourceUrl, setSourceUrl] = useState(routeInitialUrl); 
  const [currentUrl, setCurrentUrl] = useState(routeInitialUrl); // WebView source of truth
const [addressBarText, setAddressBarText] = useState(routeInitialUrl); // what user is typing/seeing
const [isEditingBar, setIsEditingBar] = useState(false);

  const [webLoading, setWebLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const webRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
const [canGoForward, setCanGoForward] = useState(false);


  // Images & modal
  const [webImages, setWebImages] = useState<string[]>([]);
  const [webSelected, setWebSelected] = useState<Record<string, boolean>>({});
  const [webPageMeta, setWebPageMeta] = useState<{
    url?: string;
    product_url?: string;
    domain?: string;
    title?: string;
    price?: number | null;
    currency?: string | null;
    retailer?: string | null;
    retailer_name?: string | null;
    brand?: string | null;
    source_id?: string | null;
    external_product_id?: string | null;
    source_type?: string | null;
  }>({});
  
  // 🔹 NEW: anchor state
  const [anchorImage, setAnchorImage] = useState<string | null>(null);
  const [anchorUrl, setAnchorUrl] = useState<string | null>(null); // which page this anchor came from
  const [showPicker, setShowPicker] = useState(false);
  const [anchorWasCleared, setAnchorWasCleared] = useState(false);
  const [filterProductish, setFilterProductish] = useState(true);
  const selectedList = useMemo(() => Object.keys(webSelected).filter((u) => webSelected[u]), [webSelected]);
  
  const [fabLoading, setFabLoading] = useState(false);
  const [importQueueState, setImportQueueState] = useState<{ completed: number; total: number } | null>(null);
  const [webErrorMessage, setWebErrorMessage] = useState<string | null>(null);
  const [webErrorUrl, setWebErrorUrl] = useState<string | null>(null);
  const [activeBrowserAction, setActiveBrowserAction] = useState<string | null>(null);
  const [activeCanvasSession, setActiveCanvasSession] = useState<ActiveStyleCanvasSession | null>(null);

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerX = useRef(new Animated.Value(-SCREEN_W * 0.8)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const DRAWER_W = Math.min(SCREEN_W * 0.82, 320);
  const screenshotRef = useRef<ViewShot>(null);
  const activeBrowserActionRef = useRef<string | null>(null);

  function closeBrowser() {
    if (navigation?.canGoBack?.()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('MainTabs', { screen: 'Closet' });
  }

  useEffect(() => {
    let mounted = true;

    const refreshActiveCanvas = async () => {
      const session = await getActiveStyleCanvasSession();
      if (mounted) {
        setActiveCanvasSession(session);
      }
    };

    void refreshActiveCanvas();

    const unsubscribe = navigation?.addListener?.('focus', () => {
      void refreshActiveCanvas();
    });

    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, [navigation]);

  useEffect(() => {
    const nextUrl = normalizeOrSearch(String(route?.params?.initialUrl || '').trim());
    if (!nextUrl) return;
    setSourceUrl(nextUrl);
    setCurrentUrl(nextUrl);
    setAddressBarText(nextUrl);
    setWebErrorMessage(null);
    setWebErrorUrl(null);
  }, [route?.params?.initialUrl]);

  
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
        product_url: pageUrl,
        domain: payload.meta?.domain || safeHostname(currentUrl),
        title: payload.meta?.title || undefined,
        price: payload.meta?.price ?? null,
        currency: payload.meta?.currency ?? null,
        retailer: null,
        retailer_name: null,
        brand: null,
        source_id: null,
        external_product_id: null,
        source_type: 'browser_import',
      });

      // 🔹 Anchor for this page = first scraped image
      setAnchorImage(imgs[0] ?? null);
      setAnchorUrl(pageUrl);
      setAnchorWasCleared(false);

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
  const availableBrowserItems = useMemo(
    () =>
      buildBrowserItemsFromImageUrls(filteredImages.length ? filteredImages : webImages, {
        title: webPageMeta.title || null,
        brand: webPageMeta.brand || null,
        retailer: webPageMeta.retailer || webPageMeta.retailer_name || null,
        product_url: webPageMeta.product_url || webPageMeta.url || currentUrl,
        price: webPageMeta.price ?? null,
        currency: webPageMeta.currency ?? null,
      }),
    [
      currentUrl,
      filteredImages,
      webImages,
      webPageMeta.brand,
      webPageMeta.currency,
      webPageMeta.price,
      webPageMeta.product_url,
      webPageMeta.retailer,
      webPageMeta.retailer_name,
      webPageMeta.title,
      webPageMeta.url,
    ]
  );
  const screenshotSourceImages = useMemo(
    () => (selectedList.length ? selectedList : anchorImage ? [anchorImage] : []),
    [selectedList, anchorImage]
  );
  const isBrowserActionBusy = !!activeBrowserAction || !!importQueueState || fabLoading;

  function beginBrowserAction(label: string) {
    if (activeBrowserActionRef.current) {
      Alert.alert('Please wait', `${activeBrowserActionRef.current} is already running.`);
      return false;
    }

    activeBrowserActionRef.current = label;
    setActiveBrowserAction(label);
    return true;
  }

  function endBrowserAction() {
    activeBrowserActionRef.current = null;
    setActiveBrowserAction(null);
  }

  async function runExclusiveBrowserAction(label: string, work: () => Promise<void>) {
    if (!beginBrowserAction(label)) return;

    try {
      await work();
    } finally {
      endBrowserAction();
    }
  }

  function dismissBrowserUi() {
    setShowPicker(false);
  }

  async function openCurrentUrlExternally(rawUrl?: string | null) {
    const targetUrl = String(rawUrl || currentUrl || sourceUrl || '').trim();
    if (!HTTP_URL_PATTERN.test(targetUrl)) {
      Alert.alert('Cannot open link', 'Only standard http(s) pages can be opened externally.');
      return;
    }

    try {
      const supported = await Linking.canOpenURL(targetUrl);
      if (!supported) {
        Alert.alert('Cannot open link', 'This page could not be opened outside the app.');
        return;
      }
      await Linking.openURL(targetUrl);
    } catch (error: any) {
      Alert.alert('Cannot open link', error?.message || 'This page could not be opened outside the app.');
    }
  }

  function navigateFromBrowser(screenName: string, params?: Record<string, any>) {
    const shouldWaitForPickerDismiss = showPicker;
    dismissBrowserUi();

    const performNavigation = () => {
      navigation.navigate(screenName, params);
    };

    if (shouldWaitForPickerDismiss) {
      InteractionManager.runAfterInteractions(() => {
        setTimeout(performNavigation, 220);
      });
      return;
    }

    requestAnimationFrame(performNavigation);
  }

  function navigateToItemVerdict(item: any) {
    if (!item) return;
    const external = isExternalItemLike(item);
    navigateFromBrowser('ItemVerdict', {
      itemId: external ? undefined : item.id,
      item,
      source: 'browser',
      autoSaved: !external && item?.wardrobe_status === 'owned',
    });
  }

  function completeBrowserImportUi() {
    setWebSelected({});
    setShowPicker(false);
  }
  // 🔹 Ensure we always have an anchor when there are images
  useEffect(() => {
    if (!anchorImage && filteredImages.length > 0 && !anchorWasCleared) {
      setAnchorImage(filteredImages[0]);
      setAnchorUrl(webPageMeta.url || currentUrl);
    }
  }, [anchorImage, anchorWasCleared, filteredImages, webPageMeta.url, currentUrl]);

  // Toggle selection
  function toggle(u: string) {
    setWebSelected((p) => {
      const next = { ...p };
      if (next[u]) {
        delete next[u];
        return next;
      }

      if (Object.keys(next).length >= MAX_IMPORT_QUEUE_ITEMS) {
        Alert.alert('Import limit', buildImportQueueMessage(Object.keys(next).length + 1));
        return next;
      }

      next[u] = true;
      return next;
    });
    setAnchorImage(u);
    setAnchorWasCleared(false);
  }
  function selectAll() {
    const next: Record<string, boolean> = {};
    capImportQueue(filteredImages, true).forEach((u) => { next[u] = true; });
    setWebSelected(next);
    if (!anchorImage) {
      const firstSelected = Object.keys(next)[0];
      if (firstSelected) setAnchorImage(firstSelected);
    }
    setAnchorWasCleared(false);
  }
  function clearAll() {
    setWebSelected({});
  }

  // Import helpers (unchanged core)
  function makeImportMeta(method: 'pick' | 'autoscan' | 'screenshot', chosenFirst?: string) {
    return {
      method,
      source_url: webPageMeta.url || currentUrl,
      product_url: webPageMeta.product_url || webPageMeta.url || currentUrl,
      source_domain: webPageMeta.domain || safeHostname(currentUrl) || null,
      retailer: webPageMeta.retailer ?? webPageMeta.retailer_name ?? null,
      retailer_name: webPageMeta.retailer_name ?? null,
      brand: webPageMeta.brand ?? null,
      price: webPageMeta.price ?? null,
      currency: webPageMeta.currency ?? null,
      source_image_url: chosenFirst || null,
      original_image_url: chosenFirst || null,
      source_type: method === 'pick' || method === 'screenshot' || method === 'autoscan' ? 'browser_import' : null,
      source_id: webPageMeta.source_id ?? null,
      external_product_id: webPageMeta.external_product_id ?? null,
      source_title: webPageMeta.title ?? null,
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
async function uploadImageToSupabase(
  uri: string,
  userId: string
): Promise<{ imagePath: string; imageUrl: string | null; accessUrl: string | null }> {
  let workingUri = uri;
  if (/^https?:\/\//i.test(uri)) {
    // leave as is → handled by fetch in bytesFromUri
    workingUri = uri;
  } else {
    // local file (from ImagePicker etc.)
    workingUri = await ensureLocalUri(uri);
  }

  const { bytes, mime, ext } = await bytesFromUri(workingUri);
  return uploadWardrobeImageBytes({
    bytes,
    contentType: mime,
    extension: ext,
    userId,
  });
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

async function getAuthenticatedUserOrThrow() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Not logged in.');
  return user;
}

async function parseApiJsonSafe(response: Response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

async function buildUploadedExternalLockedItem({
  sourceUri,
  userId,
  importMeta,
  fallbackName,
}: {
  sourceUri: string;
  userId: string;
  importMeta: Record<string, any>;
  fallbackName?: string | null;
}) {
  const localUri = HTTP_URL_PATTERN.test(sourceUri) ? await ensureLocalUri(sourceUri) : sourceUri;
  const uploadedImage = await uploadImageToSupabase(localUri, userId);
  const accessUrl = uploadedImage.accessUrl;
  if (!accessUrl) throw new Error('Upload returned null');

  const tagResp = await apiPost('/tag', {
    image_url: accessUrl,
    import_context: buildTagImportContext(importMeta, importMeta?.source_image_url || sourceUri),
  });
  const taggingPayload = (await parseApiJsonSafe(tagResp)) as TaggingResponse;
  const tags = extractNormalizedTags(taggingPayload);
  if (!tagResp.ok || taggingPayload?.error) {
    throw new Error(taggingPayload?.error || 'Tagging failed');
  }

  const sourceSubtype =
    importMeta?.method === 'screenshot'
      ? 'temp_scan'
      : importMeta?.source_type === 'external_link'
        ? 'link_import'
        : 'browser_import';

  return {
    ...buildExternalItemPayload({
      scraped: importMeta,
      tagged: tags,
      normalized: tags,
      uploadedImage,
      sourceSubtype,
      fallbackName: fallbackName || importMeta?.source_title || 'Imported Item',
    }),
    season: normalizeSeason(tags?.season),
  };
}

async function addSelectedForImport({
  listOverride,
}: {
  listOverride?: string[];
} = {}) {
  if (importQueueState) return;

  // Decide what we’re importing
  const rawList =
    listOverride && listOverride.length
      ? listOverride                    // explicit override (FAB anchor)
      : selectedList.length
      ? selectedList                    // manual multi-select from grid
      : anchorImage
      ? [anchorImage]                   // fallback: anchor
      : [];
  const effectiveList = capImportQueue(rawList, rawList.length > MAX_IMPORT_QUEUE_ITEMS);

  devLog('[addSelectedForImport] effectiveList:', effectiveList);

  if (!effectiveList.length) {
    return Alert.alert(
      'No item selected',
      'Tap a product image first so we have an anchor.'
    );
  }

  const formatImportErrorMessage = (message?: string | null) => {
    const rawMessage = String(message || '').trim();
    if (rawMessage.includes('Failed to parse model output')) {
      return 'Could not identify a clean product image from that selection.';
    }
    return rawMessage || 'Import failed.';
  };

  const buildImportSummary = (failures: Array<{ uri: string; message: string }>) => {
    return failures
      .slice(0, 3)
      .map(({ uri, message }) => `${safeHostname(uri) || 'selected image'}: ${message}`)
      .join('\n');
  };

  let successCount = 0;
  const failures: Array<{ uri: string; message: string }> = [];

  try {
    const user = await getAuthenticatedUserOrThrow();
    setImportQueueState({ completed: 0, total: effectiveList.length });

    for (let index = 0; index < effectiveList.length; index += 1) {
      const uri = effectiveList[index];
      try {
        devLog('[Import] Tagging + uploading:', uri);
        const importMeta = makeImportMeta('pick', uri);
        const externalItem = await buildUploadedExternalLockedItem({
          sourceUri: uri,
          userId: user.id,
          importMeta,
          fallbackName: webPageMeta.title || 'Imported Item',
        });

        console.log('[item-source]', {
          sourceType: externalItem?.source_type || 'external',
          sourceSubtype: externalItem?.source_subtype || 'browser_import',
          writingToWardrobe: true,
          action: 'save_to_closet',
        });
        const insertPayload = buildWardrobeInsertPayloadFromExternalItem(externalItem, user.id, {
          wardrobeStatus: 'owned',
          importMethod: 'pick',
          sourceTitleFallback: webPageMeta.title || 'Imported Item',
        });

        const { error: insertError } = await insertWardrobeItemWithCompatibility(insertPayload);
        if (insertError) throw new Error(insertError.message);
        successCount += 1;
      } catch (itemError: any) {
        const failureMessage = formatImportErrorMessage(itemError?.message);
        console.error('❌ Import item failed:', { uri, message: failureMessage });
        failures.push({ uri, message: failureMessage });
      } finally {
        setImportQueueState({ completed: index + 1, total: effectiveList.length });
      }
    }

    if (!successCount && failures.length === 1 && effectiveList.length === 1) {
      let screenshotFallbackError: string | null = null;

      if (screenshotRef?.current) {
        try {
          devLog('Falling back to screenshot for import.');
          const screenshotUri = await captureRef(screenshotRef, {
            format: 'jpg',
            quality: 0.95,
          });
          devLog('Captured screenshot fallback for import.');

          const fallbackImage = await uploadImageToSupabase(screenshotUri, user.id);
          const fallbackUrl = fallbackImage.accessUrl;
          devLog('Uploaded screenshot fallback for import.');
          if (!fallbackUrl) throw new Error('Unable to resolve uploaded screenshot');

          const tagResp = await apiPost('/tag', {
            image_url: fallbackUrl,
            import_context: buildTagImportContext(
              {
                method: 'screenshot',
                source_url: anchorUrl || null,
                product_url: anchorUrl || null,
                source_domain: safeHostname(anchorUrl || currentUrl) || null,
                retailer: webPageMeta.retailer ?? webPageMeta.retailer_name ?? null,
                retailer_name: webPageMeta.retailer_name ?? null,
                brand: webPageMeta.brand ?? null,
                price: webPageMeta.price ?? null,
                currency: webPageMeta.currency ?? null,
                source_image_url: anchorImage || null,
                original_image_url: anchorImage || null,
                source_type: 'browser_import',
                source_id: webPageMeta.source_id ?? null,
                external_product_id: webPageMeta.external_product_id ?? null,
                source_title: webPageMeta.title ?? null,
              },
              anchorImage || fallbackUrl
            ),
          });
          const taggingPayload = (await parseApiJsonSafe(tagResp)) as TaggingResponse;
          const tags = extractNormalizedTags(taggingPayload);
          if (!tagResp.ok || taggingPayload?.error) throw new Error(taggingPayload?.error || 'Tagging failed');

          const externalItem = buildExternalItemPayload({
            scraped: {
              source_url: anchorUrl || null,
              product_url: anchorUrl || null,
              source_domain: safeHostname(anchorUrl || currentUrl) || null,
              retailer: webPageMeta.retailer ?? webPageMeta.retailer_name ?? null,
              retailer_name: webPageMeta.retailer_name ?? null,
              brand: webPageMeta.brand ?? null,
              price: webPageMeta.price ?? null,
              currency: webPageMeta.currency ?? null,
              source_image_url: anchorImage || 'screenshot',
              original_image_url: anchorImage || 'screenshot',
              source_type: 'browser_import',
              source_id: webPageMeta.source_id ?? null,
              external_product_id: webPageMeta.external_product_id ?? null,
              source_title: webPageMeta.title ?? null,
            },
            tagged: tags,
            normalized: tags,
            uploadedImage: fallbackImage,
            sourceSubtype: 'browser_import',
            fallbackName: webPageMeta.title || 'Imported Screenshot',
          });
          console.log('[item-source]', {
            sourceType: externalItem?.source_type || 'external',
            sourceSubtype: externalItem?.source_subtype || 'browser_import',
            writingToWardrobe: true,
            action: 'save_to_closet',
          });
          const fallbackPayload = buildWardrobeInsertPayloadFromExternalItem(externalItem, user?.id ?? '', {
            wardrobeStatus: 'owned',
            importMethod: 'screenshot',
            sourceTitleFallback: webPageMeta.title || 'Imported Screenshot',
          });

          const { error: insertError } = await insertWardrobeItemWithCompatibility(fallbackPayload);
          if (insertError) throw new Error(insertError.message);

          successCount += 1;
          failures.length = 0;
          completeBrowserImportUi();
          Alert.alert('Done', 'Item added to your closet.');
          return;
        } catch (ssErr: any) {
          console.error('❌ Screenshot fallback failed:', ssErr);
          screenshotFallbackError = formatImportErrorMessage(ssErr?.message || 'Screenshot fallback failed.');
        }
      } else {
        console.error('❌ Screenshot ref missing!');
      }

      Alert.alert(
        'Import Error',
        screenshotFallbackError || failures[0]?.message || 'Failed to tag and import item.'
      );
      return;
    }

    if (successCount && !failures.length) {
      completeBrowserImportUi();
      Alert.alert('Done', `${successCount} item(s) added to your closet.`);
      return;
    }

    if (successCount) {
      completeBrowserImportUi();
      Alert.alert(
        'Import complete',
        `${successCount} item(s) added. ${failures.length} failed.${failures.length ? `\n\n${buildImportSummary(failures)}` : ''}`
      );
      return;
    }

    Alert.alert(
      'Import Error',
      failures.length ? buildImportSummary(failures) : 'Failed to tag and import item.'
    );
  } catch (err: any) {
    console.error('❌ Import Error (outer catch):', err);
    Alert.alert('Import Error', formatImportErrorMessage(err?.message || 'Failed to tag and import item.'));
  } finally {
    setImportQueueState(null);
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
    const user = await getAuthenticatedUserOrThrow();
    const src = anchorImage;
    console.log('[item-source]', {
      sourceType: 'external',
      sourceSubtype: 'browser_import',
      writingToWardrobe: false,
      action: 'try_on',
    });
    const importMeta = makeImportMeta('pick', src);
    const lockedItem = await buildUploadedExternalLockedItem({
      sourceUri: src,
      userId: user.id,
      importMeta,
      fallbackName: webPageMeta.title || 'Imported Item',
    });

    // 🔥 Navigate to TryOnScreen for pure try-on around this one item
    navigateFromBrowser('TryOn', {
      mode: 'quick',
      lockedItem,
    });

  } catch (err: any) {
    console.error('❌ TryOnAnchor error:', err);

    // --- Screenshot fallback if direct flow breaks ---
    if (screenshotRef?.current) {
      try {
        devLog('Falling back to screenshot for try-on anchor.');
        const screenshotUri = await captureRef(screenshotRef, {
          format: 'jpg',
          quality: 0.95,
        });
        devLog('Captured screenshot fallback for try-on anchor.');

        const fallbackUser = await getAuthenticatedUserOrThrow();
        const importMeta = {
          ...makeImportMeta('screenshot', anchorImage || 'screenshot'),
          source_image_url: anchorImage || 'screenshot',
        };
        const lockedItem = await buildUploadedExternalLockedItem({
          sourceUri: screenshotUri,
          userId: fallbackUser.id,
          importMeta,
          fallbackName: webPageMeta.title || 'Screenshot Import',
        });

        navigateFromBrowser('TryOn', {
          mode: 'quick',
          lockedItem,
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
  await runExclusiveBrowserAction('Adding to closet', async () => {
    devLog('[Tray] Add to Closet triggered.');

    if (selectedList.length > 0) {
      await addSelectedForImport();
      return;
    }

    if (!anchorImage) {
      Alert.alert(
        'No item selected',
        'Use Scan Page first so we can detect a product image to import.'
      );
      return;
    }

    await addSelectedForImport({ listOverride: [anchorImage] });
  });
}

async function handleGetVerdict() {
  await runExclusiveBrowserAction('Preparing verdict', async () => {
    const selected = selectedList.length ? selectedList : anchorImage ? [anchorImage] : [];
    if (!selected.length) {
      Alert.alert('No item selected', 'Pick one product image first so we can judge it.');
      return;
    }
    if (selected.length !== 1) {
      Alert.alert('Choose one item', 'Get Verdict works on one item at a time.');
      return;
    }
    const user = await getAuthenticatedUserOrThrow();
    const selectedUri = selected[0];

    console.log('[item-source]', {
      sourceType: 'external',
      sourceSubtype: 'browser_import',
      writingToWardrobe: false,
      action: 'verdict',
    });

    try {
      const externalItem = await buildUploadedExternalLockedItem({
        sourceUri: selectedUri,
        userId: user.id,
        importMeta: makeImportMeta('pick', selectedUri),
        fallbackName: webPageMeta.title || 'Imported Item',
      });
      navigateToItemVerdict(externalItem);
      return;
    } catch (itemError: any) {
      console.error('❌ Browser verdict prepare failed:', itemError);
    }

    if (screenshotRef?.current) {
      try {
        const screenshotUri = await captureRef(screenshotRef, {
          format: 'jpg',
          quality: 0.95,
        });
        const externalItem = await buildUploadedExternalLockedItem({
          sourceUri: screenshotUri,
          userId: user.id,
          importMeta: {
            ...makeImportMeta('screenshot', selectedUri),
            source_image_url: selectedUri,
            original_image_url: selectedUri,
          },
          fallbackName: webPageMeta.title || 'Imported Item',
        });
        navigateToItemVerdict(externalItem);
        return;
      } catch (fallbackError: any) {
        console.error('❌ Browser verdict screenshot fallback failed:', fallbackError);
        Alert.alert('Verdict error', fallbackError?.message || 'Could not prepare verdict for this item.');
        return;
      }
    }

    Alert.alert('Verdict error', 'Could not prepare verdict for this item.');
  });
}






async function styleSelected() {
  const chosen = selectedList;
  if (chosen.length !== 1) return Alert.alert('Select exactly one image to style.');
  const anchorUrl = chosen[0];

  try {
    const user = await getAuthenticatedUserOrThrow();
    console.log('[item-source]', {
      sourceType: 'external',
      sourceSubtype: 'browser_import',
      writingToWardrobe: false,
      action: 'style',
    });
    const lockedItem = await buildUploadedExternalLockedItem({
      sourceUri: anchorUrl,
      userId: user.id,
      importMeta: makeImportMeta('pick', anchorUrl),
      fallbackName: webPageMeta.title?.slice(0, 80) ?? 'Imported Item',
    });

    navigateFromBrowser('StyleItemScreen', { item: lockedItem, externalTryOn: true });

  } catch (err: any) {
    console.error('❌ Try-On Tagging Error:', err);

    // --- SCREENSHOT FALLBACK ---
    if (screenshotRef?.current) {
      try {
        devLog('Falling back to screenshot for try-on.');
        const screenshotUri = await captureRef(screenshotRef, {
          format: 'jpg',
          quality: 0.95,
        });
        devLog('Captured screenshot fallback for try-on.');

        const user = await getAuthenticatedUserOrThrow();
        const lockedItem = await buildUploadedExternalLockedItem({
          sourceUri: screenshotUri,
          userId: user.id,
          importMeta: {
            ...makeImportMeta('screenshot', anchorUrl),
            source_image_url: anchorUrl || 'screenshot',
            import_method: 'screenshot',
          },
          fallbackName: 'Screenshot Import',
        });

        navigateFromBrowser('StyleItemScreen', { item: lockedItem, externalTryOn: true });
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

async function handleStyleItem() {
  await runExclusiveBrowserAction('Styling item', async () => {
    if (selectedList.length === 1) {
      await styleSelected();
      return;
    }

    await smartStyleFromCurrentPage();
  });
}

async function handleFindRecommendation() {
  await runExclusiveBrowserAction('Scanning page', async () => {
    await autoscanPage();
  });
}

async function handleTryOnItem() {
  await runExclusiveBrowserAction('Preparing try-on', async () => {
    await tryOnAnchor();
  });
}

async function handleStyleCanvas() {
  await runExclusiveBrowserAction(activeCanvasSession?.canvasId ? 'Continuing style canvas' : 'Opening style canvas', async () => {
    if (!selectedList.length && !activeCanvasSession?.canvasId) {
      Alert.alert('Select items first', 'Select at least one item to start a style canvas.');
      return;
    }

    const selectedBrowserItems = buildBrowserItemsFromImageUrls(selectedList, {
      title: webPageMeta.title || null,
      brand: webPageMeta.brand || null,
      retailer: webPageMeta.retailer || webPageMeta.retailer_name || null,
      product_url: webPageMeta.product_url || webPageMeta.url || currentUrl,
      price: webPageMeta.price ?? null,
      currency: webPageMeta.currency ?? null,
    });

    if (activeCanvasSession?.canvasId) {
      navigateFromBrowser('StyleCanvas', {
        canvasId: activeCanvasSession.canvasId,
        appendItems: browserItemsToCanvasItems(selectedBrowserItems),
        availableBrowserItems,
        origin: 'browser',
        initialTitle: activeCanvasSession.title || (webPageMeta.title ? `${webPageMeta.title} Canvas` : 'Style Canvas'),
      });
      return;
    }

    navigateFromBrowser('StyleCanvas', {
      initialItems: browserItemsToCanvasItems(selectedBrowserItems),
      availableBrowserItems,
      origin: 'browser',
      initialTitle: webPageMeta.title ? `${webPageMeta.title} Canvas` : 'Style Canvas',
    });
  });
}
  async function smartStyleFromCurrentPage() {
    const currentPageUrl = webPageMeta.url || currentUrl;
    if (!currentPageUrl) {
      Alert.alert('No page loaded', 'Open a product page first.');
      return;
    }

    if (fabLoading) return;
    setFabLoading(true);

    try {
      const user = await getAuthenticatedUserOrThrow();
      console.log('[item-source]', {
        sourceType: 'external',
        sourceSubtype: 'browser_import',
        writingToWardrobe: false,
        action: 'style',
      });
      // 1) Ask backend to scan the current page for a product
      const resp = await apiPost('/import/scan', { url: currentPageUrl });
      const data = await parseApiJsonSafe(resp);
      if (!resp.ok) {
        throw new Error(data?.error || `Scan failed (${resp.status})`);
      }
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

      // 2) Upload and tag the hero image through our own storage path
      const lockedItem = await buildUploadedExternalLockedItem({
        sourceUri: anchorUrl,
        userId: user.id,
        importMeta: {
          method: 'autoscan',
          source_url: p.product_url || p.url || currentPageUrl,
          product_url: p.product_url || p.url || currentPageUrl,
          source_domain: p.domain || safeHostname(currentPageUrl),
          retailer: p.retailer || p.retailerName || null,
          retailer_name: p.retailer || p.retailerName || null,
          brand: p.brand ?? null,
          price: p.price ?? null,
          currency: p.currency ?? null,
          source_image_url: anchorUrl,
          original_image_url: anchorUrl,
          source_type: 'browser_import',
          source_id: p.sourceId ?? null,
          external_product_id: p.externalProductId ?? null,
          source_title: p.title || p.name || null,
        },
        fallbackName: (p.title || p.name)?.slice(0, 80) ?? 'Imported Item',
      });

      // 3) Jump straight into your StyleItem screen with this external item
      navigateFromBrowser('StyleItemScreen', {
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
      const resp = await apiPost('/import/scan', { url: current });
      const data = await parseApiJsonSafe(resp);
      if (!resp.ok) throw new Error(data?.error || `Scan failed (${resp.status})`);
      if (!data?.ok || !data?.product) throw new Error(data?.error || 'No product found.');
      const p = data.product;

      const imgs: string[] = Array.from(new Set([...(p.images || []), ...webImages]));
      setWebImages(imgs);
      setWebSelected({});
      setWebPageMeta({
        url: p.product_url || p.url || current,
        product_url: p.product_url || p.url || current,
        domain: p.domain || safeHostname(current),
        title: p.title || p.name || webPageMeta.title,
        price: p.price ?? webPageMeta.price ?? null,
        currency: p.currency ?? webPageMeta.currency ?? null,
        retailer: p.retailer || p.retailerName || webPageMeta.retailer || webPageMeta.retailer_name || null,
        retailer_name: p.retailer || p.retailerName || webPageMeta.retailer_name || null,
        brand: p.brand ?? webPageMeta.brand ?? null,
        source_id: p.sourceId ?? webPageMeta.source_id ?? null,
        external_product_id: p.externalProductId ?? webPageMeta.external_product_id ?? null,
        source_type: 'browser_import',
      });
          // 🔹 NEW: set / refresh anchor for this page
      setAnchorImage(imgs[0] ?? null);
      setAnchorUrl(p.url || current);
      setAnchorWasCleared(false);
      setShowPicker(true);
    } catch (e: any) {
      Alert.alert('Autoscan error', e?.message || 'Failed to scan.');
    }
  }

  function scanPageForCandidates() {
    if (isBrowserActionBusy) return;
    setAnchorWasCleared(false);
    webRef.current?.injectJavaScript(INJECT_SCRAPE);
  }

  function handleRescanTray() {
    if (isBrowserActionBusy) return;
    setShowPicker(false);
    setAnchorWasCleared(false);
    webRef.current?.injectJavaScript(INJECT_SCRAPE);
  }

  function handleChangeTray() {
    if (isBrowserActionBusy) return;
    if (filteredImages.length || webImages.length) {
      setShowPicker(true);
      return;
    }
    setAnchorWasCleared(false);
    webRef.current?.injectJavaScript(INJECT_SCRAPE);
  }

  function handleClearTray() {
    if (isBrowserActionBusy) return;
    setWebSelected({});
    setAnchorImage(null);
    setAnchorUrl(null);
    setAnchorWasCleared(true);
    setShowPicker(false);
  }

  // ---------------- UI ----------------

  return (
    <View style={{ flex: 1, backgroundColor: F.bg }}>
      <BrowserTopBar
        addressBarText={addressBarText}
        onClose={closeBrowser}
        onChangeAddress={setAddressBarText}
        onFocusAddress={() => setIsEditingBar(true)}
        onBlurAddress={() => setIsEditingBar(false)}
        onSubmitAddress={() => {
          const next = normalizeOrSearch(addressBarText);
          if (!next) return;
          setSourceUrl(next);
          setCurrentUrl(next);
          setAddressBarText(next);

          // @ts-ignore
          if (Platform.OS === 'ios') (global as any).Keyboard?.dismiss?.();
        }}
        onOpenDrawer={() => setDrawerOpen(true)}
        onGoBack={() => webRef.current?.goBack()}
        onGoForward={() => webRef.current?.goForward()}
        onReload={() => webRef.current?.reload()}
        canGoBack={canGoBack}
        canGoForward={canGoForward}
        progressAnim={progressAnim}
        webLoading={progress < 1 && webLoading}
      />

      {webErrorMessage ? (
        <View style={styles.webErrorBanner}>
          <View style={styles.webErrorRow}>
            <Text style={styles.webErrorText}>{webErrorMessage}</Text>
            {webErrorUrl && HTTP_URL_PATTERN.test(webErrorUrl) ? (
              <TouchableOpacity
                onPress={() => { void openCurrentUrlExternally(webErrorUrl); }}
                style={styles.webErrorAction}
              >
                <Text style={styles.webErrorActionText}>Open in Browser</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      ) : null}

      <WebView
        ref={webRef}
        source={{ uri: sourceUrl }}
        onShouldStartLoadWithRequest={(request) => {
          const reason = getBrowserNavigationBlockReason(request?.url);
          if (!reason) {
            setWebErrorMessage(null);
            setWebErrorUrl(null);
            return true;
          }

          setWebErrorMessage(reason);
          setWebErrorUrl(request?.url || currentUrl);
          if (request?.url && request.url !== currentUrl) {
            Alert.alert('Blocked link', reason);
          }
          return false;
        }}
        onNavigationStateChange={(nav) => {
          const next = nav?.url;
          if (next) {
            setCurrentUrl(next);
            if (!isEditingBar) setAddressBarText(next);
          }
          setCanGoBack(!!nav?.canGoBack);
          setCanGoForward(!!nav?.canGoForward);
        }}
        onLoadStart={() => {
          setWebLoading(true);
          setProgress(0.05);
          setWebErrorMessage(null);
          setWebErrorUrl(null);
        }}
        onLoadProgress={({ nativeEvent }) => {
          setProgress(Math.max(0.05, nativeEvent.progress || 0));
        }}
        onLoadEnd={() => {
          setProgress(1);
          setTimeout(() => setWebLoading(false), 150);
        }}
        onError={({ nativeEvent }) => {
          setWebLoading(false);
          setWebErrorMessage(nativeEvent?.description || 'This page failed to load in the in-app browser.');
          setWebErrorUrl(nativeEvent?.url || currentUrl);
        }}
        onHttpError={({ nativeEvent }) => {
          setWebLoading(false);
          setWebErrorMessage(`This page returned an error (${nativeEvent?.statusCode || 'unknown'}).`);
          setWebErrorUrl(nativeEvent?.url || currentUrl);
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

      <BrowserActionTray
        busy={isBrowserActionBusy}
        activeAction={activeBrowserAction}
        onScan={scanPageForCandidates}
      />

      <BrowserDrawer
        open={drawerOpen}
        drawerX={drawerX}
        backdropOpacity={backdropOpacity}
        width={DRAWER_W}
        sites={POPULAR_SITES}
        onClose={() => setDrawerOpen(false)}
        onSelectSite={(site) => {
          setDrawerOpen(false);
          setSourceUrl(site.url);
          setCurrentUrl(site.url);
          setAddressBarText(site.url);
        }}
      />

      <BrowserImagePickerModal
        visible={showPicker}
        domain={webPageMeta.domain || null}
        price={webPageMeta.price ?? null}
        currency={webPageMeta.currency ?? null}
        filterProductish={filterProductish}
        isBusy={isBrowserActionBusy}
        filteredImages={filteredImages}
        selectedMap={webSelected}
        selectedCount={selectedList.length}
        hasActiveCanvas={!!activeCanvasSession?.canvasId}
        activeCanvasTitle={activeCanvasSession?.title || null}
        activeAction={activeBrowserAction}
        importQueueState={importQueueState}
        onClose={() => setShowPicker(false)}
        onToggleFilter={() => setFilterProductish((value) => !value)}
        onSelectAll={selectAll}
        onClear={clearAll}
        onToggleImage={toggle}
        onAdd={() => {
          void handleAddToCloset();
        }}
        onVerdict={() => {
          void handleGetVerdict();
        }}
        onStyle={() => {
          void handleStyleItem();
        }}
        onTryOn={() => {
          void handleTryOnItem();
        }}
        onStyleCanvas={() => {
          void handleStyleCanvas();
        }}
      >
        <ViewShot
          ref={screenshotRef}
          options={{ format: 'jpg', quality: 0.95 }}
          style={{
            position: 'absolute',
            top: -9999,
            width: 400,
            height: 400,
            backgroundColor: '#fff',
          }}
        >
          {screenshotSourceImages.map((uri) => (
            <Image
              key={uri}
              source={{ uri }}
              style={{ width: '100%', height: '100%', resizeMode: 'contain' }}
            />
          ))}
        </ViewShot>
      </BrowserImagePickerModal>
    </View>
  );
}

// ---------------- Styles ----------------
const styles = StyleSheet.create({
  webErrorBanner: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#eef0f2',
  },
  webErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  webErrorText: {
    flex: 1,
    color: '#1c1c1c',
    fontSize: 13,
    fontWeight: '500',
  },
  webErrorAction: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#eef0f2',
  },
  webErrorActionText: {
    color: '#1c1c1c',
    fontSize: 12,
    fontWeight: '700',
  },
});
