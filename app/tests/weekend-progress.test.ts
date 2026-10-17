import { test } from "node:test";
import assert from "node:assert/strict";
import { weekendSessions } from "../lib/weekend-progress";
import { calendarEvents } from "../lib/provider";
import { mergeCalendar } from "../lib/calendar-sync";
import { seed } from "../lib/seed";
test("normal and Sprint banners show all five correct sessions even without times", () => {
 const e=seed(true).events[0];
 assert.deepEqual(weekendSessions(e).map(x=>x.label),["FP1","FP2","FP3","Quali","Race"]);
 assert.equal(weekendSessions(e)[1].time,"");
 assert.deepEqual(weekendSessions({...e,hasSprint:true}).map(x=>x.label),["FP1","Sprint Quali","Sprint Race","Quali","Race"]);
 assert.equal(weekendSessions({...e,sprintRace:e.race})[2].label,"Sprint Race");
});
test("FP2/FP3 times import and refresh while preserving manual schedule overrides", () => {
 const input={round:"1",raceName:"Test GP",date:"2027-03-14",time:"12:00:00Z",Circuit:{circuitId:"test",circuitName:"Test",Location:{locality:"Test"}},SecondPractice:{date:"2027-03-12",time:"16:00:00Z"},ThirdPractice:{date:"2027-03-13",time:"12:00:00Z"}};
 const incoming=calendarEvents([input],2027),s=seed(true),season=s.seasons[0];
 mergeCalendar(s,season,incoming,0);
 const e=s.events.find(x=>x.providerCircuitId==="test")!;
 assert.equal(e.practice2,"2027-03-12T16:00:00Z");
 assert.equal(weekendSessions(e)[2].time,"2027-03-13T12:00:00Z");
 incoming[0].practice2="2027-03-12T17:00:00Z";
 mergeCalendar(s,season,incoming,0); assert.equal(e.practice2,incoming[0].practice2);
 e.calendarOverride=true; incoming[0].practice3="2027-03-13T13:00:00Z";
 mergeCalendar(s,season,incoming,0); assert.equal(e.practice3,"2027-03-13T12:00:00Z");
});
