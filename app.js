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
  updateDoc,
  arrayUnion,
  arrayRemove,
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
const dayFilterList = document.getElementById("day-filter-list");
const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightbox-img");
const lightboxClose = document.getElementById("lightbox-close");

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
    localStorage.setItem("account", selectedAccount);
    enterApp(selectedAccount);
  } else {
    loginError.textContent = "Wrong password.";
    loginError.hidden = false;
  }
});

logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("account");
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

// --- Community day filter ---

let communityDayFilter = "all";

// --- Firebase ---

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const uploadsQuery = query(collection(db, "uploads"), orderBy("createdAt", "desc"));

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
  if (item.color !== localStorage.getItem("account")) return null;
  const btn = document.createElement("button");
  btn.className = "delete-btn";
  btn.type = "button";
  btn.title = "Delete";
  btn.textContent = "✕";
  btn.addEventListener("click", (event) => {
    event.stopPropagation();
    deleteUpload(item.id);
  });
  return btn;
}

// --- Likes ---

async function toggleLike(item) {
  const account = localStorage.getItem("account");
  if (!account || item.color === account) return;

  const likes = item.likes || [];
  const ref = doc(db, "uploads", item.id);
  try {
    await updateDoc(ref, {
      likes: likes.includes(account) ? arrayRemove(account) : arrayUnion(account),
    });
  } catch (err) {
    console.error(err);
  }
}

// No like button on your own photos — can't rate yourself.
function makeLikeBtn(item) {
  const account = localStorage.getItem("account");
  if (item.color === account) return null;

  const likes = item.likes || [];
  const liked = likes.includes(account);

  const btn = document.createElement("button");
  btn.className = "like-btn";
  btn.type = "button";
  btn.classList.toggle("liked", liked);
  btn.title = liked ? "Unlike" : "Like";
  btn.innerHTML = `<span class="like-icon">${liked ? "♥" : "♡"}</span><span class="like-count">${likes.length}</span>`;
  btn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleLike(item);
  });
  return btn;
}

function makePhotoTile(item) {
  const tile = document.createElement("div");
  tile.className = "photo-tile";

  const img = document.createElement("img");
  img.src = item.url;
  img.loading = "lazy";
  tile.appendChild(img);

  tile.addEventListener("click", () => openLightbox(item.url));

  const deleteBtn = makeDeleteBtn(item);
  if (deleteBtn) tile.appendChild(deleteBtn);

  const likeBtn = makeLikeBtn(item);
  if (likeBtn) tile.appendChild(likeBtn);

  return tile;
}

// --- Day grouping ---

// "day" is a YYYY-MM-DD category saved on the upload doc itself, so grouping
// doesn't depend on re-deriving it from createdAt on every render.
function dateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function itemDayKey(item) {
  if (item.day) return item.day;
  return dateKey(item.createdAt ? item.createdAt.toDate() : new Date());
}

function dayLabelFromKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  const target = new Date(y, m - 1, d);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffDays = Math.round((today - target) / 86400000);
  if (diffDays === 0) return "Today";
  return `Day ${diffDays}`;
}

function groupByDay(items) {
  const groups = [];
  const indexByKey = new Map();
  for (const item of items) {
    const key = itemDayKey(item);
    if (!indexByKey.has(key)) {
      indexByKey.set(key, groups.length);
      groups.push({ key, label: dayLabelFromKey(key), items: [] });
    }
    groups[indexByKey.get(key)].items.push(item);
  }
  return groups;
}

let latestUploads = [];

// Renders items grouped into day sections (Today, Day 1, Day 2, ...), each a
// plain photo grid. New uploads land in the right day automatically since
// groupByDay is recomputed from latestUploads on every render.
function renderDayGroupedGrid(container, items) {
  container.innerHTML = "";

  for (const group of groupByDay(items)) {
    const section = document.createElement("div");
    section.className = "day-group";

    const header = document.createElement("h3");
    header.className = "day-header";
    header.textContent = group.label;
    section.appendChild(header);

    const grid = document.createElement("div");
    grid.className = "photo-grid";
    for (const item of group.items) grid.appendChild(makePhotoTile(item));
    section.appendChild(grid);

    container.appendChild(section);
  }
}

function renderMine() {
  const account = localStorage.getItem("account");
  const items = latestUploads.filter((item) => item.color === account);
  renderDayGroupedGrid(galleryMine, items);
}

