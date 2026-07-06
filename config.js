// Config — placeholders are substituted by GitHub Actions at deploy time.
// For local development, values come from config.local.js instead.
export const accounts = {
  yellow: { password: "123" },
  green: { password: "123" },
  blue: { password: "123" },
};

export const cloudinary = {
  cloudName: "oi2zx9xv",
  uploadPreset: "colors",
};

export const firebaseConfig = {
  apiKey: "AIzaSyBRd9tb3x4qcnaIYpjUp_GZNt0vpCeyseo",
  authDomain: "color-database-eb8a2.firebaseapp.com",
  projectId: "color-database-eb8a2",
  storageBucket: "color-database-eb8a2.firebasestorage.app",
  messagingSenderId: "970509680975",
  appId: "1:970509680975:web:deb41c073f18a1f4c5853a",
};
