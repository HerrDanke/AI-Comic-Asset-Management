// 应用常量
export const APP_NAME = 'AI漫剧角色库';
export const APP_VERSION = '1.0.2';

// 存储键
export const SETTINGS_KEY = 'aicomic_settings';

// 默认设置
export const DEFAULT_SAVE_INTERVAL = 30000; // 30秒
export const DEFAULT_BLUR_SAVE_ENABLED = true;

// 版本控制
export const MAX_AUTO_VERSIONS = 50;
export const MAX_MANUAL_VERSIONS = 100;
export const MAX_HISTORY_COMMANDS = 50;

// 图片
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
export const THUMBNAIL_SIZE = 256;
export const IMAGE_CACHE_SIZE = 50;
export const VALID_IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'] as const;

// 搜索
export const MAX_SEARCH_HISTORY = 10;
export const MIN_SEARCH_LENGTH = 2;

// 防抖
export const DIRTY_DEBOUNCE_MS = 500;

// 数据迁移
export const CURRENT_DATA_VERSION = '1.0.2';
