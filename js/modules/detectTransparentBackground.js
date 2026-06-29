import loadImage from "./loadImage.js";

const TRANSPARENT_TYPES = new Set(["image/png", "image/webp", "image/gif"]);

export const hasTransparentBackground = async (file) => {
  if (!TRANSPARENT_TYPES.has(file.type)) {
    return false;
  }

  const url = URL.createObjectURL(file);
  const img = await loadImage(url);
  URL.revokeObjectURL(url);

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);

  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) {
      return true;
    }
  }

  return false;
};
