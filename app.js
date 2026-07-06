import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const USE_LOCAL_CONFIG = "auto";

const isLocal =
  USE_LOCAL_CONFIG === true ||
  (USE_LOCAL_CONFIG === "auto" &&
    (location.hostname === "localhost" || location.hostname === "127.0.0.1"));

let accounts, cloudinary, firebaseConfig;
if (isLocal) {
  try {
    ({ accounts, cloudinary, firebaseConfig } = await import("./config.local.js"));
  } catch {
    ({ accounts, cloudinary, firebaseConfig } = await import("./config.js"));
  }
} else {
  ({ accounts, cloudinary, firebaseConfig } = await import("./config.js"));
}

if (!firebaseConfig.apiKey || firebaseConfig.apiKey.startsWith("%%")) {
  document.body.innerHTML = `<div style="font-family:monospace;color:#ff8080;background:#111;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:2rem;text-align:center;">
    <div>
      <p style="font-size:1.1rem;margin-bottom:1rem;">⚠ Config not configured.</p>
      <p style="color:#999;font-size:0.85rem;">A placeholder was not substituted.<br>
      Check GitHub → Settings → Secrets and variables → Actions,<br>
      and that GitHub Pages is serving from the <code>gh-pages</code> branch.</p>
    </div>
  </div>`;
  throw new Error("Config not substituted");
}

const COLORS = ["yellow", "green", "blue"];

const loginScreen = document.getElementById("login-screen");
const appScreen = document.getElementById("app-screen");
const accountButtons = document.querySelectorAll(".account-btn");
const loginForm = document.getElementById("login-form");
const passwordInput = document.getElementById("password-input");
const loginError = document.getElementById("login-error");
const currentAccountLabel = document.getElementById("current-account");
const logoutBtn = document.getElementById("logout-btn");
const fileInput = document.getElementById("file-input");
const uploadBtn = document.getElementById("upload-btn");
const uploadStatus = document.getElementById("upload-status");

let selectedAccount = null;

accountButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    selectedAccount = btn.dataset.account;
    accountButtons.forEach((b) => b.classList.toggle("selected", b === btn));
    loginForm.hidden = false;
    loginError.hidden = true;
    passwordInput.value = "";
    passwordInput.focus();
  });
});

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!selectedAccount) return;

  const expectedPassword = accounts[selectedAccount]?.password;

  if (expectedPassword && passwordInput.value === expectedPassword) {
    sessionStorage.setItem("account", selectedAccount);
    enterApp(selectedAccount);
  } else {
    loginError.textContent = "Wrong password.";
    loginError.hidden = false;
  }
});

logoutBtn.addEventListener("click", () => {
  sessionStorage.removeItem("account");
  appScreen.hidden = true;
  loginScreen.hidden = false;
});

function enterApp(account) {
  loginScreen.hidden = true;
  appScreen.hidden = false;
  currentAccountLabel.textContent = account;
}

// --- Firebase ---

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const uploadsQuery = query(collection(db, "uploads"), orderBy("createdAt", "desc"));

onSnapshot(uploadsQuery, (snapshot) => {
  const byColor = { yellow: [], green: [], blue: [] };
  snapshot.forEach((doc) => {
    const data = doc.data();
    if (byColor[data.color]) {
      byColor[data.color].push(data);
    }
  });

  for (const color of COLORS) {
    const grid = document.getElementById(`gallery-${color}`);
    grid.innerHTML = "";
    for (const item of byColor[color]) {
      const img = document.createElement("img");
      img.src = item.url;
      img.loading = "lazy";
      grid.appendChild(img);
    }
  }
});

// --- Cloudinary upload ---

uploadBtn.addEventListener("click", async () => {
  const file = fileInput.files[0];
  if (!file) {
    uploadStatus.textContent = "Choose an image first.";
    return;
  }

  uploadBtn.disabled = true;
  uploadStatus.textContent = "Uploading...";

  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", cloudinary.uploadPreset);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudinary.cloudName}/image/upload`,
      { method: "POST", body: formData }
    );

    if (!response.ok) {
      throw new Error(`Cloudinary upload failed (${response.status})`);
    }

    const result = await response.json();

    await addDoc(collection(db, "uploads"), {
      color: sessionStorage.getItem("account"),
      url: result.secure_url,
      createdAt: serverTimestamp(),
    });

    uploadStatus.textContent = "Uploaded!";
    fileInput.value = "";
  } catch (err) {
    console.error(err);
    uploadStatus.textContent = "Upload failed. See console.";
  } finally {
    uploadBtn.disabled = false;
  }
});

// --- Restore session ---

const savedAccount = sessionStorage.getItem("account");
if (savedAccount && COLORS.includes(savedAccount)) {
  enterApp(savedAccount);
}
