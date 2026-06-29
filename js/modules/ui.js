import { applySelectedBackground, preloadBackgrounds } from "./backgrounds.js";
import { hasTransparentBackground } from "./detectTransparentBackground.js";
import { signIn, fetchAvatar, uploadAvatar } from "./fediverse.js";

import {
  get as getLocalStorage,
  set as setLocalStorage,
  saveBlob as saveToLocalStorage,
  clear as clearLocalStorage,
} from "./storage.js";

import { toWebP as blobToWebP } from "./blobConvert.js";
import { removeBackground } from "../../libs/imgly/background-removal/dist/index.mjs";

import {
  getTextVariant,
  getBackgroundSpec,
  resetBackground,
  showBackground,
  hideBackground,
  restoreBackground,
  initBackground,
} from "./overlay.js";

const progressMessages = {
  "compute:decode": "Decoding image",
  "compute:inference": "Removing background",
  "compute:mask": "Generating mask",
  "compute:encode": "Encoding result",
};

export default () => {
  preloadBackgrounds();
  signIn();
  const imageInput = document.getElementById("image-input");
  const previewArea = document.getElementById("preview-area");
  const originalImage = document.getElementById("original-image");
  const resultImage = document.getElementById("result-image");
  const removeBgBtn = document.getElementById("remove-bg-btn");
  const progressArea = document.getElementById("progress-area");
  const progressBar = document.getElementById("progress-bar");
  const progressText = document.getElementById("progress-text");
  const downloadBtn = document.getElementById("download-btn");
  const downloadArea = document.getElementById("download-area");
  const uploadAvatarBtn = document.getElementById("upload-avatar-btn");
  const removeImageBtn = document.getElementById("remove-image-btn");
  const bgScaleSlider = document.getElementById("bg-scale-slider");
  const bgScaleValue = document.getElementById("bg-scale-value");
  const bgScaleContainer = document.getElementById("bg-scale-container");
  const previewSkeleton = document.getElementById("preview-skeleton");
  const previewImages = document.getElementById("preview-images");
  const colPreview = document.getElementById("col-preview");
  const resultImageWrapper = document.getElementById("result-image-wrapper");
  const colControls = document.getElementById("col-controls");
  const examplesImage = document.getElementById("examples-image");
  const selectBackgroundSection = document.getElementById("select-background");

  const scrollTo = (element) => {
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  let currentFile = null;
  let foregroundBlob = null;
  let foregroundUrl = null;
  let imageSource = null;
  let hasTransparentBg = false;

  const applyBackground = () => {
    applySelectedBackground(
      foregroundBlob,
      getTextVariant(),
      getBackgroundSpec(),
      resultImage,
      downloadBtn,
      downloadArea,
      parseFloat(bgScaleSlider.value),
      hasTransparentBg,
    );
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      currentFile = file;
      foregroundBlob = null;
      hasTransparentBg = false;
      originalImage.src = URL.createObjectURL(file);
      resultImage.src = "";
      resultImageWrapper.classList.add("d-none");
      downloadArea.classList.add("d-none");
      progressArea.classList.add("d-none");
      hideBackground();
      examplesImage.classList.add("d-none");
      previewArea.classList.remove("d-none");
      colPreview.classList.remove("d-none");
      colControls.classList.replace("col-12", "col-md-8");
      imageSource = "file";
      setLocalStorage("image_source", "file");
      clearLocalStorage("avatar_no_bg");
      clearLocalStorage("has_transparent_bg");
      blobToWebP(file).then((webpBlob) =>
        saveToLocalStorage("avatar_original", webpBlob),
      );

      hasTransparentBg = await hasTransparentBackground(file);

      if (hasTransparentBg) {
        foregroundBlob = file;
        resultImage.src = URL.createObjectURL(file);
        resultImageWrapper.classList.remove("d-none");
        showBackground();
        bgScaleContainer.classList.remove("d-none");
        setLocalStorage("has_transparent_bg", "true");
        blobToWebP(file).then((webpBlob) =>
          saveToLocalStorage("avatar_no_bg", webpBlob),
        );
        if (getBackgroundSpec()) {
          applyBackground();
        }
        scrollTo(selectBackgroundSection);
      } else {
        removeBgBtn.classList.remove("d-none");
        scrollTo(previewArea);
      }
    }
  };

  const handleRemoveImage = () => {
    currentFile = null;
    foregroundBlob = null;
    hasTransparentBg = false;

    if (foregroundUrl) {
      URL.revokeObjectURL(foregroundUrl);
      foregroundUrl = null;
    }

    imageInput.value = "";
    originalImage.src = "";
    resultImage.src = "";
    resultImageWrapper.classList.add("d-none");

    resetBackground();

    removeImageBtn.textContent = "Remove image";
    bgScaleContainer.classList.add("d-none");
    bgScaleSlider.value = 3;
    bgScaleValue.textContent = 3;
    previewArea.classList.add("d-none");
    colPreview.classList.add("d-none");
    colControls.classList.replace("col-md-8", "col-12");
    hideBackground();
    examplesImage.classList.remove("d-none");
    downloadArea.classList.add("d-none");

    if (imageSource === "api") {
      document.getElementById("fediverse-server").value = "";
    }

    imageSource = null;
    clearLocalStorage();
  };

  const handleRemoveBg = async () => {
    if (currentFile) {
      removeBgBtn.disabled = true;
      progressArea.classList.remove("d-none");
      progressBar.classList.remove(
        "progress-bar-striped",
        "progress-bar-animated",
      );
      progressBar.style.width = "0%";
      progressText.textContent = "Starting";

      try {
        foregroundBlob = await removeBackground(currentFile, {
          progress: (key, current, total) => {
            if (key.startsWith("compute")) {
              progressBar.classList.add(
                "progress-bar-striped",
                "progress-bar-animated",
              );
              progressBar.style.width = "100%";
              progressText.textContent = (progressMessages[key] || key) + "...";
            } else if (total > 0) {
              const percent = Math.round((current / total) * 100);
              progressBar.classList.remove(
                "progress-bar-striped",
                "progress-bar-animated",
              );
              progressBar.style.width = percent + "%";
              progressBar.setAttribute("aria-valuenow", percent);
              progressText.textContent = `Downloading ${percent}%`;
            }
          },
        });

        foregroundUrl = URL.createObjectURL(foregroundBlob);
        resultImage.src = foregroundUrl;
        resultImageWrapper.classList.remove("d-none");
        removeBgBtn.classList.add("d-none");
        progressArea.classList.add("d-none");
        showBackground();
        bgScaleContainer.classList.remove("d-none");

        if (imageSource === "api") {
          uploadAvatarBtn.classList.remove("d-none");
        }

        scrollTo(selectBackgroundSection);

        blobToWebP(foregroundBlob).then((webpBlob) =>
          saveToLocalStorage("avatar_no_bg", webpBlob),
        );

        if (getBackgroundSpec()) {
          URL.revokeObjectURL(foregroundUrl);
          foregroundUrl = null;
          applyBackground();
        }
      } catch (err) {
        progressText.textContent = "Error occurred: " + err.message;
        console.error(err);
      } finally {
        removeBgBtn.disabled = false;
        removeImageBtn.classList.remove("d-none");
      }
    }
  };

  const restoreState = () => {
    const savedScale = getLocalStorage("avatar_bg_scale");
    if (savedScale) {
      bgScaleSlider.value = savedScale;
      bgScaleValue.textContent = savedScale;
    }

    const savedImageSource = getLocalStorage("image_source");

    if (savedImageSource) {
      imageSource = savedImageSource;
      if (imageSource === "api") {
        removeImageBtn.textContent = "Remove image and log out";
      }
    }

    hasTransparentBg = getLocalStorage("has_transparent_bg") === "true";

    const savedOriginal = getLocalStorage("avatar_original");
    const savedNoBg = getLocalStorage("avatar_no_bg");

    if (savedOriginal) {
      originalImage.src = savedOriginal;
      examplesImage.classList.add("d-none");
      previewArea.classList.remove("d-none");
      colPreview.classList.remove("d-none");
      colControls.classList.replace("col-12", "col-md-8");
      previewSkeleton.classList.remove("d-none");
      previewImages.classList.add("d-none");

      if (!savedNoBg) {
        removeBgBtn.classList.remove("d-none");
        fetch(savedOriginal)
          .then((r) => r.blob())
          .then((blob) => {
            currentFile = blob;
            previewSkeleton.classList.add("d-none");
            previewImages.classList.remove("d-none");
          });
      }
    }

    if (savedNoBg) {
      examplesImage.classList.add("d-none");
      previewArea.classList.remove("d-none");
      colPreview.classList.remove("d-none");
      resultImage.src = savedNoBg;

      restoreBackground();

      fetch(savedNoBg)
        .then((r) => r.blob())
        .then((blob) => {
          foregroundBlob = blob;
          previewSkeleton.classList.add("d-none");
          previewImages.classList.remove("d-none");
          resultImageWrapper.classList.remove("d-none");
          removeBgBtn.classList.add("d-none");
          showBackground();
          bgScaleContainer.classList.remove("d-none");

          if (imageSource === "api") {
            uploadAvatarBtn.classList.remove("d-none");
          }

          applyBackground();
        });
    }
  };

  const handleUploadAvatar = () => {
    if (confirm("Ready to update your profile image?")) {
      const instance = getLocalStorage("auth_instance");
      const token = getLocalStorage("auth_token");

      uploadAvatarBtn.disabled = true;
      uploadAvatarBtn.textContent = "Uploading...";

      fetch(downloadBtn.href)
        .then((r) => r.blob())
        .then((blob) => uploadAvatar(instance, token, blob))
        .then(() => {
          uploadAvatarBtn.textContent = "Uploaded!";
        })
        .catch((err) => {
          uploadAvatarBtn.textContent = "Upload failed";
          uploadAvatarBtn.disabled = false;
          console.error("Upload avatar error", { err });
        });
    }
  };

  const handleAuthCallback = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const authToken = urlParams.get("token");
    const authInstance = urlParams.get("instance");
    const authError = urlParams.get("error");

    if (authError) {
      window.history.replaceState({}, document.title, window.location.pathname);

      if (authError === "platform_not_supported") {
        alert("Sorry, this platform is not yet supported.");
      } else {
        alert(
          "Sign-in failed. Please try again or reach out via stefanbohacek.com/contact.",
        );
      }
    } else if (authToken && authInstance) {
      window.history.replaceState({}, document.title, window.location.pathname);

      fetchAvatar(authInstance, authToken)
        .then((blob) => {
          currentFile = blob;
          originalImage.src = URL.createObjectURL(blob);
          examplesImage.classList.add("d-none");
          previewArea.classList.remove("d-none");
          colPreview.classList.remove("d-none");
          colControls.classList.replace("col-12", "col-md-8");
          previewSkeleton.classList.add("d-none");
          previewImages.classList.remove("d-none");
          imageSource = "api";
          removeImageBtn.textContent = "Remove image and log out";

          setLocalStorage("image_source", "api");
          setLocalStorage("auth_token", authToken);
          setLocalStorage("auth_instance", authInstance);
          blobToWebP(blob).then((webpBlob) =>
            saveToLocalStorage("avatar_original", webpBlob),
          );

          removeBgBtn.classList.add("d-none");
          removeImageBtn.classList.add("d-none");

          handleRemoveBg();
        })
        .catch((err) => {
          console.error("auth callback error", { err });
        });
    }
  };

  imageInput.addEventListener("change", handleFileChange);
  removeImageBtn.addEventListener("click", handleRemoveImage);
  removeBgBtn.addEventListener("click", handleRemoveBg);

  initBackground(() => {
    if (foregroundBlob) {
      bgScaleContainer.classList.remove("d-none");
      if (imageSource === "api") {
        uploadAvatarBtn.textContent = "Upload avatar";
        uploadAvatarBtn.disabled = false;
      }
      applyBackground();
    }
  });

  bgScaleSlider.addEventListener("input", () => {
    bgScaleValue.textContent = bgScaleSlider.value;
  });

  bgScaleSlider.addEventListener("change", () => {
    setLocalStorage("avatar_bg_scale", bgScaleSlider.value);
    if (foregroundBlob) {
      if (imageSource === "api") {
        uploadAvatarBtn.textContent = "Upload avatar";
        uploadAvatarBtn.disabled = false;
      }
      applyBackground();
    }
  });

  uploadAvatarBtn.addEventListener("click", handleUploadAvatar);

  restoreState();
  handleAuthCallback();
};
