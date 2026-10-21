import { type NextRequest } from "next/server";
import { adminAuth, database } from "./firebase/server";

export type Role = "owner" | "admin" | "leader" | "volunteer";
export async function identity(request: NextRequest) {
  const header = request.headers.get("authorization") || "";
  if (!header.startsWith("Bearer ")) throw new Error("AUTH_REQUIRED");
  const user = await adminAuth().verifyIdToken(header.slice(7).trim(), true);
  if (user.voluts !== true || !user.email || user.email_verified !== true) throw new Error("ACCESS_DENIED");
  return { uid: user.uid, email: user.email, name: user.name || user.email };
}
export async function churchAccess(request: NextRequest, churchId: string, editing = false) {
  if (!/^[A-Za-z0-9_-]{10,100}$/.test(churchId)) throw new Error("BAD_INPUT");
  const user = await identity(request);
  const ref = database().collection("voluts_churches").doc(churchId);
  const [church, member] = await Promise.all([ref.get(), ref.collection("members").doc(user.uid).get()]);
  if (!church.exists || church.data()?.status !== "active") throw new Error("NOT_FOUND");
  if (!member.exists || member.data()?.status !== "active") throw new Error("ACCESS_DENIED");
  const role = member.data()?.role as Role;
  if (editing && role !== "owner" && role !== "admin") throw new Error("ACCESS_DENIED");
  return { user, role, ref };
}
export function apiError(error: unknown) {
  const code = error instanceof Error ? error.message : "";
  if (code === "AUTH_REQUIRED") return Response.json({ message: "Faça login com sua Tera ID." }, { status: 401 });
  if (code === "ACCESS_DENIED") return Response.json({ message: "Você não tem acesso a esta área." }, { status: 403 });
  if (code === "BAD_INPUT") return Response.json({ message: "Dados inválidos." }, { status: 400 });
  if (code === "NOT_FOUND") return Response.json({ message: "Igreja não encontrada." }, { status: 404 });
  console.error("Erro Voluts:", error);
  return Response.json({ message: "Não foi possível concluir a operação." }, { status: 500 });
}
