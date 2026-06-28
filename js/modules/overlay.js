import { get as getLocalStorage, set as setLocalStorage } from "./storage.js";

const selectOverlay = document.getElementById("select-overlay");

export const getOverlayKey = () => {
  const checked = selectOverlay.querySelector(
    "input[name='overlay']:checked",
  );
  return checked && checked.value ? checked.value : null;
};

export const resetOverlay = () => {
  selectOverlay
    .querySelectorAll("input[name='overlay']")
    .forEach((radio) => {
      radio.checked = false;
    });

  const noneOption = document.getElementById("pride-flag-none");

  if (noneOption) {
    noneOption.checked = true;
  }
};

export const showOverlay = () => {
  selectOverlay.classList.remove("d-none");
};

export const hideOverlay = () => {
  selectOverlay.classList.add("d-none");
};

export const restoreOverlay = () => {
  const saved = getLocalStorage("avatar_overlay");

  if (saved === null) {
    return;
  }

  const radio = selectOverlay.querySelector(
    `input[name='overlay'][value="${saved}"]`,
  );

  if (radio) {
    radio.checked = true;
  }
};

export const initOverlay = (onOverlayChange) => {
  selectOverlay.addEventListener("change", (event) => {
    setLocalStorage("avatar_overlay", event.target.value);
    onOverlayChange();
  });
};
