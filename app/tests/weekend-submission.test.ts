import { test } from "node:test";
import assert from "node:assert/strict";
import { seed } from "../lib/seed";
import { weekendSubmission } from "../lib/weekend-submission";
test("standings statuses use the safe summary even when predictions are private",()=>{
  const s=seed(true),event=s.events[0],id=s.users[0].id;
  (s as any).submissionOverview={ [event.id]:{gp:[{userId:id,status:"Submitted"}]} };
  s.entries=[];
  assert.deepEqual(weekendSubmission(s,event,id),[{kind:"gp",status:"Submitted"}]);
  assert.equal(weekendSubmission(s,event,"unknown")[0].status,"Unavailable");
  delete (s as any).submissionOverview;
  s.entries.push({eventId:event.id,userId:id,kind:"gp",submitted:true,updatedAt:"",picks:{order:[],pole:"",fastest:"",retirement:"",dotd:""}});
  assert.equal(weekendSubmission(s,event,id)[0].status,"Unavailable");
});
test("Sprint and GP submission states remain independent and scoped to the selected weekend",()=>{
  const s=seed(true),event=s.events[0],id=s.users[0].id;event.hasSprint=true;
  (s as any).submissionOverview={ [event.id]:{gp:[{userId:id,status:"Submitted"}],sprint:[{userId:id,status:"Draft"}]} };
  assert.deepEqual(weekendSubmission(s,event,id),[{kind:"gp",status:"Submitted"},{kind:"sprint",status:"Draft"}]);
  assert.equal(weekendSubmission(s,s.events[1],id)[0].status,"Unavailable");
});
