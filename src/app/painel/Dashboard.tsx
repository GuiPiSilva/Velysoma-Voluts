"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { browserAuth } from "@/lib/firebase/client";
import { resources, resourceNames, type Resource, type Entry } from "@/lib/resources";
import { Extras } from "./Extras";

type Church = { id: string; name: string; role: string };
type Tab = "overview" | Resource | "availability" | "planner" | "suggest" | "reports";
const labels: Record<Tab,string> = { overview:"Início",...resourceNames,availability:"Disponibilidade",planner:"Agenda",suggest:"Sugestões de escala",reports:"Relatórios" };
type EntryMap = Record<Resource, Entry[]>;
type Form = { name: string; ministryId: string; email: string; phone: string; date: string; time: string; eventId: string; personId: string };
const cleanForm: Form = { name:"", ministryId:"", email:"", phone:"", date:"", time:"", eventId:"", personId:"" };
const empty: EntryMap = { ministries: [], people: [], events: [], assignments: [] };
const nav: { id: Tab; label: string; icon: string }[] = [
  {id:"overview",label:"Início",icon:"⌂"},
  {id:"planner",label:"Agenda",icon:"▦"},
  {id:"people",label:"Pessoas",icon:"♙"},
  {id:"assignments",label:"Escalas",icon:"☷"},
  {id:"ministries",label:"Ministérios",icon:"◎"}
];

