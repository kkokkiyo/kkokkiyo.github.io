import type { ImageMetadata } from 'astro';

// '/src/assets/...' 경로 문자열을 이미지로 변환
const images = import.meta.glob<{ default: ImageMetadata }>('/src/assets/**/*.{png,jpg,jpeg,webp,gif,avif}', { eager: true });

export function resolveImage(src: string | ImageMetadata): ImageMetadata {
  if (typeof src !== 'string') return src;
  const found = images[src.startsWith('/') ? src : `/${src}`];
  if (!found) throw new Error(`이미지를 찾을 수 없습니다: ${src} (src/assets 아래에 있어야 합니다)`);
  return found.default;
}
