import { type NextRequest } from "next/server";
import { apiError, churchAccess } from "@/lib/access";
import { isResource } from "@/lib/resources";

type Context = { params: Promise<{ churchId: string; resource: string }> };
const field = (value: unknown, max = 140) => typeof value === "string" ? value.trim().slice(0, max) : "";
export async function GET(request: NextRequest, { params }: Context) {
  try {
    const { churchId, resource } = await params;
    if (!isResource(resource)) return Response.json({ message: "Módulo inválido." }, { status: 400 });
    const { ref } = await churchAccess(request, churchId);
    const snapshot = await ref.collection(resource).orderBy("createdAt", "desc").limit(100).get();
    return Response.json({ entries: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) });
  } catch (error) { return apiError(error); }
}
export async function POST(request: NextRequest, { params }: Context) {
  try {
    const { churchId, resource } = await params;
    if (!isResource(resource)) return Response.json({ message: "Módulo inválido." }, { status: 400 });
    const { ref, user } = await churchAccess(request, churchId, true);
    const input = await request.json();
    const name = field(input.name);
    const now = new Date().toISOString();
    let entry: Record<string, string> = {};
    if (resource === "ministries") {
      if (name.length < 2) return Response.json({ message: "Informe um ministério." }, { status: 400 });
      entry = { name };
    } else if (resource === "people") {
      if (name.length < 2) return Response.json({ message: "Informe o nome da pessoa." }, { status: 400 });
      entry = { name, email: field(input.email, 180), phone: field(input.phone, 25), ministryId: field(input.ministryId, 100) };
    } else if (resource === "events") {
      const date = field(input.date, 10), time = field(input.time, 5);
      if (name.length < 2 || !/^\d{4}-\d{2}-\d{2}$/.test(date) || (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))) {
        return Response.json({ message: "Informe a programação e uma data válida." }, { status: 400 });
      }
      entry = { name, date, time, ministryId: field(input.ministryId, 100) };
    } else {
      const eventId = field(input.eventId, 100), personId = field(input.personId, 100);
      if (!eventId || !personId) return Response.json({ message: "Selecione programação e voluntário." }, { status: 400 });
      const [event, person] = await Promise.all([ref.collection("events").doc(eventId).get(), ref.collection("people").doc(personId).get()]);
      if (!event.exists || !person.exists) return Response.json({ message: "Pessoa ou programação não pertence a esta igreja." }, { status: 400 });
      entry = { eventId, personId, status: "scheduled" };
    }
    if (entry.ministryId && !(await ref.collection("ministries").doc(entry.ministryId).get()).exists) {
      return Response.json({ message: "Ministério não encontrado nesta igreja." }, { status: 400 });
    }
    const collection = ref.collection(resource);
    const doc = resource === "assignments" ? collection.doc(entry.eventId + "_" + entry.personId) : collection.doc();
    if (resource === "assignments" && (await doc.get()).exists) return Response.json({ message: "Pessoa já escalada nesta programação." }, { status: 409 });
    await doc.create({ ...entry, createdAt: now, createdBy: user.uid });
    return Response.json({ entry: { id: doc.id, ...entry, createdAt: now } }, { status: 201 });
  } catch (error) { return apiError(error); }
}
