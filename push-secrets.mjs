// Pushes GitHub Actions secrets from your local config.local.js using the
// GitHub CLI. Doesn't touch git — just calls `gh secret set` for each value.
//
// Prereqs: `gh` installed and authenticated (`gh auth login`), run from
// inside a repo that has a GitHub remote (or pass --repo owner/name).
import { execFileSync } from "node:child_process";
import { accounts, cloudinary, firebaseConfig } from "./config.local.js";

const repoArg = process.argv.includes("--repo")
  ? ["--repo", process.argv[process.argv.indexOf("--repo") + 1]]
  : [];

const secrets = {
  PASSWORD_YELLOW: accounts.yellow.password,
  PASSWORD_GREEN: accounts.green.password,
  PASSWORD_BLUE: accounts.blue.password,
  CLOUDINARY_CLOUD_NAME: cloudinary.cloudName,
  CLOUDINARY_UPLOAD_PRESET: cloudinary.uploadPreset,
  FIREBASE_API_KEY: firebaseConfig.apiKey,
  FIREBASE_AUTH_DOMAIN: firebaseConfig.authDomain,
  FIREBASE_PROJECT_ID: firebaseConfig.projectId,
  FIREBASE_STORAGE_BUCKET: firebaseConfig.storageBucket,
  FIREBASE_MESSAGING_SENDER_ID: firebaseConfig.messagingSenderId,
  FIREBASE_APP_ID: firebaseConfig.appId,
};

for (const [name, value] of Object.entries(secrets)) {
  if (!value || value.startsWith("your-") || value.startsWith("%%")) {
    console.warn(`skipping ${name}: not filled in yet in config.local.js`);
    continue;
  }
  console.log(`setting ${name}...`);
  execFileSync("gh", ["secret", "set", name, "--body", value, ...repoArg], {
    stdio: "inherit",
  });
}

console.log("done.");
