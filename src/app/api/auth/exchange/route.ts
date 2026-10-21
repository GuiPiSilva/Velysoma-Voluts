import { type NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const code = typeof body.code === "string" ? body.code : "";
    const state = typeof body.state === "string" ? body.state : "";
    const storedState = request.cookies.get("voluts_oauth_state")?.value;
    const verifier = request.cookies.get("voluts_oauth_verifier")?.value;
    if (!code || !state || !storedState || !verifier || state !== storedState) {
      return NextResponse.json({ message: "A autenticação expirou. Tente novamente." }, { status: 400 });
    }
    const callback = new URL("/volut/entrar", request.nextUrl.origin);
    const endpoint = new URL("/api/oauth/token", process.env.TERA_ID_BASE_URL || "https://teraaps.vercel.app");
    const result = await fetch(endpoint, {
      method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: process.env.TERA_VOLUT_CLIENT_ID || "tera_velysoma_volut_web",
        redirect_uri: callback.toString(),
        code, code_verifier: verifier
      }),
      signal: AbortSignal.timeout(12000)
    });
    const json = await result.json().catch(() => ({}));
    if (!result.ok || !json.user?.sub || json.user.email_verified !== true) {
      return NextResponse.json({ message: "O login não foi autorizado pela Tera ID." }, { status: 401 });
    }
    const customToken = await adminAuth().createCustomToken(json.user.sub, { voluts: true });
    const response = NextResponse.json({ customToken });
    const opts = { path: "/", maxAge: 0, httpOnly: true, sameSite: "lax" as const };
    response.cookies.set("voluts_oauth_state", "", opts);
    response.cookies.set("voluts_oauth_verifier", "", opts);
    return response;
  } catch (error) {
    console.error("Falha OAuth Voluts:", error);
    return NextResponse.json({ message: "Não foi possível concluir o login." }, { status: 500 });
  }
}
