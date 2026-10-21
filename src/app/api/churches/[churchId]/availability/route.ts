import { type NextRequest } from "next/server";
import { apiError, churchAccess } from "@/lib/access";
import { isValidDate } from "@/lib/scheduling";
type Context = { params: Promise<{churchId:string}> };
export async function GET(request: NextRequest, {params}: Context) {
  try {
    const {ref}=await churchAccess(request,(await params).churchId);
    const snapshot=await ref.collection("availability").limit(300).get();
    return Response.json({availability:snapshot.docs.map(doc=>({personId:doc.id,...doc.data()}))});
  } catch(error) {return apiError(error);}
}
export async function POST(request: NextRequest,{params}:Context) {
  try {
    const {ref,user}=await churchAccess(request,(await params).churchId,true);
    const input=await request.json();
    const personId=typeof input.personId==="string"?input.personId:"";
    const weekdays=input.weekdays;
    const blockedDates=input.blockedDates;
    if(!/^[A-Za-z0-9_-]{10,100}$/.test(personId)||!Array.isArray(weekdays)||weekdays.length>7||
      weekdays.some((d:unknown)=>!Number.isInteger(d)||Number(d)<0||Number(d)>6)||
      new Set(weekdays).size!==weekdays.length||!Array.isArray(blockedDates)||blockedDates.length>120||
      blockedDates.some((d:unknown)=>typeof d!=="string"||!isValidDate(d))||
      new Set(blockedDates).size!==blockedDates.length)
      return Response.json({message:"Informe dias da semana e datas bloqueadas válidos."},{status:400});
    if(!(await ref.collection("people").doc(personId).get()).exists)
      return Response.json({message:"Voluntário não encontrado nesta igreja."},{status:404});
    const entry={weekdays,blockedDates,updatedBy:user.uid,updatedAt:new Date().toISOString()};
    await ref.collection("availability").doc(personId).set(entry);
    return Response.json({availability:{personId,...entry}});
  }catch(error){return apiError(error);}
}
