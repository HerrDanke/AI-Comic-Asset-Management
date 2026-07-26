import { useEffect, useState } from 'react';
import { useCharacterStore } from '../stores/characterStore';
import { useProjectStore } from '../stores/projectStore';
import { getImageData } from '../utils/tauri';

interface ImageData {
  name: string;
  dataUrl: string;
}

export function ImageGallery() {
  const { character, deleteImage } = useCharacterStore();
  const { activeProjectId } = useProjectStore();
  
  const [images, setImages] = useState<ImageData[]>([]);

  useEffect(() => {
    const loadImages = async () => {
      if (!character || !activeProjectId) {
        console.log('[ImageGallery] 无角色或无项目，清空图片');
        setImages([]);
        return;
      }

      console.log('[ImageGallery] 加载图片:', character.images, '角色ID:', character.id);
      const loadedImages: ImageData[] = [];
      for (const imageName of character.images) {
        try {
          const base64 = await getImageData(activeProjectId, character.id, imageName);
          // 检测图片类型
          const ext = imageName.split('.').pop()?.toLowerCase() || 'png';
          const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 
                           ext === 'gif' ? 'image/gif' : 
                           ext === 'webp' ? 'image/webp' : 'image/png';
          loadedImages.push({
            name: imageName,
            dataUrl: `data:${mimeType};base64,${base64}`,
          });
        } catch (error) {
          console.error('加载图片失败:', imageName, error);
        }
      }
      setImages(loadedImages);
      console.log('[ImageGallery] 已加载图片数:', loadedImages.length);
    };

    loadImages();
  }, [character, activeProjectId]);

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
    <div className="grid grid-cols-4 gap-3">
      {images.map(image => (
        <div
          key={image.name}
          className="relative group aspect-[3/4] rounded-md overflow-hidden border border-border hover:border-accent transition-colors"
        >
          <img
            src={image.dataUrl}
            alt="参考图片"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              onClick={() => handleDelete(image.name)}
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
  );
}
