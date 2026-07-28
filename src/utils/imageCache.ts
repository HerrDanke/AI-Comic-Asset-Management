import { IMAGE_CACHE_SIZE } from '../constants';

// LRU 图片缓存
class ImageCache {
  private cache = new Map<string, string>();
  private maxSize: number;

  constructor(maxSize: number = IMAGE_CACHE_SIZE) {
    this.maxSize = maxSize;
  }

  get(key: string): string | undefined {
    const value = this.cache.get(key);
    if (value) {
      // 移到末尾（最近使用）
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: string, value: string): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // 删除最旧的（第一个）
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }
}

export const imageCache = new ImageCache(50);
