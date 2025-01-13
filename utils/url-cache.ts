// utils/url-cache.ts
// A utility for caching signed URLs to reduce storage egress

interface CacheEntry {
  url: string;
  expiry: number;
}

class URLCache {
  private cache: Map<string, CacheEntry>;
  private cleanupInterval: NodeJS.Timeout;
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private readonly EXPIRY_MARGIN = 60 * 1000; // 1 minute margin

  constructor() {
    this.cache = new Map();
    this.cleanupInterval = setInterval(() => this.cleanExpired(), this.CLEANUP_INTERVAL);
  }

  set(id: string, url: string, expirySeconds: number): void {
    // Set expiry slightly before the actual expiry to ensure we don't serve stale URLs
    const expiry = Date.now() + ((expirySeconds - 60) * 1000); // 60 seconds margin
    this.cache.set(id, { url, expiry });
  }

  get(id: string): string | undefined {
    const entry = this.cache.get(id);
    if (!entry) return undefined;

    // Check if URL is about to expire (within margin)
    if (Date.now() > entry.expiry - this.EXPIRY_MARGIN) {
      this.cache.delete(id);
      return undefined;
    }

    return entry.url;
  }

  clear(): void {
    this.cache.clear();
  }

  private cleanExpired(): void {
    const now = Date.now();
    for (const [id, entry] of this.cache.entries()) {
      if (now > entry.expiry - this.EXPIRY_MARGIN) {
        this.cache.delete(id);
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

// Create a singleton instance
export const urlCache = new URLCache(); 