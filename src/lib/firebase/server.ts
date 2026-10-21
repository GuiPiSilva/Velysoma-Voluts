import { cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function adminApp() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Firebase Admin não configurado no servidor.");
  }
  return getApps().some(item => item.name === "voluts-server")
    ? getApp("voluts-server")
    : initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId }, "voluts-server");
}
export const adminAuth = () => getAuth(adminApp());
export const database = () => getFirestore(adminApp());
