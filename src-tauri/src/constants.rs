/// 应用常量
pub const APP_NAME: &str = "AI漫剧角色库";
pub const APP_VERSION: &str = "1.0.2";

/// 版本控制
pub const MAX_AUTO_VERSIONS: usize = 50;
pub const MAX_MANUAL_VERSIONS: usize = 100;

/// 图片
pub const MAX_IMAGE_SIZE: u64 = 10 * 1024 * 1024; // 10MB
pub const THUMBNAIL_SIZE: u32 = 256;
pub const VALID_IMAGE_EXTENSIONS: &[&str] = &["png", "jpg", "jpeg", "gif", "webp", "bmp"];

/// 数据迁移
pub const CURRENT_DATA_VERSION: &str = "1.0.2";
