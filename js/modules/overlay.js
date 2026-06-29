import { get as getLocalStorage, set as setLocalStorage } from "./storage.js";

const selectBackground = document.getElementById("select-background");
const colorPicker = document.getElementById("bg-color-picker");
const blendModeSelect = document.getElementById("bg-blend-mode");
const colorOptions = document.getElementById("bg-color-options");
const bgColorRadio = document.getElementById("bg-color");

const showColorOptions = () => {
  colorOptions.classList.remove("d-none");
};

const hideColorOptions = () => {
  colorOptions.classList.add("d-none");
};

export const getTextVariant = () => {
  const checked = selectBackground.querySelector(
    "input[name='text-variant']:checked",
  );
  return checked ? checked.value : "light";
};

export const getBackgroundSpec = () => {
  const checked = selectBackground.querySelector(
    "input[name='background']:checked",
  );
  if (!checked) {
    return null;
  }
  if (checked.value === "color") {
    return "color--" + colorPicker.value + "--" + blendModeSelect.value;
  }
  return checked.value;
};

export const resetBackground = () => {
  const lightRadio = document.getElementById("text-light");
  if (lightRadio) {
    lightRadio.checked = true;
  }
  colorPicker.value = "#ffffff";
  blendModeSelect.value = "multiply";
  bgColorRadio.checked = true;
  showColorOptions();
  selectBackground.querySelectorAll("input[name='background']").forEach((r) => {
    if (r.value !== "color") {
      r.checked = false;
    }
  });
};

export const showBackground = () => {
  selectBackground.classList.remove("d-none");
};

export const hideBackground = () => {
  selectBackground.classList.add("d-none");
};

export const restoreBackground = () => {
  const savedVariant = getLocalStorage("avatar_text_variant");
  if (savedVariant) {
    const radio = selectBackground.querySelector(
      `input[name='text-variant'][value="${savedVariant}"]`,
    );
    if (radio) {
      radio.checked = true;
    }
  }

  const savedSpec = getLocalStorage("avatar_background");
  if (savedSpec) {
    if (savedSpec.startsWith("color--")) {
      const parts = savedSpec.split("--");
      colorPicker.value = parts[1];
      blendModeSelect.value =
        parts[2] || (savedVariant === "dark" ? "screen" : "multiply");
      bgColorRadio.checked = true;
      showColorOptions();
    } else {
      const radio = selectBackground.querySelector(
        `input[name='background'][value="${savedSpec}"]`,
      );
      if (radio) {
        radio.checked = true;
        hideColorOptions();
      }
    }
  }
};

export const initBackground = (onChange) => {
  selectBackground.addEventListener("change", (event) => {
    if (event.target.name === "text-variant") {
      if (bgColorRadio.checked) {
        const isDefaultColor =
          colorPicker.value === "#000000" || colorPicker.value === "#ffffff";
        if (event.target.value === "dark") {
          if (isDefaultColor) {
            colorPicker.value = "#000000";
          }
          if (blendModeSelect.value === "multiply") {
            blendModeSelect.value = "screen";
          }
        } else {
          if (isDefaultColor) {
            colorPicker.value = "#ffffff";
          }
          if (blendModeSelect.value === "screen") {
            blendModeSelect.value = "multiply";
          }
        }
      }
      setLocalStorage("avatar_text_variant", event.target.value);
      setLocalStorage("avatar_background", getBackgroundSpec());
      onChange();
    } else if (event.target.name === "background") {
      if (event.target.value === "color") {
        showColorOptions();
      } else {
        hideColorOptions();
      }
      setLocalStorage("avatar_background", getBackgroundSpec());
      onChange();
    } else if (
      event.target.type === "color" ||
      event.target === blendModeSelect
    ) {
      setLocalStorage("avatar_background", getBackgroundSpec());
      onChange();
    }
  });
};