function renderDayFilterButtons(groups) {
  dayFilterList.innerHTML = "";

  function addButton(label, key) {
    const btn = document.createElement("button");
    btn.className = "filter-btn";
    btn.type = "button";
    btn.textContent = label;
    btn.classList.toggle("selected", communityDayFilter === key);
    btn.addEventListener("click", () => {
      communityDayFilter = key;
      renderCommunity();
    });
    dayFilterList.appendChild(btn);
  }

  addButton("All", "all");
  for (const group of groups) addButton(group.label, group.key);
}

// One showcase slot per color for the day. If a color posted more than once
// that day, the slot auto-cycles through all of that color's photos for it.
function makeCommunitySlot(color, items, cyclers) {
  const slot = document.createElement("div");
  slot.className = "community-slot";

  if (items.length === 0) {
    slot.classList.add("slot-empty");
    const tag = document.createElement("span");
    tag.className = `tag tag-${color}`;
    tag.textContent = color;
    slot.appendChild(tag);
    return slot;
  }

  let index = 0;

  const tile = document.createElement("div");
  tile.className = "photo-tile";

  const img = document.createElement("img");
  img.loading = "lazy";
  img.src = items[0].url;
  tile.appendChild(img);
  tile.addEventListener("click", () => openLightbox(img.src));

  const meta = document.createElement("div");
  meta.className = "feed-meta";

  const tag = document.createElement("span");
  tag.className = `tag tag-${color}`;
  tag.textContent = color;
  meta.appendChild(tag);

  if (items.length > 1) {
    const count = document.createElement("span");
    count.className = "feed-time";
    count.textContent = `1 / ${items.length}`;
    meta.appendChild(count);
  }

  slot.append(tile, meta);

  function showCurrent() {
    const current = items[index];
    img.src = current.url;

    const countEl = meta.querySelector(".feed-time");
    if (countEl) countEl.textContent = `${index + 1} / ${items.length}`;

    const oldDeleteBtn = tile.querySelector(".delete-btn");
    if (oldDeleteBtn) oldDeleteBtn.remove();
    const deleteBtn = makeDeleteBtn(current);
    if (deleteBtn) tile.appendChild(deleteBtn);

    const oldLikeBtn = tile.querySelector(".like-btn");
    if (oldLikeBtn) oldLikeBtn.remove();
    const likeBtn = makeLikeBtn(current);
    if (likeBtn) tile.appendChild(likeBtn);
  }
  showCurrent();

  if (items.length > 1) {
    cyclers.push(() => {
      index = (index + 1) % items.length;
      showCurrent();
    });
  }

  return slot;
}

let communityCycleInterval = null;

// "All" is a plain list of every photo, day by day (same format as Your
// Images). Picking a specific day switches to the per-color showcase.
function renderCommunity() {
  if (communityCycleInterval) clearInterval(communityCycleInterval);
  communityCycleInterval = null;

  const groups = groupByDay(latestUploads);
  renderDayFilterButtons(groups);

  if (communityDayFilter === "all") {
    renderDayGroupedGrid(communityFeed, latestUploads);
    return;
  }

  communityFeed.innerHTML = "";
  const group = groups.find((g) => g.key === communityDayFilter);

  const section = document.createElement("div");
  section.className = "day-group";

  const header = document.createElement("h3");
  header.className = "day-header";
  header.textContent = group ? group.label : dayLabelFromKey(communityDayFilter);
  section.appendChild(header);

  const row = document.createElement("div");
  row.className = "community-row";
  const cyclers = [];
  for (const color of COLORS) {
    const colorItems = group ? group.items.filter((item) => item.color === color) : [];
    row.appendChild(makeCommunitySlot(color, colorItems, cyclers));
  }
  section.appendChild(row);

  communityFeed.appendChild(section);

  if (cyclers.length > 0) {
    communityCycleInterval = setInterval(() => {
      cyclers.forEach((tick) => tick());
    }, 3000);
  }
}

// --- Lightbox ---

function openLightbox(url) {
  lightboxImg.src = url;
  lightbox.hidden = false;
}

function closeLightbox() {
  lightbox.hidden = true;
  lightboxImg.src = "";
}

lightboxClose.addEventListener("click", closeLightbox);
lightbox.addEventListener("click", (event) => {
  if (event.target === lightbox) closeLightbox();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !lightbox.hidden) closeLightbox();
});

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
      color: localStorage.getItem("account"),
      url: result.secure_url,
      day: dateKey(new Date()),
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

const savedAccount = localStorage.getItem("account");
if (savedAccount && COLORS.includes(savedAccount)) {
  enterApp(savedAccount);
}