async function api<T>(user: User, url: string, payload?: unknown, method?: "POST" | "PATCH"): Promise<T> {
  const response = await fetch(url, {
    method: payload ? (method || "POST") : "GET", cache: "no-store",
    headers: { Authorization: "Bearer " + await user.getIdToken(), ...(payload ? { "Content-Type":"application/json" } : {}) },
    ...(payload ? { body: JSON.stringify(payload) } : {})
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.message || "Não foi possível concluir a operação.");
  return json as T;
}

export function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [churches, setChurches] = useState<Church[]>([]);
  const [churchId, setChurchId] = useState("");
  const [entries, setEntries] = useState<EntryMap>(empty);
  const [tab, setTab] = useState<Tab>("overview");
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [form, setForm] = useState<Form>(cleanForm);
  const [churchName, setChurchName] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState("");
  const church = churches.find(c => c.id === churchId);
  const canWrite = church?.role === "owner" || church?.role === "admin";
  const nameFor = (kind: Resource, id?: string) => entries[kind].find(item => item.id === id)?.name || "Não encontrado";

  const loadChurches = useCallback(async (current: User) => {
    const result = await api<{ churches: Church[] }>(current, "/api/churches");
    setChurches(result.churches);
    setChurchId(previous => result.churches.some(c => c.id === previous) ? previous : (result.churches[0]?.id || ""));
  }, []);
  const loadEntries = useCallback(async (current: User, id: string) => {
    const result = await Promise.all(resources.map(async resource => {
      const data = await api<{ entries: Entry[] }>(current, "/api/churches/" + encodeURIComponent(id) + "/" + resource);
      return [resource, data.entries] as const;
    }));
    setEntries(Object.fromEntries(result) as EntryMap);
  }, []);

  useEffect(() => {
    try {
      const unsubscribe = onAuthStateChanged(browserAuth(), async current => {
        if (!current) { router.replace("/volut/entrar"); return; }
        try {
          const claims = (await current.getIdTokenResult()).claims;
          if (claims.voluts !== true) { router.replace("/volut/entrar"); return; }
          setUser(current);
          await loadChurches(current);
        } catch (error) { setNotice(error instanceof Error ? error.message : "Não foi possível abrir seu painel."); }
        finally { setLoading(false); }
      });
      return unsubscribe;
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Falha na configuração do login.");
      setLoading(false);
    }
  }, [loadChurches, router]);

  useEffect(() => {
    if (!user || !churchId) { setEntries(empty); return; }
    void loadEntries(user, churchId).catch(error => setNotice(error instanceof Error ? error.message : "Falha ao carregar registros."));
  }, [user, churchId, loadEntries]);

  async function createChurch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    setWorking(true); setNotice("");
    try {
      const result = await api<{church: Church}>(user,"/api/churches",{name:churchName});
      setChurchName("");
      await loadChurches(user);
      setChurchId(result.church.id);
      setNotice("Sua igreja foi cadastrada.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Falha ao cadastrar igreja."); }
    finally { setWorking(false); }
  }
  async function createEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !churchId || !resources.includes(tab as Resource)) return;
    setWorking(true); setNotice("");
    try {
      let payload: object;
      if (tab === "ministries") payload = {name:form.name};
      else if (tab === "people") payload = {name:form.name,email:form.email,phone:form.phone,ministryId:form.ministryId};
      else if (tab === "events") payload = {name:form.name,date:form.date,time:form.time,ministryId:form.ministryId};
      else payload = {eventId:form.eventId,personId:form.personId};
      await api(user,"/api/churches/"+encodeURIComponent(churchId)+"/"+tab,payload);
      await loadEntries(user,churchId);
      setForm(cleanForm);
      setCreating(false);
      setNotice("Cadastro salvo com sucesso.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Falha ao salvar."); }
    finally { setWorking(false); }
  }

  async function changeShift(entryId: string, status: "confirmed" | "declined" | "checked_in") {
    if (!user || !churchId || !canWrite) return;
    setWorking(true); setNotice("");
    try {
      await api(user,"/api/churches/"+encodeURIComponent(churchId)+"/assignments/"+encodeURIComponent(entryId),{status},"PATCH");
      await loadEntries(user,churchId);
      setNotice(status==="checked_in"?"Presença registrada.":status==="confirmed"?"Presença confirmada.":"Escala recusada.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Não foi possível atualizar a escala."); }
    finally { setWorking(false); }
  }
  const update = (key: keyof Form, value: string) => setForm(prev => ({...prev,[key]:value}));
  const go = (next: Tab, openForm = false) => {
    setTab(next); setCreating(openForm); setForm(cleanForm); setSearch(""); setNotice(""); setMobileOpen(false);
  };
  const friendlyRole = church?.role === "owner" ? "Responsável" : church?.role === "admin" ? "Administrador" : "Membro";
  const mainPage = tab==="events" ? "planner" : tab==="availability" ? "people" : tab==="suggest" ? "assignments" : tab;
  const filteredEntries = resources.includes(tab as Resource) ? entries[tab as Resource].filter(entry => {
    const full = tab==="assignments" ? nameFor("people",entry.personId)+" "+nameFor("events",entry.eventId) : entry.name || "";
    return full.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR"));
  }) : [];
  const headerHelp:Record<Tab,string> = {
    overview:"O que está acontecendo na sua igreja.",
    planner:"Seus cultos e eventos, organizados por data.",
    events:"Cadastre um culto, reunião ou evento.",
    people:"Encontre voluntários e acompanhe sua equipe.",
    availability:"Defina os dias em que cada pessoa pode servir.",
    assignments:"Veja quem vai servir em cada programação.",
    suggest:"Escolha as pessoas certas para cada escala.",
    ministries:"Organize as equipes da igreja.",
    reports:"Acompanhe atividades e exporte informações."
  };
  const formatDate = (date?: string) => date ? date.split("-").reverse().join("/") : "A definir";
  const futureEvents = entries.events.filter(e => !e.date || e.date >= new Date().toISOString().slice(0,10)).sort((a,b) => (a.date || "").localeCompare(b.date || "")).slice(0,5);
  return <div className="dashboard simple-dashboard">
    <aside className={"sidebar simple-sidebar"+(mobileOpen?" mobile-expanded":"")}>
      <Link href="/" className="dashboard-brand" aria-label="Ir ao site da Velysoma Voluts">
        <img src="/brand/velysoma-voluts.svg" alt="Velysoma Voluts" width="185" height="48"/>
      </Link>
      <div className="simple-workspace"><span className="simple-workspace-dot">✦</span><div><strong>{church?.name || "Minha igreja"}</strong><small>Área de administração</small></div></div>
      <div className="simple-sidebar-title">PRINCIPAL</div>
      <nav className="sidebar-nav" aria-label="Páginas principais">
        {nav.map(item=><button key={item.id} type="button" className={mainPage===item.id?"selected":""}
          aria-current={mainPage===item.id?"page":undefined} onClick={()=>go(item.id)}>
          <span className="simple-nav-icon" aria-hidden="true">{item.icon}</span><span>{item.label}</span>
        </button>)}
      </nav>
      <div className="simple-sidebar-title simple-sidebar-title-secondary">OUTROS</div>
      <button className={"simple-secondary-nav"+(tab==="reports"?" selected":"")} type="button" onClick={()=>go("reports")}>
        <span className="simple-nav-icon" aria-hidden="true">▤</span><span>Relatórios</span>
      </button>
      <div className="sidebar-bottom"><span className="sidebar-dot"/> Conectado com Tera ID
        <Link href="/">Ir para o site ↗</Link>
      </div>
    </aside>

    <main className="dashboard-main simple-main">
      <header className="dash-top simple-topbar">
        <button type="button" className="simple-menu-toggle" aria-label={mobileOpen?"Fechar menu":"Abrir menu"} onClick={()=>setMobileOpen(!mobileOpen)}>☰</button>
        <div className="simple-topbar-title"><span className="simple-gold-point"/> VELYSOMA VOLUTS <span className="simple-topbar-divider">/</span> PAINEL</div>
        <div className="simple-user-actions">
          <span className="simple-role">{friendlyRole}</span>
          <button className="profile-button" type="button" onClick={()=>{void signOut(browserAuth()).then(()=>router.replace("/volut/entrar"));}}>Sair ↗</button>
        </div>
      </header>

      {loading?<div className="panel-loading">Carregando sua igreja…</div>:
      !user?<div className="empty-box"><h2>Entre para continuar</h2><Link href="/volut/entrar" className="btn btn-gold">Acessar com Tera ID ↗</Link></div>:
      churches.length===0?<div className="simple-setup"><span className="section-kicker">BEM-VINDO À VOLUTS</span><h1>Comece pela sua igreja.</h1><p>Digite o nome da igreja para organizar pessoas, cultos e escalas em um só lugar.</p>
        {notice&&<p className="notice error" role="alert">{notice}</p>}
        <form onSubmit={createChurch} className="setup-form"><label>Nome da igreja<input required minLength={3} maxLength={120} value={churchName} onChange={event=>setChurchName(event.target.value)} placeholder="Ex.: Igreja Esperança"/></label><button className="btn btn-gold" disabled={working} type="submit">{working?"Criando…":"Criar igreja ↗"}</button></form>
      </div>:
      <>
        <div className="simple-page-header">
          <div className="simple-header-info">
            {(tab==="events"||tab==="availability"||tab==="suggest")&&<button type="button" className="simple-back" onClick={()=>go(tab==="events"?"planner":tab==="availability"?"people":"assignments")}>← Voltar para {tab==="events"?"Agenda":tab==="availability"?"Pessoas":"Escalas"}</button>}
            <h1>{tab==="events"?"Novo evento":labels[tab]}</h1>
            <p>{headerHelp[tab]}</p>
          </div>
          <div className="simple-header-tools">
            <label className="simple-church-select"><span>Igreja</span><select value={churchId} onChange={e=>{setChurchId(e.target.value);setCreating(false);}} aria-label="Selecionar igreja">{churches.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></label>
            {canWrite&&tab==="planner"&&<button className="btn btn-gold simple-primary-action" type="button" onClick={()=>go("events",true)}>+ Novo evento</button>}
            {canWrite&&tab==="people"&&<button className="btn btn-gold simple-primary-action" type="button" onClick={()=>setCreating(!creating)}>{creating?"Fechar cadastro":"+ Nova pessoa"}</button>}
            {canWrite&&tab==="ministries"&&<button className="btn btn-gold simple-primary-action" type="button" onClick={()=>setCreating(!creating)}>{creating?"Fechar cadastro":"+ Novo ministério"}</button>}
            {canWrite&&tab==="assignments"&&<button className="btn btn-gold simple-primary-action" type="button" onClick={()=>setCreating(!creating)}>{creating?"Fechar cadastro":"+ Nova escala"}</button>}
          </div>
        </div>
        {notice&&<div className={"notice"+(/falha|não|erro|inválido|acesso|conflito/i.test(notice)?" error":"")} role="status">{notice}</div>}
        {tab==="overview"?<>
          <section className="simple-welcome">
            <div><span className="section-kicker">TUDO EM UM SÓ LUGAR</span><h2>Bem-vindo ao painel da sua igreja.</h2><p>Organize os próximos cultos, acompanhe pessoas e monte as escalas.</p></div>
            {canWrite&&<button type="button" className="btn btn-gold" onClick={()=>go("events",true)}>+ Criar programação</button>}
          </section>
          <section className="simple-stats" aria-label="Resumo da igreja">
            {[
              {label:"Pessoas",value:entries.people.length,icon:"♙",target:"people" as Tab},
              {label:"Eventos",value:entries.events.length,icon:"▦",target:"planner" as Tab},
              {label:"Escalas",value:entries.assignments.filter(a=>a.status!=="declined").length,icon:"☷",target:"assignments" as Tab}
            ].map(card=><button type="button" key={card.label} className="simple-stat" onClick={()=>go(card.target)}>
              <span className="simple-stat-icon" aria-hidden="true">{card.icon}</span>
              <strong>{String(card.value).padStart(2,"0")}</strong><span>{card.label}</span><span className="simple-stat-arrow">↗</span>
            </button>)}
          </section>
          <section className="simple-home-grid">
            <article className="dash-panel simple-card"><div className="simple-card-heading"><div><h2>Próximas programações</h2><p>Seus próximos cultos e eventos</p></div><button type="button" className="text-action" onClick={()=>go("planner")}>Abrir agenda ↗</button></div>
              {futureEvents.length===0?<div className="simple-empty"><span>▦</span><strong>Sua agenda está vazia.</strong><p>Comece cadastrando um culto ou reunião.</p>{canWrite&&<button className="simple-text-link" type="button" onClick={()=>go("events",true)}>Criar primeiro evento ↗</button>}</div>:futureEvents.map(e=><div className="simple-event-row" key={e.id}>
                <div className="simple-date-box"><b>{e.date?.slice(8,10)||"–"}</b><small>{e.date?.slice(5,7)||"–"}</small></div>
                <div><strong>{e.name}</strong><small>{formatDate(e.date)} · {e.time||"Horário a definir"}</small></div>
                <span className="simple-event-arrow">↗</span></div>)}
            </article>
            <article className="dash-panel simple-card simple-start-card"><h2>Acesso rápido</h2><p>O que você precisa fazer hoje?</p>
              <button type="button" onClick={()=>go("people")}><span aria-hidden="true">♙</span> Ver pessoas <b>↗</b></button>
              <button type="button" onClick={()=>go("assignments")}><span aria-hidden="true">☷</span> Organizar escalas <b>↗</b></button>
              <button type="button" onClick={()=>go("planner")}><span aria-hidden="true">▦</span> Abrir calendário <b>↗</b></button>
            </article>
          </section>
        </>:
        tab==="planner"||tab==="availability"||tab==="suggest"||tab==="reports"?<>
          {tab==="planner"&&<div className="simple-context-nav">
            <button type="button" className="simple-tab-active">Calendário</button>
            <button type="button" onClick={()=>go("events",false)}>Ver eventos em lista ↗</button>
          </div>}
          <Extras key={churchId} tab={tab} user={user} churchId={churchId} entries={entries} canWrite={Boolean(canWrite)} reload={()=>loadEntries(user,churchId)}/>
        </>:
        <>
          <div className="simple-content-navigation">
            {(tab==="people"||tab==="assignments")&&<div className="simple-context-nav">
              <button type="button" className="simple-tab-active">{tab==="people"?"Pessoas cadastradas":"Escalas cadastradas"}</button>
              <button type="button" onClick={()=>go(tab==="people"?"availability":"suggest")}>{tab==="people"?"Disponibilidade":"Sugestões de escala"} ↗</button>
            </div>}
            {(tab==="events")&&<div className="simple-context-nav">
              <button type="button" onClick={()=>go("planner")}>← Calendário</button>
              <button type="button" className="simple-tab-active">Programações</button>
            </div>}
            {!creating&&<span className="simple-record-count">{filteredEntries.length} {filteredEntries.length===1?"registro":"registros"}</span>}
          </div>
          <div className={"simple-resource-layout"+(creating?" is-creating":"")}>
            <section className="dash-panel simple-card simple-list">
              <div className="simple-card-heading">
                <div><h2>{tab==="events"?"Programações":tab==="people"?"Pessoas da igreja":tab==="assignments"?"Escalas registradas":"Equipes e ministérios"}</h2>
                  <p>{tab==="people"?"Cadastros da sua comunidade":tab==="assignments"?"Quem serve em cada culto":tab==="events"?"Próximos cultos, reuniões e encontros":"Organização das equipes"}</p></div>
                {tab!=="events"&&<input className="simple-search" type="search" aria-label="Pesquisar registros" placeholder="Buscar…" value={search} onChange={e=>setSearch(e.target.value)}/>}
              </div>
              {filteredEntries.length===0?<div className="simple-empty"><span>◎</span><strong>{search?"Nenhum resultado encontrado.":"Nada por aqui ainda."}</strong><p>{search?"Tente outro termo.":"Use o botão de novo cadastro para começar."}</p></div>:
                <div className="simple-list-rows">{filteredEntries.map(e=><div className="simple-list-row" key={e.id}>
                  <span className="simple-entry-icon" aria-hidden="true">{tab==="people"?"♙":tab==="ministries"?"◎":tab==="events"?"▦":"☷"}</span>
                  <div className="simple-entry-info">
                    <strong>{tab==="assignments"?nameFor("people",e.personId)+" · "+nameFor("events",e.eventId):e.name}</strong>
                    <small>{tab==="events"?formatDate(e.date)+" às "+(e.time||"—"):tab==="people"?(entries.ministries.find(m=>m.id===e.ministryId)?.name||"Sem ministério"):tab==="assignments"?(entries.events.find(x=>x.id===e.eventId)?.date||"Data a definir"):"Ministério da igreja"}</small>
                  </div>
                  {tab==="assignments"?<div className="shift-actions">
                    <span className="shift-status">{e.status==="checked_in"?"Presente":e.status==="confirmed"?"Confirmado":e.status==="declined"?"Recusado":"Pendente"}</span>
                    {canWrite&&e.status!=="checked_in"&&e.status!=="declined"&&<>
                      {e.status!=="confirmed"&&<button type="button" disabled={working} onClick={()=>void changeShift(e.id,"confirmed")}>Confirmar</button>}
                      {e.status==="confirmed"&&<button type="button" disabled={working} onClick={()=>void changeShift(e.id,"checked_in")}>Check-in</button>}
                      <button type="button" disabled={working} onClick={()=>void changeShift(e.id,"declined")}>Recusar</button>
                    </>}
                  </div>:<span className="simple-row-status">Ativo</span>}
                </div>)}</div>}
            </section>
            {canWrite&&creating&&<section className="dash-panel simple-card simple-create-card">
              <div className="simple-card-heading"><div><span className="section-kicker">NOVO CADASTRO</span><h2>{tab==="assignments"?"Adicionar voluntário":tab==="events"?"Nova programação":tab==="people"?"Nova pessoa":"Novo ministério"}</h2></div><button type="button" className="simple-close" aria-label="Fechar formulário" onClick={()=>setCreating(false)}>×</button></div>
              <form onSubmit={createEntry} className="entry-form">
                {tab!=="assignments"&&<label>Nome<input required minLength={2} maxLength={140} value={form.name} onChange={e=>update("name",e.target.value)} placeholder={tab==="people"?"Nome completo":tab==="events"?"Nome do evento":"Nome do ministério"}/></label>}
                {tab==="people"&&<><label>E-mail <small>(opcional)</small><input type="email" value={form.email} onChange={e=>update("email",e.target.value)} placeholder="nome@email.com"/></label><label>Telefone <small>(opcional)</small><input type="tel" value={form.phone} onChange={e=>update("phone",e.target.value)} placeholder="(11) 99999-9999"/></label></>}
                {tab==="events"&&<div className="form-row"><label>Data<input type="date" required value={form.date} onChange={e=>update("date",e.target.value)}/></label><label>Horário<input type="time" value={form.time} onChange={e=>update("time",e.target.value)}/></label></div>}
                {(tab==="people"||tab==="events")&&<label>Ministério <small>(opcional)</small><select value={form.ministryId} onChange={e=>update("ministryId",e.target.value)}><option value="">Sem ministério</option>{entries.ministries.map(m=><option value={m.id} key={m.id}>{m.name}</option>)}</select></label>}
                {tab==="assignments"&&<><label>Programação<select required value={form.eventId} onChange={e=>update("eventId",e.target.value)}><option value="">Selecione um evento</option>{entries.events.map(e=><option value={e.id} key={e.id}>{e.name} · {formatDate(e.date)}</option>)}</select></label><label>Voluntário<select required value={form.personId} onChange={e=>update("personId",e.target.value)}><option value="">Selecione uma pessoa</option>{entries.people.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select></label></>}
                <button className="btn btn-gold btn-block" disabled={working} type="submit">{working?"Salvando…":"Salvar cadastro ↗"}</button>
              </form>
            </section>}
          </div>
          {tab==="events"&&!creating&&canWrite&&<button type="button" className="btn btn-gold simple-inline-create" onClick={()=>setCreating(true)}>+ Adicionar evento</button>}
        </>}
      </>}
    </main>
  </div>;
}
