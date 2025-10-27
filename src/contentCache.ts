// Content cache service with 15-day expiration and version-based invalidation
class ContentCacheService {
  private static instance: ContentCacheService;
  private cache: Map<string, { data: any; timestamp: number; version: number; lastVersionCheck?: number }> = new Map();
  private readonly CACHE_DURATION = 15 * 24 * 60 * 60 * 1000; // 15 days in milliseconds
  // Since users visit only 2x/day, check version on every page load (very reasonable)
  private readonly VERSION_CHECK_INTERVAL = 0; // Check every time (users visit infrequently)

  static getInstance(): ContentCacheService {
    if (!ContentCacheService.instance) {
      ContentCacheService.instance = new ContentCacheService();
    }
    return ContentCacheService.instance;
  }

  private getCacheKey(language: string): string {
    return `content_${language}`;
  }

  private isExpired(timestamp: number): boolean {
    return Date.now() - timestamp > this.CACHE_DURATION;
  }

  async getContent(language: string, forceRefresh = false): Promise<any> {
    const cacheKey = this.getCacheKey(language);

    // Check localStorage first
    const stored = localStorage.getItem(cacheKey);
    if (stored && !forceRefresh) {
      try {
        const parsed = JSON.parse(stored);
        if (!this.isExpired(parsed.timestamp)) {
          // Check for updates only if enough time has passed since last check
          const now = Date.now();
          if (!parsed.lastVersionCheck || (now - parsed.lastVersionCheck) > this.VERSION_CHECK_INTERVAL) {
            this.checkForUpdates(language).catch(console.warn); // 🔍 Controlla aggiornamenti in background
          }
          this.cache.set(cacheKey, parsed);
          return parsed.data;
        }
      } catch (error) {
        console.warn('Error parsing cached content:', error);
      }
    }

    // Fetch from server
    try {
      const { httpsCallable } = await import('firebase/functions');
      const { functions } = await import('../src/firebase');

      const getContent = httpsCallable(functions, 'getContent');
      const result = await getContent({ language });

      const resultData = result.data as { version?: number; [key: string]: any };

      const contentData = {
        data: resultData,
        timestamp: Date.now(),
        version: resultData.version || 1,
        lastVersionCheck: Date.now() // Mark when we last checked version
      };

      // Cache in memory and localStorage
      this.cache.set(cacheKey, contentData);
      localStorage.setItem(cacheKey, JSON.stringify(contentData));

      return contentData.data;
    } catch (error) {
      console.error('Error fetching content:', error);

      // Return cached data if available, even if expired
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached.data;
      }

      throw error;
    }
  }

  invalidateCache(language?: string): void {
    if (language) {
      const cacheKey = this.getCacheKey(language);
      this.cache.delete(cacheKey);
      localStorage.removeItem(cacheKey);
    } else {
      // Clear all content cache
      this.cache.clear();
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('content_')) {
          localStorage.removeItem(key);
        }
      });
    }
  }

  async checkForUpdates(language: string): Promise<boolean> {
    try {
      const { httpsCallable } = await import('firebase/functions');
      const { functions } = await import('../src/firebase');

      const getContent = httpsCallable(functions, 'getContent');
      const result = await getContent({ language });

      const resultData = result.data as { version?: number; [key: string]: any };
      const cacheKey = this.getCacheKey(language);
      const cached = this.cache.get(cacheKey);

      if (cached && (resultData.version || 1) > cached.version) {
        // Version changed, invalidate cache
        this.invalidateCache(language);
        return true;
      } else {
        // Update last version check timestamp even if no changes
        const stored = localStorage.getItem(cacheKey);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            parsed.lastVersionCheck = Date.now();
            localStorage.setItem(cacheKey, JSON.stringify(parsed));
            if (this.cache.has(cacheKey)) {
              this.cache.set(cacheKey, parsed);
            }
          } catch (error) {
            console.warn('Error updating version check timestamp:', error);
          }
        }
      }

      return false;
    } catch (error) {
      console.error('Error checking for content updates:', error);
      return false;
    }
  }
}

export const contentCache = ContentCacheService.getInstance();