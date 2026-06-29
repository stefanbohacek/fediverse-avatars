import { toDataUrl } from "./blobConvert.js";

const KEYS = [
  "avatar_original",
  "avatar_no_bg",
  "avatar_background",
  "avatar_text_variant",
  "avatar_bg_scale",
  "image_source",
  "has_transparent_bg",
  "fediverse_server",
  "auth_token",
  "auth_instance",
];

export const get = (key) => localStorage.getItem(key);

export const set = (key, value) => {
  localStorage.setItem(key, value);
};

export const saveBlob = (key, blob) => {
  toDataUrl(blob)
    .then((dataUrl) => {
      try {
        localStorage.setItem(key, dataUrl);
      } catch (err) {
        //noop
      }
    })
    .catch(() => {});
};

export const clear = (key) => {
  if (key) {
    localStorage.removeItem(key);
  } else {
    KEYS.forEach((k) => localStorage.removeItem(k));
  }
};
