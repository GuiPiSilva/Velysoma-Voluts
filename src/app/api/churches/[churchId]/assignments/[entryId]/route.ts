import {type NextRequest} from "next/server";
import {apiError,churchAccess} from "@/lib/access";
import {statuses,shiftActive,overlaps,type CalendarEvent} from "@/lib/scheduling";
type Context={params:Promise<{churchId:string;entryId:string}>};
export async function PATCH(request:NextRequest,{params}:Context) {
  try{
    const {churchId,entryId}=await params;
    if(!/^[A-Za-z0-9_-]{10,250}$/.test(entryId))return Response.json({message:"Escala inválida."},{status:400});
    const {ref,user}=await churchAccess(request,churchId,true);
    const body=await request.json();
    const status=body.status;
    if(typeof status!=="string"||!statuses.includes(status as typeof statuses[number]))
      return Response.json({message:"Situação inválida."},{status:400});
    const doc=ref.collection("assignments").doc(entryId);
    const old=await doc.get();
    if(!old.exists)return Response.json({message:"Escala não encontrada."},{status:404});
    const prev=old.data()||{};
    if(status==="checked_in"&&prev.status==="declined")
      return Response.json({message:"Uma escala recusada não pode registrar presença."},{status:409});
    if(shiftActive(status)&&!shiftActive(prev.status)){
      const eventDoc=await ref.collection("events").doc(prev.eventId).get();
      const event=eventDoc.data() as CalendarEvent|undefined;
      if(!event)return Response.json({message:"Programação indisponível."},{status:404});
      const [shifts,eventDocs]=await Promise.all([ref.collection("assignments").limit(700).get(),ref.collection("events").limit(300).get()]);
      const events=new Map(eventDocs.docs.map(d=>[d.id,d.data() as CalendarEvent]));
      if(shifts.docs.some(d=>d.id!==entryId&&d.data().personId===prev.personId&&shiftActive(d.data().status)&&overlaps(event,events.get(d.data().eventId)||{})))
        return Response.json({message:"Existe outra escala ativa no mesmo horário."},{status:409});
    }
    const patch:Record<string,string>={status,updatedAt:new Date().toISOString(),updatedBy:user.uid};
    if(status==="checked_in"&&prev.status!=="checked_in")patch.checkInAt=new Date().toISOString();
    if(status!=="checked_in")patch.checkInAt="";
    await doc.update(patch);
    return Response.json({entry:{id:entryId,...prev,...patch}});
  }catch(error){return apiError(error);}
}
