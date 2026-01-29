import GIFEncoder from 'gif-encoder-2';
import { loadImage } from '@/components/features/booth/utils';

export async function createGif(imageUrls: string[], delay: number = 500): Promise<string> {
  if (imageUrls.length === 0) return '';

  try {
    // Load first image to get dimensions
    const firstImage = await loadImage(imageUrls[0]);
    const width = firstImage.naturalWidth;
    const height = firstImage.naturalHeight;

    const encoder = new GIFEncoder(width, height);
    encoder.setDelay(delay);
    encoder.start();

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (!ctx) throw new Error('Could not get canvas context');

    for (const url of imageUrls) {
      const img = await loadImage(url);
      ctx.drawImage(img, 0, 0, width, height);
      encoder.addFrame(ctx);
    }

    encoder.finish();
    
    const buffer = encoder.out.getData();
    const blob = new Blob([buffer], { type: 'image/gif' });
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('Failed to create GIF:', error);
    throw error;
  }
}
