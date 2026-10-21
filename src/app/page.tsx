import Link from "next/link";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Velysoma Voluts — Gestão inteligente de igrejas" };

const features = [
  { icon: "01", title: "Pessoas", text: "Um lugar para organizar os voluntários da sua comunidade." },
  { icon: "02", title: "Ministérios", text: "Equipes organizadas e informações fáceis de encontrar." },
  { icon: "03", title: "Programações", text: "Planeje cultos, encontros e eventos com clareza." },
  { icon: "04", title: "Escalas", text: "Distribua voluntários entre programações sem planilhas." },
];
export default function Home() {
 return <main>
  <header className="site-header container">
    <Link href="/" className="site-logo" aria-label="Velysoma Voluts: início"><img src="/brand/velysoma-voluts.svg" alt="Velysoma Voluts" width="207" height="54"/></Link>
    <nav className="site-nav" aria-label="Menu principal"><a href="#recursos">Recursos</a><a href="#como-funciona">Como funciona</a><Link className="nav-login" href="/volut/entrar">Entrar <span aria-hidden="true">↗</span></Link></nav>
  </header>
  <section className="hero container">
    <div className="hero-glow" aria-hidden="true"/>
    <div className="hero-copy">
      <div className="eyebrow"><span className="eyebrow-dot"/> TECNOLOGIA A SERVIÇO DA IGREJA</div>
      <h1>Mais tempo para <em>cuidar de pessoas.</em></h1>
      <p>Menos complicação na gestão. Mais conexão entre ministérios, voluntários e tudo o que acontece na sua igreja.</p>
      <div className="hero-actions"><Link href="/volut/entrar" className="btn btn-gold">Começar agora <span aria-hidden="true">↗</span></Link><a className="btn btn-outline" href="#recursos">Conhecer a plataforma <span aria-hidden="true">↓</span></a></div>
      <div className="hero-assurance"><span className="tiny-star">✦</span> Uma única conta Tera ID. Uma experiência feita para sua igreja.</div>
    </div>
    <div className="hero-visual" aria-label="Ilustração conceitual do painel da Velysoma Voluts">
      <div className="preview-top"><span className="preview-brand">✦ VOLUTS <i>PAINEL</i></span><span className="preview-badge">Visão geral</span></div>
      <div className="preview-overline">MINHA IGREJA</div>
      <div className="preview-heading">Tudo em seu lugar.</div>
      <div className="preview-metrics"><div><small>Pessoas</small><strong>128</strong><span>Na comunidade</span></div><div><small>Ministérios</small><strong>08</strong><span>Equipes ativas</span></div></div>
      <div className="preview-list-title">Próximas programações <span>↗</span></div>
      <div className="preview-event"><div className="preview-date">DOM<br/><strong>25</strong></div><div><strong>Culto de celebração</strong><small>09:00 · Equipe de louvor</small></div><span>↗</span></div>
      <div className="preview-event"><div className="preview-date">QUA<br/><strong>28</strong></div><div><strong>Encontro de oração</strong><small>20:00 · Equipe de apoio</small></div><span>↗</span></div>
      <div className="preview-notice">Prévia ilustrativa · informações fictícias</div>
    </div>
  </section>
  <section className="section-block container" id="recursos">
    <div className="section-top"><div><div className="section-kicker">O ESSENCIAL, BEM ORGANIZADO</div><h2>Sua igreja em sintonia.</h2></div><p>Um sistema pensado para ser fácil até para quem não tem familiaridade com tecnologia.</p></div>
    <div className="feature-grid">{features.map(f => <article className="feature" key={f.icon}><span className="feature-number">{f.icon}</span><div className="feature-icon" aria-hidden="true">✦</div><h3>{f.title}</h3><p>{f.text}</p><div className="feature-foot">Organize com facilidade <span>↗</span></div></article>)}</div>
  </section>
  <section className="purpose-band" id="como-funciona"><div className="container purpose-inner"><div className="section-kicker">DO PRIMEIRO CADASTRO À ESCALA</div><h2>Simples para quem lidera.<br/><em>Leve para quem serve.</em></h2><div className="steps"><div><b>01</b><span>Cadastre sua igreja</span></div><div><b>02</b><span>Organize os ministérios</span></div><div><b>03</b><span>Adicione pessoas e cultos</span></div><div><b>04</b><span>Monte suas escalas</span></div></div></div></section>
  <section className="closing container"><div className="closing-copy"><div className="section-kicker">SEU PRÓXIMO PASSO</div><h2>Organização para servir <em>melhor.</em></h2><p>Comece a estruturar sua igreja com uma plataforma que cresce com a sua comunidade.</p></div><Link href="/volut/entrar" className="btn btn-gold">Acessar Velysoma Voluts <span aria-hidden="true">↗</span></Link></section>
  <footer className="footer container"><img src="/brand/velysoma-voluts.svg" alt="Velysoma Voluts" width="160" height="42"/><span>Feito para pessoas, ministérios e propósito.</span><small>© {new Date().getFullYear()} Velysoma Voluts</small></footer>
 </main>
}
