import {
  get as getLocalStorage,
  set as setLocalStorage,
  clear as clearLocalStorage,
} from "./storage.js";

const supportedPlatforms = ["mastodon", "hometown"];

const getServerPlatform = async (domain) => {
  let platform;
  try {
    const response = await fetch(
      `https://fediverse-info.stefanbohacek.com/node-info?domain=${domain}&onlysoftware=true`,
    );
    const data = await response.json();
    platform = data?.software?.name.toLowerCase();
  } catch (err) {
    console.error("getServerPlatform error", { err });
  }
  return platform;
};

export const signIn = () => {
  const form = document.getElementById("sign-in-form");
  const serverField = document.getElementById("fediverse-server");
  const signInBtn = document.getElementById("sign-in");

  const savedServer = getLocalStorage("fediverse_server");
  if (savedServer) {
    serverField.value = savedServer;
  }

  serverField.addEventListener("input", () => {
    if (serverField.value.trim()) {
      setLocalStorage("fediverse_server", serverField.value.trim());
    } else {
      clearLocalStorage("fediverse_server");
    }
  });

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const instance = serverField.value.trim();
    if (instance) {
      serverField.disabled = true;
      signInBtn.disabled = true;
      signInBtn.textContent = "Checking...";
      const platform = await getServerPlatform(instance);
      if (supportedPlatforms.includes(platform)) {
        signInBtn.textContent = "Redirecting...";
        const environment =
          window.location.hostname === "localhost"
            ? "development"
            : "production";
        window.location.href = `https://auth.stefanbohacek.com/?method=fediverse&instance=${encodeURIComponent(instance)}&scope=read:accounts+write:accounts&app=fediverse-avatars&environment=${environment}`;
      } else {
        alert(
          `Sorry, ${platform ? platform + " is" : "this platform is"} not yet supported.`,
        );
        serverField.disabled = false;
        signInBtn.disabled = false;
        signInBtn.textContent = "Sign in";
      }
    } else {
      serverField.focus();
    }
  });
};

export const fetchAvatar = async (instance, token) => {
  const response = await fetch(
    `https://${instance}/api/v1/accounts/verify_credentials`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!response.ok) {
    throw new Error(`Failed to load account: ${response.status}`);
  }
  const account = await response.json();
  const avatarResponse = await fetch(account.avatar);
  if (!avatarResponse.ok) {
    throw new Error(`Failed to fetch avatar: ${avatarResponse.status}`);
  }
  return avatarResponse.blob();
};

export const uploadAvatar = async (instance, token, blob) => {
  const formData = new FormData();
  formData.append("avatar", blob, "avatar.png");
  const response = await fetch(`https://${instance}/api/v1/profile`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status}`);
  }
  return response.json();
};
