import test from "node:test";
import assert from "node:assert/strict";
import {availabilityFor,isValidDate,overlaps,shiftActive,weekday} from "../src/lib/scheduling.ts";
test("datas inexistentes são rejeitadas",()=>{
 assert.equal(isValidDate("2026-02-30"),false);
 assert.equal(isValidDate("2026-10-21"),true);
});
test("evento com horário sobreposto bloqueia dois turnos no mesmo dia",()=>{
 assert.equal(overlaps({date:"2026-10-21",time:"19:00",durationMinutes:120},{date:"2026-10-21",time:"20:00"}),true);
 assert.equal(overlaps({date:"2026-10-21",time:"19:00",durationMinutes:60},{date:"2026-10-21",time:"20:00"}),false);
 assert.equal(overlaps({date:"2026-10-21",time:"19:00"},{date:"2026-10-22",time:"19:00"}),false);
 assert.equal(overlaps({date:"2026-10-21"},{date:"2026-10-21",time:"19:00"}),true);
});
test("bloqueio pontual prevalece sobre preferência semanal",()=>{
 const date="2026-10-21";
 assert.equal(availabilityFor({date},{weekdays:[weekday(date)],blockedDates:[date]}),"unavailable");
 assert.equal(availabilityFor({date},{weekdays:[weekday(date)],blockedDates:[]}),"available");
 assert.equal(availabilityFor({date},{weekdays:[],blockedDates:[]}),"unavailable");
 assert.equal(availabilityFor({date}),"unknown");
});
test("escala recusada não bloqueia outro evento",()=>{
 assert.equal(shiftActive("declined"),false);
 assert.equal(shiftActive("scheduled"),true);
 assert.equal(shiftActive("confirmed"),true);
 assert.equal(shiftActive("checked_in"),true);
});
