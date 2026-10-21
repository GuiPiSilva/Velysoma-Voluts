"use client";
import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import type { Resource, Entry } from "@/lib/resources";

type EntryMap = Record<Resource, Entry[]>;
type ExtraTab = "availability" | "planner" | "suggest" | "reports";
type Availability = { personId: string; weekdays: number[]; blockedDates: string[] };
type Suggestion = { personId: string; name: string; eligible: boolean; preference: string; served: number; reason: string };
type Props = { tab: ExtraTab; user: User; churchId: string; entries: EntryMap; canWrite: boolean; reload: () => Promise<void> };
const weekdays = [{id:0,label:"Dom"},{id:1,label:"Seg"},{id:2,label:"Ter"},{id:3,label:"Qua"},{id:4,label:"Qui"},{id:5,label:"Sex"},{id:6,label:"Sáb"}];
const csvCell = (value: unknown) => {
  let text = String(value ?? "");
  if (/^[\s]*[=+@\-]/.test(text)) text = "'" + text; // Proteção contra fórmulas no Excel.
  return '"' + text.replaceAll('"', '""') + '"';
};
const churchApi = (churchId: string, endpoint: string) => "/api/churches/" + encodeURIComponent(churchId) + "/" + endpoint;
async function request<T>(user: User,url: string,payload?: object) {
  const result = await fetch(url,{
    method: payload ? "POST" : "GET",cache:"no-store",
    headers:{Authorization:"Bearer " + await user.getIdToken(),...(payload?{"Content-Type":"application/json"}:{})},
    ...(payload?{body:JSON.stringify(payload)}:{})
  });
  const data = await result.json().catch(()=>({}));
  if(!result.ok)throw new Error(data.message || "Não foi possível concluir a operação.");
  return data as T;
}
function downloadCsv(fileName: string, rows: unknown[][]) {
  const csv = "\uFEFF" + rows.map(row=>row.map(csvCell).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8;"}));
  const anchor = document.createElement("a");
  anchor.href=url;anchor.download=fileName;anchor.click();
  URL.revokeObjectURL(url);
}
export function Extras({tab,user,churchId,entries,canWrite,reload}:Props) {
  const [availability,setAvailability] = useState<Availability[]>([]);
  const [personId,setPersonId] = useState("");
  const [selectedDays,setSelectedDays] = useState<number[]>([]);
  const [blockedText,setBlockedText] = useState("");
  const [selectedEvent,setSelectedEvent] = useState("");
  const [suggestions,setSuggestions] = useState<Suggestion[]>([]);
  const [month,setMonth] = useState(()=>new Date().toISOString().slice(0,7));
  const [selectedDate,setSelectedDate] = useState("");
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState("");
  const [query,setQuery] = useState("");
  const [availabilityLoading,setAvailabilityLoading] = useState(true);

  async function reloadAvailability() {
    const response=await request<{availability:Availability[]}>(user,churchApi(churchId,"availability"));
    setAvailability(response.availability);
  }
  useEffect(()=>{
    let active=true;
    setAvailabilityLoading(true);
    void request<{availability:Availability[]}>(user,churchApi(churchId,"availability"))
      .then(r=>{if(active)setAvailability(r.availability);})
      .catch(error=>{if(active)setMessage(error instanceof Error?error.message:"Falha ao carregar disponibilidade.");})
      .finally(()=>{if(active)setAvailabilityLoading(false);});
    return ()=>{active=false;};
  },[user,churchId]);
  useEffect(()=>{
    const current=availability.find(a=>a.personId===personId);
    setSelectedDays(current?.weekdays||[]);
    setBlockedText((current?.blockedDates||[]).join(", "));
  },[personId,availability]);

  async function saveAvailability(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();if(!canWrite||!personId)return;
    setBusy(true);setMessage("");
    try{
      const dates=blockedText.split(/[,;\s]+/).map(s=>s.trim()).filter(Boolean);
      await request(user,churchApi(churchId,"availability"),{personId,weekdays:selectedDays,blockedDates:dates});
      await reloadAvailability();setMessage("Disponibilidade salva.");
    }catch(error){setMessage(error instanceof Error?error.message:"Não foi possível salvar.");}
    finally{setBusy(false);}
  }
  async function recommend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();if(!selectedEvent)return;
    setBusy(true);setMessage("");setSuggestions([]);
    try{
      const data=await request<{suggestions:Suggestion[]}>(user,churchApi(churchId,"suggest?eventId="+encodeURIComponent(selectedEvent)));
      setSuggestions(data.suggestions);
      setMessage("Sugestões calculadas. Confira antes de escalar.");
    }catch(error){setMessage(error instanceof Error?error.message:"Não foi possível gerar sugestões.");}
    finally{setBusy(false);}
  }
  async function schedule(person: Suggestion) {
    if(!canWrite||!selectedEvent||!person.eligible)return;
    setBusy(true);setMessage("");
    try{
      await request(user,churchApi(churchId,"assignments"),{eventId:selectedEvent,personId:person.personId});
      await reload();
      setSuggestions(old=>old.map(item=>item.personId===person.personId?{...item,eligible:false,reason:"Incluído na escala"}:item));
      setMessage(person.name+" foi incluído na escala.");
    }catch(error){setMessage(error instanceof Error?error.message:"Falha ao incluir na escala.");}
    finally{setBusy(false);}
  }
  function shiftMonth(delta:number) {
    const [year,m]=month.split("-").map(Number);
    const d=new Date(Date.UTC(year,m-1+delta,1));
    setMonth(d.toISOString().slice(0,7));
  }
  const [year,monthNum]=month.split("-").map(Number);
  const firstDay=new Date(Date.UTC(year,monthNum-1,1)).getUTCDay();
  const daysInMonth=new Date(Date.UTC(year,monthNum,0)).getUTCDate();
  const headingMonth=new Intl.DateTimeFormat("pt-BR",{month:"long",year:"numeric",timeZone:"UTC"}).format(new Date(month+"-01T12:00:00Z"));
  const filtered=entries.events.filter(e=>e.name?.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR"))||e.date?.includes(query));
  const monthly=entries.events.filter(e=>e.date?.startsWith(month));
  const activeShifts=entries.assignments.filter(a=>a.status!=="declined");
  const confirmed=entries.assignments.filter(a=>a.status==="confirmed"||a.status==="checked_in").length;
  const checked=entries.assignments.filter(a=>a.status==="checked_in").length;

  return <section className="extras-shell">
    {message&&<div className={"notice"+(/falha|não|erro|inválid|conflito/i.test(message)?" error":"")} role="status">{message}</div>}
    {tab==="availability"&&<>
      <div className="extra-intro"><span className="section-kicker">PLANEJAMENTO DA EQUIPE</span><h2>Disponibilidade dos voluntários</h2><p>Registre os dias em que cada pessoa pode servir e bloqueie datas específicas. Por enquanto, o responsável da igreja administra essas preferências.</p></div>
      <div className="extra-columns">
        <article className="dash-panel"><h2>Preferências semanais</h2>{!canWrite?<p className="empty-state">Somente administradores podem alterar a disponibilidade.</p>:<form className="entry-form" onSubmit={saveAvailability}>
          <label>Voluntário<select required value={personId} onChange={e=>setPersonId(e.target.value)}><option value="">Selecione a pessoa</option>{entries.people.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select></label>
          <span className="extra-field-label">Dias disponíveis</span>
          <div className="weekday-selector">{weekdays.map(day=><label key={day.id} className={selectedDays.includes(day.id)?"checked":""}><input disabled={!personId} type="checkbox" checked={selectedDays.includes(day.id)} onChange={e=>setSelectedDays(current=>e.target.checked?[...current,day.id]:current.filter(x=>x!==day.id))}/>{day.label}</label>)}</div>
          <label>Datas bloqueadas (AAAA-MM-DD, separadas por vírgula)<textarea disabled={!personId} value={blockedText} rows={3} onChange={e=>setBlockedText(e.target.value)} placeholder="2026-12-24, 2026-12-31"/></label>
          <button type="submit" className="btn btn-gold btn-block" disabled={busy||!personId}>{busy?"Salvando…":"Salvar disponibilidade →"}</button>
        </form>}</article>
        <article className="dash-panel"><h2>Resumo da equipe</h2>{availabilityLoading?<p className="empty-state">Carregando…</p>:entries.people.length===0?<p className="empty-state">Cadastre voluntários para organizar a disponibilidade.</p>:<div className="extra-list">{entries.people.map(p=>{
          const a=availability.find(item=>item.personId===p.id);
          return <div className="extra-row" key={p.id}><div><strong>{p.name}</strong><small>{a? a.weekdays.length?weekdays.filter(d=>a.weekdays.includes(d.id)).map(d=>d.label).join(" · "):"Nenhum dia semanal selecionado":"Ainda não informada"}{a?.blockedDates.length?" · "+a.blockedDates.length+" bloqueios":""}</small></div>{canWrite&&<button type="button" className="text-action" onClick={()=>setPersonId(p.id)}>Editar ↗</button>}</div>;
        })}</div>}</article>
      </div>
    </>}
    {tab==="planner"&&<>
      <div className="simple-calendar-layout">
        <article className="dash-panel simple-calendar">
          <div className="calendar-head">
            <div><h2>Calendário</h2><p>Visualize os cultos e encontros do mês.</p></div>
            <div><button type="button" aria-label="Mês anterior" onClick={()=>shiftMonth(-1)}>‹</button><span>{headingMonth}</span><button type="button" aria-label="Mês seguinte" onClick={()=>shiftMonth(1)}>›</button></div>
          </div>
          <div className="month-grid" role="group" aria-label={"Calendário de "+headingMonth}>
            {weekdays.map(d=><span className="weekday-title" key={d.id}>{d.label}</span>)}
            {Array.from({length:firstDay},(_,i)=><div className="calendar-blank" key={"blank-"+i}/>)}
            {Array.from({length:daysInMonth},(_,i)=>{
              const date=month+"-"+String(i+1).padStart(2,"0");
              const events=monthly.filter(item=>item.date===date);
              return <button type="button" aria-pressed={selectedDate===date} aria-label={String(i+1)+" de "+headingMonth+", "+events.length+" eventos"}
                className={"calendar-day simple-calendar-cell"+(events.length?" has-events":"")+(selectedDate===date?" day-selected":"")}
                onClick={()=>setSelectedDate(date)} key={date}>
                <b>{i+1}</b>{events.slice(0,2).map(e=><span title={e.name} key={e.id}>{e.name}</span>)}{events.length>2&&<small>+{events.length-2} mais</small>}
              </button>;
            })}
          </div>
        </article>
        <article className="dash-panel simple-calendar-aside">
          <div className="section-kicker">PROGRAMAÇÕES</div>
          <h2>{selectedDate ? "Dia "+selectedDate.slice(8,10)+"/"+selectedDate.slice(5,7) : "Neste mês"}</h2>
          <p>{selectedDate?"Eventos marcados para o dia selecionado.":"Clique em um dia para ver os eventos."}</p>
          <div className="extra-list">{monthly.filter(e=>!selectedDate||e.date===selectedDate).sort((a,b)=>(a.date||"").localeCompare(b.date||"")||(a.time||"").localeCompare(b.time||"")).slice(0,15).map(e=><div className="extra-row" key={e.id}><div><strong>{e.name}</strong><small>{e.date?.split("-").reverse().join("/")||"Sem data"} · {e.time||"Horário a definir"}</small></div><span className="simple-tiny-dot"/></div>)}
          {monthly.filter(e=>!selectedDate||e.date===selectedDate).length===0&&<div className="simple-empty"><span>▦</span><strong>Sem eventos neste período.</strong><p>Crie uma nova programação pela Agenda.</p></div>}</div>
          {selectedDate&&<button type="button" className="text-action" onClick={()=>setSelectedDate("")}>Ver o mês inteiro ↗</button>}
        </article>
      </div>
    </>}
    {tab==="suggest"&&<>
      <div className="extra-intro simple-extra-intro"><h2>Quem pode servir?</h2><p>Selecione a programação. A Voluts considera conflitos conhecidos, ministério e disponibilidade de cada pessoa.</p></div>
      <article className="dash-panel simple-suggest-card"><div className="section-kicker">ESCALA ASSISTIDA</div>
        <h2>Encontrar voluntários</h2>
        <form className="entry-form" onSubmit={recommend}><label>Programação<select required value={selectedEvent} onChange={e=>{setSelectedEvent(e.target.value);setSuggestions([]);}}><option value="">Selecione um evento</option>{entries.events.map(e=><option value={e.id} key={e.id}>{e.name} · {e.date} {e.time}</option>)}</select></label><button type="submit" disabled={busy||!selectedEvent} className="btn btn-gold">{busy?"Buscando…":"Mostrar sugestões →"}</button></form>
        <p className="planner-note">As sugestões são orientativas; nenhuma escala é criada sem sua confirmação.</p>
        {suggestions.length>0&&<div className="extra-list suggestion-list">{suggestions.map(s=><div className="extra-row" key={s.personId}><div><strong>{s.name}</strong><small>{s.reason} · {s.served} escala(s)</small></div>{s.eligible&&canWrite?<button type="button" className="text-action" disabled={busy} onClick={()=>void schedule(s)}>Escalar +</button>:<span className="status-tag">{s.eligible?"Disponível":"Não disponível"}</span>}</div>)}</div>}
        {suggestions.length===0&&!busy&&<div className="simple-empty"><span>♙</span><strong>Nenhuma sugestão ainda.</strong><p>Escolha uma programação e clique no botão acima.</p></div>}
      </article>
    </>}
    {tab==="reports"&&<>
      <div className="extra-intro"><span className="section-kicker">ACOMPANHAMENTO DE EQUIPES</span><h2>Relatórios e exportação</h2><p>Consulte os totais da igreja e, como administrador, exporte os registros para uma planilha CSV.</p></div>
      <div className="report-grid">{[
        {label:"Pessoas cadastradas",value:entries.people.length},
        {label:"Programações",value:entries.events.length},
        {label:"Escalas ativas",value:activeShifts.length},
        {label:"Confirmadas",value:confirmed},
        {label:"Check-ins",value:checked}
      ].map(r=><div className="stat" key={r.label}><div className="stat-line"><span>{r.label}</span><b>✦</b></div><strong>{r.value}</strong><small>Na igreja selecionada</small></div>)}</div>
      <article className="dash-panel"><div className="panel-top"><div><span className="section-kicker">DADOS PARA CONSULTA</span><h2>Exportar relatórios</h2></div></div>
        {!canWrite?<p className="empty-state">Somente responsáveis autorizados podem exportar os dados.</p>:<div className="export-actions">
          <button className="btn btn-outline" onClick={()=>downloadCsv("voluts-pessoas.csv",[["Nome","E-mail","Telefone","Ministério"],...entries.people.map(p=>[p.name,p.email,p.phone,entries.ministries.find(m=>m.id===p.ministryId)?.name||""])])}>Exportar pessoas ↗</button>
          <button className="btn btn-outline" onClick={()=>downloadCsv("voluts-programacoes.csv",[["Nome","Data","Hora","Ministério"],...entries.events.map(e=>[e.name,e.date,e.time,entries.ministries.find(m=>m.id===e.ministryId)?.name||""])])}>Exportar eventos ↗</button>
          <button className="btn btn-outline" onClick={()=>downloadCsv("voluts-escalas.csv",[["Evento","Data","Pessoa","Status","Check-in"],...entries.assignments.map(a=>[entries.events.find(e=>e.id===a.eventId)?.name||"",entries.events.find(e=>e.id===a.eventId)?.date||"",entries.people.find(p=>p.id===a.personId)?.name||"",a.status,a.checkInAt||""])])}>Exportar escalas ↗</button>
        </div>}
        <p className="planner-note">Exportação baseada nos registros carregados (até 100 por módulo nesta versão). Trate dados de pessoas como informações privadas.</p>
      </article>
      <article className="dash-panel"><div className="panel-top"><h2>Programações recentes</h2><input className="report-search" placeholder="Pesquisar nome ou data" aria-label="Pesquisar programações" value={query} onChange={e=>setQuery(e.target.value)}/></div><div className="extra-list">{filtered.slice(0,12).map(e=><div className="extra-row" key={e.id}><div><strong>{e.name}</strong><small>{e.date} · {e.time||"Hora a definir"}</small></div><span className="status-tag">{entries.assignments.filter(s=>s.eventId===e.id&&s.status!=="declined").length} escalados</span></div>)}{filtered.length===0&&<p className="empty-state">Nenhuma programação encontrada.</p>}</div></article>
    </>}
  </section>;
}
