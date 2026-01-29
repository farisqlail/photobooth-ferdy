export const loadImage = async (src: string) => {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image load failed"));
    image.src = src;
  });
};

export const getSlotPercentages = (
  slot: { x: number; y: number; width: number; height: number; x_percent?: number; y_percent?: number; width_percent?: number; height_percent?: number },
  templateWidth: number,
  templateHeight: number
) => {
  // If percentages are already provided (and valid), use them
  if (
    typeof slot.x_percent === 'number' &&
    typeof slot.y_percent === 'number' &&
    typeof slot.width_percent === 'number' &&
    typeof slot.height_percent === 'number'
  ) {
    return {
      x: slot.x_percent,
      y: slot.y_percent,
      width: slot.width_percent,
      height: slot.height_percent,
    };
  }

  // Otherwise calculate from absolute pixels
  return {
    x: (slot.x / templateWidth) * 100,
    y: (slot.y / templateHeight) * 100,
    width: (slot.width / templateWidth) * 100,
    height: (slot.height / templateHeight) * 100,
  };
};
