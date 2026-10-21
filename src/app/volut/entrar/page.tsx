import Link from "next/link";
import { LoginClient } from "./LoginClient";
export const metadata = { title: "Acessar sua igreja" };
export default function LoginPage() {
 return <main className="login-page">
   <header className="site-header container"><Link href="/"><img src="/brand/velysoma-voluts.svg" alt="Velysoma Voluts" width="207" height="54"/></Link><Link href="/" className="back-link">← Voltar ao início</Link></header>
   <section className="login-card"><div className="eyebrow"><span className="eyebrow-dot"/> ACESSO SEGURO</div><h1>Bom ter você <em>aqui.</em></h1><p>Entre com sua conta Tera ID para organizar a rotina da sua igreja.</p><LoginClient/><div className="login-foot">Uma conta, vários projetos. Seu acesso é protegido pela TeraApps.</div></section>
 </main>;
}
