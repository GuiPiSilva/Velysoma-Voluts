import { FieldValue } from "firebase-admin/firestore";
import { type NextRequest } from "next/server";
import { identity, apiError } from "@/lib/access";
import { database } from "@/lib/firebase/server";

export async function GET(request: NextRequest) {
  try {
    const user = await identity(request);
    const db = database();
    const index = await db.collection("voluts_users").doc(user.uid).get();
    const ids: string[] = Array.isArray(index.data()?.churchIds) ? index.data()!.churchIds.slice(0, 40) : [];
    const churches = await Promise.all(ids.map(async (id) => {
      const ref = db.collection("voluts_churches").doc(id);
      const [church, member] = await Promise.all([ref.get(), ref.collection("members").doc(user.uid).get()]);
      return church.data()?.status === "active" && member.data()?.status === "active"
        ? { id, name: church.data()?.name, role: member.data()?.role } : null;
    }));
    return Response.json({ churches: churches.filter(Boolean) });
  } catch (error) { return apiError(error); }
}
export async function POST(request: NextRequest) {
  try {
    const user = await identity(request);
    const payload = await request.json();
    const name = typeof payload.name === "string" ? payload.name.trim() : "";
    if (name.length < 3 || name.length > 120) return Response.json({ message: "Informe o nome da igreja (3 a 120 caracteres)." }, { status: 400 });
    const db = database(), ref = db.collection("voluts_churches").doc();
    const batch = db.batch();
    const now = new Date().toISOString();
    batch.create(ref, { name, status: "active", ownerId: user.uid, createdAt: now });
    batch.create(ref.collection("members").doc(user.uid), { role: "owner", status: "active", email: user.email, name: user.name, createdAt: now });
    batch.set(db.collection("voluts_users").doc(user.uid), { churchIds: FieldValue.arrayUnion(ref.id) }, { merge: true });
    await batch.commit();
    return Response.json({ church: { id: ref.id, name, role: "owner" } }, { status: 201 });
  } catch (error) { return apiError(error); }
}
