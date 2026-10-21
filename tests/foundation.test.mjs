import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, existsSync } from "node:fs";
const read = path => readFileSync(path, "utf8");
test("identidade Velysoma Voluts e tema preto/dourado", () => {
  assert.match(read("src/app/page.tsx"),/Velysoma Voluts/);
  assert.match(read("src/app/globals.css"),/#0A0A0C/i);
  assert.match(read("src/app/globals.css"),/#D6AF61/i);
});
test("login Tera ID usa PKCE S256 e estado em cookie HttpOnly", () => {
  const start = read("src/app/api/auth/start/route.ts");
  const exchange = read("src/app/api/auth/exchange/route.ts");
  assert.match(start,/code_challenge_method/);
  assert.match(start,/httpOnly: true/);
  assert.match(exchange,/code_verifier/);
  assert.match(exchange,/createCustomToken/);
});
test("isolamento por igreja e permissão no backend", () => {
  const access = read("src/lib/access.ts");
  assert.match(access,/verifyIdToken/);
  assert.match(access,/voluts !== true/);
  assert.match(access,/ref.collection\("members"\)/);
  assert.match(access,/role !== "owner" && role !== "admin"/);
});
test("novo projeto não usa rotas de clínica", () => {
  for (const p of ["src/app/clinica","src/app/paciente","src/app/api/clinic","src/lib/patients.ts"]) assert.equal(existsSync(p),false);
});
