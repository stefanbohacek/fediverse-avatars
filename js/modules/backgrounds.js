import loadImage from "./loadImage.js";

const config = {
  "fedi-international-dark": {
    url: "images/backgrounds/fediverse-international-dark.png",
  },
  "fedi-international-light": {
    url: "images/backgrounds/fediverse-international-light.png",
  },
};

const overlayConfig = {
  pride: {
    "gilbert-baker": {
      url: "images/overlays/pride-flags/fediverse-international-gilbert-baker-pride-flag.png",
    },
    "intersex-inclusive": {
      url: "images/overlays/pride-flags/fediverse-international-intersex-inclusive-pride-flag.png",
    },
    "progress-variant": {
      url: "images/overlays/pride-flags/fediverse-international-progress-variant-pride-flag.png",
    },
    queer: {
      url: "images/overlays/pride-flags/fediverse-international-queer-pride-flag.png",
    },
    "traditional-gay": {
      url: "images/overlays/pride-flags/fediverse-international-traditional-gay-pride-flag.png",
    },
    philadelphia: {
      url: "images/overlays/pride-flags/fediverse-international-traditional-philly-pride-flag.png",
    },
  },
};

const fgCache = new WeakMap();

const getProcessedFgCanvas = async (foregroundBlob) => {
  if (fgCache.has(foregroundBlob)) {
    return fgCache.get(foregroundBlob);
  }
  const fgUrl = URL.createObjectURL(foregroundBlob);
  const fgImg = await loadImage(fgUrl);
  URL.revokeObjectURL(fgUrl);
  const fgCanvas = document.createElement("canvas");
  fgCanvas.width = fgImg.naturalWidth;
  fgCanvas.height = fgImg.naturalHeight;
  const fgCtx = fgCanvas.getContext("2d");
  fgCtx.drawImage(fgImg, 0, 0);
  const imageData = fgCtx.getImageData(0, 0, fgCanvas.width, fgCanvas.height);
  const pixels = imageData.data;
  for (let i = 3; i < pixels.length; i += 4) {
    pixels[i] = pixels[i] > 30 ? 255 : 0;
  }
  fgCtx.putImageData(imageData, 0, 0);
  fgCache.set(foregroundBlob, fgCanvas);
  return fgCanvas;
};

const composite = async (
  foregroundBlob,
  backgroundUrl,
  backgroundScale,
  overlayUrl,
) => {
  const loadPromises = [
    loadImage(backgroundUrl),
    getProcessedFgCanvas(foregroundBlob),
  ];

  if (overlayUrl) {
    loadPromises.push(loadImage(overlayUrl));
  }

  const [bgImg, fgCanvas, overlayImg] = await Promise.all(loadPromises);
  const canvas = document.createElement("canvas");
  canvas.width = fgCanvas.width;
  canvas.height = fgCanvas.height;
  const ctx = canvas.getContext("2d");

  if (overlayImg) {
    ctx.drawImage(overlayImg, 0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = "multiply";
  }

  const scale =
    Math.max(
      canvas.width / bgImg.naturalWidth,
      canvas.height / bgImg.naturalHeight,
    ) * backgroundScale;

  const bgW = bgImg.naturalWidth * scale;
  const bgH = bgImg.naturalHeight * scale;
  const bgX = (canvas.width - bgW) / 2;
  const bgY = (canvas.height - bgH) / 2;

  ctx.drawImage(bgImg, bgX, bgY, bgW, bgH);
  ctx.globalCompositeOperation = "source-over";
  ctx.shadowBlur = 25;
  ctx.shadowOffsetX = 6;
  ctx.shadowOffsetY = 10;
  ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
  ctx.drawImage(fgCanvas, 0, 0);

  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
};

let previousResultUrl = null;

export const preloadBackgrounds = () => {
  Object.values(config).forEach(({ url }) => {
    const img = new Image();
    img.src = url;
  });

  Object.values(overlayConfig).forEach((category) => {
    Object.values(category).forEach(({ url }) => {
      const img = new Image();
      img.src = url;
    });
  });
};

export const applySelectedBackground = async (
  foregroundBlob,
  backgroundKey,
  overlayKey,
  resultImage,
  downloadBtn,
  downloadArea,
  scale,
) => {
  const background = config[backgroundKey];

  if (!background || !foregroundBlob) {
    return;
  }

  const [overlayCategory, overlayItem] = overlayKey
    ? overlayKey.split("--")
    : [];

  const overlay = overlayConfig[overlayCategory]?.[overlayItem];
  const overlayUrl = overlay ? overlay.url : null;

  const resultBlob = await composite(
    foregroundBlob,
    background.url,
    scale,
    overlayUrl,
  );

  if (previousResultUrl) {
    URL.revokeObjectURL(previousResultUrl);
  }

  const resultUrl = URL.createObjectURL(resultBlob);

  previousResultUrl = resultUrl;
  resultImage.src = resultUrl;
  downloadBtn.href = resultUrl;
  downloadArea.classList.remove("d-none");
};
