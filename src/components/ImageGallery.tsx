import { useEffect, useState, useRef } from 'react';
import { useCharacterStore } from '../stores/characterStore';
import { useProjectStore } from '../stores/projectStore';
import { getThumbnailData, getImageData } from '../utils/tauri';
import { imageCache } from '../utils/imageCache';

interface ImageData {
  name: string;
  dataUrl: string;
  isFullRes: boolean;
}

export function ImageGallery() {
  const { character, deleteImage } = useCharacterStore();
  const { activeProjectId } = useProjectStore();

  const [images, setImages] = useState<ImageData[]>([]);
  const [fullResLoaded, setFullResLoaded] = useState<Set<string>>(new Set());
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const imageRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    const loadImages = async () => {
      if (!character || !activeProjectId) {
        setImages([]);
        return;
      }

      const loadedImages: ImageData[] = [];
      for (const imageName of character.images) {
        try {
          const cacheKey = `${activeProjectId}:${character.id}:${imageName}`;
          const cached = imageCache.get(cacheKey);
          if (cached) {
            loadedImages.push({ name: imageName, dataUrl: cached, isFullRes: true });
          } else {
            // 先加载缩略图
            const thumbData = await getThumbnailData(activeProjectId, character.id, imageName);
            loadedImages.push({ name: imageName, dataUrl: thumbData, isFullRes: false });
          }
        } catch (error) {
          console.error('加载图片失败:', imageName, error);
        }
      }
      setImages(loadedImages);
    };

    loadImages();
  }, [character, activeProjectId]);

  // IntersectionObserver 延迟加载大图
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      async (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLDivElement;
            const imageName = el.dataset.imageName;
            if (!imageName || fullResLoaded.has(imageName)) continue;

            const characterId = character?.id;
            if (!characterId || !activeProjectId) continue;

            const cacheKey = `${activeProjectId}:${characterId}:${imageName}`;
            const cached = imageCache.get(cacheKey);
            if (cached) {
              setImages(prev => prev.map(img => img.name === imageName ? { ...img, dataUrl: cached, isFullRes: true } : img));
              setFullResLoaded(prev => new Set([...prev, imageName]));
              continue;
            }

            try {
              const dataUrl = await getImageData(activeProjectId, characterId, imageName);
              imageCache.set(cacheKey, dataUrl);
              setImages(prev => prev.map(img => img.name === imageName ? { ...img, dataUrl, isFullRes: true } : img));
              setFullResLoaded(prev => new Set([...prev, imageName]));
            } catch (error) {
              console.error('加载大图失败:', imageName, error);
            }

            observerRef.current?.unobserve(el);
          }
        }
      },
      { rootMargin: '100px' }
    );

    imageRefs.current.forEach((el) => {
      observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, [images, character, activeProjectId, fullResLoaded]);

  const handleDelete = async (imageName: string) => {
    if (confirm('确定删除该图片吗？')) {
      await deleteImage(imageName);
    }
  };

  if (!character || images.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-text-muted">
        暂无参考图片
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-4 gap-3">
        {images.map(image => (
          <div
            key={image.name}
            ref={(el) => { if (el) imageRefs.current.set(image.name, el); }}
            data-image-name={image.name}
            className="relative group aspect-[3/4] rounded-md overflow-hidden border border-border hover:border-accent transition-colors cursor-pointer"
            onClick={() => setSelectedImage(image.name)}
          >
            <img
              src={image.dataUrl}
              alt="参考图片"
              className="w-full h-full object-cover"
            />
            {!image.isFullRes && (
              <div className="absolute top-1 right-1 px-1.5 py-0.5 text-[10px] rounded bg-black/60 text-white">
                缩略图
              </div>
            )}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(image.name); }}
                className="p-2 rounded-full bg-red-500/80 text-white hover:bg-red-600"
                title="删除"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 全屏预览 */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setSelectedImage(null)}
        >
          <img
            src={images.find(img => img.name === selectedImage)?.dataUrl}
            alt="预览"
            className="max-w-[90vw] max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/20 text-white hover:bg-white/30"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </>
  );
}
