// Config — placeholders are substituted by GitHub Actions at deploy time.
// For local development, values come from config.local.js instead.
export const accounts = {
  yellow: { password: "%%PASSWORD_YELLOW%%" },
  green: { password: "%%PASSWORD_GREEN%%" },
  blue: { password: "%%PASSWORD_BLUE%%" },
};

export const cloudinary = {
  cloudName: "%%CLOUDINARY_CLOUD_NAME%%",
  uploadPreset: "%%CLOUDINARY_UPLOAD_PRESET%%",
};

export const firebaseConfig = {
  apiKey: "%%FIREBASE_API_KEY%%",
  authDomain: "%%FIREBASE_AUTH_DOMAIN%%",
  projectId: "%%FIREBASE_PROJECT_ID%%",
  storageBucket: "%%FIREBASE_STORAGE_BUCKET%%",
  messagingSenderId: "%%FIREBASE_MESSAGING_SENDER_ID%%",
  appId: "%%FIREBASE_APP_ID%%",
};
