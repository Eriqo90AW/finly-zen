/**
 * Persistent Ticker Logo Cache & Image Preloader
 * 
 * Provides 0ms synchronous retrieval of asset ticker logos from memory and localStorage,
 * with background preloading to eliminate blank flashes and network waterfall delays.
 */

const STORAGE_KEY = "finly_zen_ticker_logos";

// In-memory logo URL map (ticker -> logoUrl)
const memoryCache = new Map<string, string>();

// Set of fully loaded/decoded image URLs in browser memory
const preloadedImageUrls = new Set<string>();

// Initialize cache from localStorage on startup
(() => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed: Record<string, string> = JSON.parse(stored);
      Object.entries(parsed).forEach(([ticker, url]) => {
        if (ticker && url && typeof url === "string" && url.trim() !== "") {
          memoryCache.set(ticker.toUpperCase().trim(), url.trim());
        }
      });
    }
  } catch (e) {
    console.warn("Failed to load ticker logo cache from localStorage:", e);
  }
})();

// Debounce timer for saving to localStorage
let persistTimer: ReturnType<typeof setTimeout> | null = null;
const persistToStorage = () => {
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    try {
      const obj: Record<string, string> = {};
      memoryCache.forEach((url, ticker) => {
        obj[ticker] = url;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    } catch (e) {
      console.warn("Failed to persist ticker logo cache:", e);
    }
  }, 300);
};

/**
 * Synchronously get cached logo URL for a ticker (O(1))
 */
export function getCachedLogo(ticker: string | undefined | null): string | undefined {
  if (!ticker) return undefined;
  return memoryCache.get(ticker.toUpperCase().trim());
}

/**
 * Cache a logo URL for a ticker
 */
export function setCachedLogo(ticker: string | undefined | null, url: string | undefined | null): void {
  if (!ticker || !url || typeof url !== "string" || url.trim() === "") return;
  const key = ticker.toUpperCase().trim();
  const val = url.trim();

  if (memoryCache.get(key) !== val) {
    memoryCache.set(key, val);
    persistToStorage();
    preloadImage(val);
  }
}

/**
 * Batch save multiple logos
 */
export function saveCachedLogos(
  items: Array<{ ticker: string; logoUrl?: string | null }> | Record<string, string | null | undefined>
): void {
  let changed = false;

  if (Array.isArray(items)) {
    items.forEach((item) => {
      if (item.ticker && item.logoUrl && typeof item.logoUrl === "string" && item.logoUrl.trim() !== "") {
        const key = item.ticker.toUpperCase().trim();
        const val = item.logoUrl.trim();
        if (memoryCache.get(key) !== val) {
          memoryCache.set(key, val);
          changed = true;
          preloadImage(val);
        }
      }
    });
  } else if (items && typeof items === "object") {
    Object.entries(items).forEach(([ticker, url]) => {
      if (ticker && url && typeof url === "string" && url.trim() !== "") {
        const key = ticker.toUpperCase().trim();
        const val = url.trim();
        if (memoryCache.get(key) !== val) {
          memoryCache.set(key, val);
          changed = true;
          preloadImage(val);
        }
      }
    });
  }

  if (changed) {
    persistToStorage();
  }
}

/**
 * Check if an image URL has already loaded in browser memory
 */
export function isImagePreloaded(url: string | undefined | null): boolean {
  if (!url) return false;
  return preloadedImageUrls.has(url);
}

/**
 * Mark an image URL as loaded in browser memory
 */
export function markImageLoaded(url: string | undefined | null): void {
  if (!url) return;
  preloadedImageUrls.add(url);
}

/**
 * Preload a single image URL in the background
 */
export function preloadImage(url: string | undefined | null): void {
  if (!url || typeof window === "undefined" || preloadedImageUrls.has(url)) return;

  const img = new Image();
  img.referrerPolicy = "no-referrer";
  img.decoding = "async";
  img.onload = () => {
    preloadedImageUrls.add(url);
  };
  img.onerror = () => {
    // If it fails, do not add to loaded set
  };
  img.src = url;
}

/**
 * Batch preload multiple image URLs
 */
export function preloadImages(urls: Array<string | undefined | null>): void {
  urls.forEach((url) => {
    if (url) preloadImage(url);
  });
}
