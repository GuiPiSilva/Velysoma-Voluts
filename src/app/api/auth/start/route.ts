import { randomBytes, createHash } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const state = randomBytes(24).toString("base64url");
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const target = new URL("/sso.html", process.env.TERA_ID_BASE_URL || "https://teraaps.vercel.app");
  const callback = new URL("/volut/entrar", request.nextUrl.origin);
  target.searchParams.set("client_id", process.env.TERA_VOLUT_CLIENT_ID || "tera_velysoma_volut_web");
  target.searchParams.set("redirect_uri", callback.toString());
  target.searchParams.set("response_type", "code");
  target.searchParams.set("code_challenge", challenge);
  target.searchParams.set("code_challenge_method", "S256");
  target.searchParams.set("state", state);
  const response = NextResponse.redirect(target);
  const opts = { httpOnly: true, secure: request.nextUrl.protocol === "https:", sameSite: "lax" as const, maxAge: 600, path: "/" };
  response.cookies.set("voluts_oauth_state", state, opts);
  response.cookies.set("voluts_oauth_verifier", verifier, opts);
  return response;
}
