// Config — placeholders are substituted by GitHub Actions at deploy time.
// For local development, values come from config.local.js instead.
export const accounts = {
  yellow: { password: "" },
  green: { password: "" },
  blue: { password: "" },
};

export const cloudinary = {
  cloudName: "",
  uploadPreset: "",
};

export const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
};
