import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

export function browserAuth() {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  if (!config.apiKey || !config.projectId || !config.appId) {
    throw new Error("Configure as variáveis públicas do Firebase antes de entrar.");
  }
  const app = getApps().some(item => item.name === "voluts")
    ? getApp("voluts")
    : initializeApp(config, "voluts");
  return getAuth(app);
}
