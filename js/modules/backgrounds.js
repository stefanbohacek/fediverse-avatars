import loadImage from "./loadImage.js";

const patternUrls = {
  light: "images/backgrounds/fediverse-international-black-transparent.png",
  dark: "images/backgrounds/fediverse-international-white-transparent.png",
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

const getProcessedFgCanvas = async (foregroundBlob, skipThreshold = false) => {
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
  if (!skipThreshold) {
    const imageData = fgCtx.getImageData(0, 0, fgCanvas.width, fgCanvas.height);
    const pixels = imageData.data;
    for (let i = 3; i < pixels.length; i += 4) {
      pixels[i] = pixels[i] > 10 ? 255 : 0;
    }
    fgCtx.putImageData(imageData, 0, 0);
  }
  fgCache.set(foregroundBlob, fgCanvas);
  return fgCanvas;
};

const composite = async (
  foregroundBlob,
  patternUrl,
  backgroundColor,
  prideUrl,
  blendMode,
  scale,
  skipThreshold = false,
) => {
  const loadPromises = [
    loadImage(patternUrl),
    getProcessedFgCanvas(foregroundBlob, skipThreshold),
  ];

  if (prideUrl) {
    loadPromises.push(loadImage(prideUrl));
  }

  const [patternImg, fgCanvas, prideImg] = await Promise.all(loadPromises);

  const canvas = document.createElement("canvas");
  canvas.width = fgCanvas.width;
  canvas.height = fgCanvas.height;
  const ctx = canvas.getContext("2d");

  if (prideImg) {
    const scale = Math.max(
      canvas.width / prideImg.naturalWidth,
      canvas.height / prideImg.naturalHeight,
    );
    const w = prideImg.naturalWidth * scale;
    const h = prideImg.naturalHeight * scale;
    const x = (canvas.width - w) / 2;
    const y = (canvas.height - h) / 2;
    ctx.drawImage(prideImg, x, y, w, h);
  } else {
    ctx.fillStyle = backgroundColor || "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  const patternScale = scale || 1;
  const pw = canvas.width * patternScale;
  const ph = canvas.height * patternScale;
  const px = (canvas.width - pw) / 2;
  const py = (canvas.height - ph) / 2;

  ctx.globalCompositeOperation = blendMode || "source-over";
  ctx.drawImage(patternImg, px, py, pw, ph);
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
  Object.values(patternUrls).forEach((url) => {
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
  textVariant,
  backgroundSpec,
  resultImage,
  downloadBtn,
  downloadArea,
  scale,
  skipThreshold = false,
) => {
  if (!foregroundBlob) {
    return;
  }

  const patternUrl = patternUrls[textVariant] || patternUrls.light;

  let backgroundColor = null;
  let prideUrl = null;

  let blendMode = null;

  if (backgroundSpec && backgroundSpec.startsWith("pride--")) {
    const prideKey = backgroundSpec.slice("pride--".length);
    prideUrl = overlayConfig.pride[prideKey]?.url || null;
  } else {
    const parts = backgroundSpec ? backgroundSpec.split("--") : [];
    backgroundColor =
      parts[1] || (textVariant === "dark" ? "#000000" : "#ffffff");
    blendMode = parts[2] || null;
  }

  const resultBlob = await composite(
    foregroundBlob,
    patternUrl,
    backgroundColor,
    prideUrl,
    blendMode,
    scale,
    skipThreshold,
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
