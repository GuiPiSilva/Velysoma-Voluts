import { type NextRequest } from "next/server";
import { apiError, churchAccess } from "@/lib/access";
import { availabilityFor, overlaps, shiftActive, type CalendarEvent, type Availability } from "@/lib/scheduling";
type Context = {params:Promise<{churchId:string}>};
type Row={id:string;[key:string]:unknown};
export async function GET(request:NextRequest,{params}:Context) {
  try{
    const {ref}=await churchAccess(request,(await params).churchId);
    const eventId=request.nextUrl.searchParams.get("eventId")||"";
    if(!/^[A-Za-z0-9_-]{10,100}$/.test(eventId))return Response.json({message:"Selecione uma programação."},{status:400});
    const [target,peopleDocs,eventDocs,assignmentDocs,availabilityDocs]=await Promise.all([
      ref.collection("events").doc(eventId).get(),
      ref.collection("people").limit(300).get(),
      ref.collection("events").limit(300).get(),
      ref.collection("assignments").limit(700).get(),
      ref.collection("availability").limit(300).get()
    ]);
    if(!target.exists)return Response.json({message:"Programação não encontrada."},{status:404});
    const event={id:target.id,...target.data()} as CalendarEvent&{ministryId?:string};
    const people=peopleDocs.docs.map(d=>({id:d.id,...d.data()})) as Row[];
    const events=new Map(eventDocs.docs.map(d=>[d.id,{id:d.id,...d.data()} as CalendarEvent]));
    const assignments=assignmentDocs.docs.map(d=>({id:d.id,...d.data()})) as Row[];
    const availability=new Map(availabilityDocs.docs.map(d=>[d.id,d.data() as Availability]));
    const results=people.filter(person=>!event.ministryId||person.ministryId===event.ministryId).map(person=>{
      const shifts=assignments.filter(a=>a.personId===person.id);
      const isAlready=shifts.some(s=>s.eventId===eventId);
      const clash=shifts.some(s=>s.eventId!==eventId&&shiftActive(s.status as string)&&
        overlaps(event,events.get(s.eventId as string)||{}));
      const preference=availabilityFor(event,availability.get(person.id));
      const served=shifts.filter(s=>shiftActive(s.status as string)).length;
      const eligible=!isAlready&&!clash&&preference!=="unavailable";
      return {personId:person.id,name:String(person.name||"Pessoa"),eligible,
        preference,served,reason:isAlready?"Já está na escala":clash?"Conflito de horário":
        preference==="unavailable"?"Indisponível":preference==="unknown"?"Disponibilidade não informada":"Disponível"};
    }).sort((a,b)=>Number(b.eligible)-Number(a.eligible)||Number(b.preference==="available")-Number(a.preference==="available")||a.served-b.served||a.name.localeCompare(b.name,"pt-BR"));
    return Response.json({event:{id:event.id,name:event.name,date:event.date,time:event.time},suggestions:results.slice(0,100),
      note:"Sugestões assistidas. Nenhuma escala é criada sem confirmação do administrador."});
  }catch(error){return apiError(error);}
}
