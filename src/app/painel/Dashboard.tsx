"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { browserAuth } from "@/lib/firebase/client";
import { resources, resourceNames, type Resource, type Entry } from "@/lib/resources";

type Church = { id: string; name: string; role: string };
type Tab = "overview" | Resource;
type EntryMap = Record<Resource, Entry[]>;
type Form = { name: string; ministryId: string; email: string; phone: string; date: string; time: string; eventId: string; personId: string };
const cleanForm: Form = { name:"", ministryId:"", email:"", phone:"", date:"", time:"", eventId:"", personId:"" };
const empty: EntryMap = { ministries: [], people: [], events: [], assignments: [] };
const nav: { id: Tab; label: string; icon: string }[] = [
  {id:"overview",label:"Visão geral",icon:"◈"},
  {id:"people",label:"Pessoas",icon:"♙"},
  {id:"ministries",label:"Ministérios",icon:"✦"},
  {id:"events",label:"Programações",icon:"▦"},
  {id:"assignments",label:"Escalas",icon:"☷"}
];

async function api<T>(user: User, url: string, payload?: unknown): Promise<T> {
  const response = await fetch(url, {
    method: payload ? "POST" : "GET", cache: "no-store",
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
    if (!user || !churchId || tab === "overview") return;
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
      setNotice("Cadastro salvo com sucesso.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Falha ao salvar."); }
    finally { setWorking(false); }
  }

  const update = (key: keyof Form, value: string) => setForm(prev => ({...prev,[key]:value}));
  const formatDate = (date?: string) => date ? date.split("-").reverse().join("/") : "A definir";
  const futureEvents = entries.events.filter(e => !e.date || e.date >= new Date().toISOString().slice(0,10)).sort((a,b) => (a.date || "").localeCompare(b.date || "")).slice(0,5);
  return <div className="dashboard">
    <aside className="sidebar">
      <Link href="/" className="dashboard-brand"><img src="/brand/velysoma-voluts.svg" alt="Velysoma Voluts" width="185" height="48"/></Link>
      <div className="sidebar-caption">ESPAÇO DA IGREJA</div>
      <nav className="sidebar-nav" aria-label="Navegação do sistema">{nav.map(n => <button type="button" key={n.id} onClick={() => {setTab(n.id);setNotice("");setForm(cleanForm);}} className={tab===n.id?"selected":""} aria-current={tab===n.id?"page":undefined}><span aria-hidden="true">{n.icon}</span>{n.label}</button>)}</nav>
      <div className="sidebar-bottom"><span className="sidebar-dot"/> Conta conectada à Tera ID <Link href="/">Voltar ao site ↗</Link></div>
    </aside>
    <main className="dashboard-main">
      <div className="dash-top"><div className="top-breadcrumb">VELYSOMA VOLUTS <span>/</span> {tab==="overview"?"INÍCIO":resourceNames[tab].toUpperCase()}</div><button className="profile-button" type="button" onClick={() => {void signOut(browserAuth()).then(() => router.replace("/volut/entrar"));}}>Sair <span aria-hidden="true">↗</span></button></div>
      <div className="dash-heading"><div><div className="section-kicker">SUA COMUNIDADE EM UM SÓ LUGAR</div><h1>{tab==="overview"?"Visão geral":resourceNames[tab]}</h1><p>{church ? church.name : "Comece cadastrando sua primeira igreja."}</p></div>{churches.length>0 && <label className="church-picker">IGREJA ATIVA<select value={churchId} onChange={event=>setChurchId(event.target.value)}>{churches.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}</div>
      {notice && <div className={"notice"+(/falha|não|erro|inválido|acesso/i.test(notice)?" error":"")} role="status">{notice}</div>}
      {loading ? <div className="panel-loading">Carregando seu espaço…</div> :
        !user ? <div className="empty-box"><h2>Precisamos conectar sua Tera ID.</h2><Link className="btn btn-gold" href="/volut/entrar">Ir para o login →</Link></div> :
        churches.length===0 ? <div className="setup"><span className="setup-icon">✦</span><div className="section-kicker">PRIMEIROS PASSOS</div><h2>Vamos começar pela sua igreja.</h2><p>Cadastre o nome da sua comunidade para criar seu próprio espaço, separado das demais igrejas.</p><form onSubmit={createChurch} className="setup-form"><label>Nome da igreja<input required minLength={3} maxLength={120} value={churchName} onChange={event=>setChurchName(event.target.value)} placeholder="Ex.: Comunidade Vida"/></label><button type="submit" className="btn btn-gold" disabled={working}>{working?"Salvando…":"Criar minha igreja →"}</button></form></div> :
        tab==="overview" ? <>
          <div className="stat-grid">{[
            {label:"Pessoas",value:entries.people.length,icon:"♙"},
            {label:"Ministérios",value:entries.ministries.length,icon:"✦"},
            {label:"Programações",value:entries.events.length,icon:"▦"},
            {label:"Escalas",value:entries.assignments.length,icon:"☷"}
          ].map(stat=><article className="stat" key={stat.label}><div className="stat-line"><span>{stat.label}</span><b>{stat.icon}</b></div><strong>{String(stat.value).padStart(2,"0")}</strong><small>Cadastros nesta igreja</small></article>)}</div>
          <div className="dash-panels"><section className="dash-panel"><div className="panel-top"><div><span className="section-kicker">AGENDA DA IGREJA</span><h2>Próximas programações</h2></div><button className="text-action" type="button" onClick={()=>setTab("events")}>Ver todas ↗</button></div>{futureEvents.length ? futureEvents.map(e=><div key={e.id} className="event-line"><span className="event-date"><strong>{(e.date||"").slice(8,10)||"--"}</strong>{(e.date||"").slice(5,7)||"--"}</span><div><strong>{e.name}</strong><small>{formatDate(e.date)} · {e.time||"Horário a definir"}</small></div><span className="status-tag">Programação</span></div>) : <p className="empty-state">Nenhuma programação cadastrada. Comece criando seu primeiro culto ou evento.</p>}</section><section className="dash-panel next-card"><span className="section-kicker">COMECE POR AQUI</span><h2>Um passo de cada vez.</h2><p>Cadastre primeiro os ministérios, depois as pessoas, crie programações e monte suas escalas.</p><div className="quick-list">{resources.map((r,i)=><button key={r} type="button" onClick={()=>setTab(r)}><span>{String(i+1).padStart(2,"0")}</span>{resourceNames[r]} <b>↗</b></button>)}</div></section></div>
        </> :
        <div className="dash-panels resource-layout"><section className="dash-panel"><div className="panel-top"><div><span className="section-kicker">CADASTROS DA IGREJA</span><h2>{resourceNames[tab]}</h2></div><span className="counter">{entries[tab].length} registros</span></div><div className="entries-list">{entries[tab].length===0 ? <p className="empty-state">Ainda não há registros neste módulo.</p> : entries[tab].map(e=><div className="entry" key={e.id}><span className="entry-avatar">{tab==="people"?"♙":tab==="ministries"?"✦":tab==="events"?"▦":"☷"}</span><div><strong>{tab==="assignments"?nameFor("people",e.personId)+" · "+nameFor("events",e.eventId):e.name}</strong><small>{tab==="events"?formatDate(e.date)+" · "+(e.time||"Horário a definir"):tab==="people"?nameFor("ministries",e.ministryId)||"":tab==="assignments"?"Voluntário escalado":"Ministério cadastrado"}</small></div><span className="status-tag">Ativo</span></div>)}</div></section>
          <section className="dash-panel"><span className="section-kicker">NOVO REGISTRO</span><h2>{tab==="assignments"?"Adicionar à escala":"Cadastrar "+resourceNames[tab].toLowerCase()}</h2>{!canWrite?<p className="empty-state">Sua função nesta igreja permite apenas consultar os registros.</p>:<form onSubmit={createEntry} className="entry-form">
          {tab!=="assignments" && <label>Nome<input required minLength={2} maxLength={140} value={form.name} onChange={e=>update("name",e.target.value)} placeholder={tab==="people"?"Nome completo":tab==="events"?"Nome do culto ou evento":"Nome do ministério"}/></label>}
          {tab==="people" && <><label>E-mail (opcional)<input type="email" value={form.email} onChange={e=>update("email",e.target.value)} placeholder="exemplo@email.com"/></label><label>Telefone (opcional)<input type="tel" value={form.phone} onChange={e=>update("phone",e.target.value)} placeholder="(11) 99999-9999"/></label></>}
          {tab==="events" && <div className="form-row"><label>Data<input required type="date" value={form.date} onChange={e=>update("date",e.target.value)}/></label><label>Hora<input type="time" value={form.time} onChange={e=>update("time",e.target.value)}/></label></div>}
          {(tab==="people"||tab==="events") && <label>Ministério (opcional)<select value={form.ministryId} onChange={e=>update("ministryId",e.target.value)}><option value="">Sem ministério</option>{entries.ministries.map(m=><option value={m.id} key={m.id}>{m.name}</option>)}</select></label>}
          {tab==="assignments" && <><label>Programação<select required value={form.eventId} onChange={e=>update("eventId",e.target.value)}><option value="">Selecione a programação</option>{entries.events.map(e=><option key={e.id} value={e.id}>{e.name} · {formatDate(e.date)}</option>)}</select></label><label>Voluntário<select required value={form.personId} onChange={e=>update("personId",e.target.value)}><option value="">Selecione uma pessoa</option>{entries.people.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label></>}
          <button className="btn btn-gold btn-block" disabled={working} type="submit">{working?"Salvando…":"Salvar cadastro →"}</button></form>}</section></div>}
    </main>
  </div>;
}
