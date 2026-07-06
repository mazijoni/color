import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
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
const viewTabs = document.querySelectorAll(".view-tab");
const galleryViews = document.querySelectorAll(".gallery-view");
const galleryMine = document.getElementById("gallery-mine");
const communityFeed = document.getElementById("community-feed");
const filterButtons = document.querySelectorAll(".filter-btn");

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

// --- View tabs ---

viewTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    viewTabs.forEach((t) => t.classList.toggle("selected", t === tab));
    galleryViews.forEach((view) => {
      view.hidden = view.dataset.view !== tab.dataset.view;
    });
  });
});

// --- Community filter ---

let communityFilter = "all";

filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    communityFilter = btn.dataset.filter;
    filterButtons.forEach((b) => b.classList.toggle("selected", b === btn));
    renderCommunity();
  });
});

// --- Firebase ---

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const uploadsQuery = query(collection(db, "uploads"), orderBy("createdAt", "desc"));

function formatTime(timestamp) {
  if (!timestamp) return "just now";
  const diffMs = Date.now() - timestamp.toDate().getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

async function deleteUpload(id) {
  if (!confirm("Delete this photo?")) return;
  try {
    await deleteDoc(doc(db, "uploads", id));
  } catch (err) {
    console.error(err);
    alert("Delete failed. See console.");
  }
}

function makeDeleteBtn(item) {
  if (item.color !== sessionStorage.getItem("account")) return null;
  const btn = document.createElement("button");
  btn.className = "delete-btn";
  btn.type = "button";
  btn.title = "Delete";
  btn.textContent = "✕";
  btn.addEventListener("click", () => deleteUpload(item.id));
  return btn;
}

function makePhotoTile(item) {
  const tile = document.createElement("div");
  tile.className = "photo-tile";

  const img = document.createElement("img");
  img.src = item.url;
  img.loading = "lazy";
  tile.appendChild(img);

  const deleteBtn = makeDeleteBtn(item);
  if (deleteBtn) tile.appendChild(deleteBtn);

  return tile;
}

let latestUploads = [];

function renderMine() {
  const account = sessionStorage.getItem("account");
  galleryMine.innerHTML = "";
  for (const item of latestUploads) {
    if (item.color !== account) continue;
    galleryMine.appendChild(makePhotoTile(item));
  }
}

function renderCommunity() {
  communityFeed.innerHTML = "";
  for (const item of latestUploads) {
    if (communityFilter !== "all" && item.color !== communityFilter) continue;

    const row = document.createElement("div");
    row.className = "feed-item";
    row.appendChild(makePhotoTile(item));

    const meta = document.createElement("div");
    meta.className = "feed-meta";

    const tag = document.createElement("span");
    tag.className = `tag tag-${item.color}`;
    tag.textContent = item.color;

    const time = document.createElement("span");
    time.className = "feed-time";
    time.textContent = formatTime(item.createdAt);

    meta.append(tag, time);
    row.appendChild(meta);
    communityFeed.appendChild(row);
  }
}

onSnapshot(uploadsQuery, (snapshot) => {
  latestUploads = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  renderMine();
  renderCommunity();
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
