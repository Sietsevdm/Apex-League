import { test } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import { NextRequest } from "next/server";
process.env.DEMO_MODE="true";
process.env.DEMO_DATA_FILE=`weather-api-test-${process.pid}.json`;
process.env.SESSION_SECRET="weather-api-test-secret-at-least-32-characters";

test("Weather endpoint protects accounts, keeps manual photos and serves organiser previews without provider calls", async () => {
  const { GET }=await import("../app/api/banner-weather/route");
  const { bannerWeather }=await import("../lib/banner-weather");
  const { readState, transaction }=await import("../lib/store");
  const initial=await readState(), event=initial.events.find(e=>!e.practiceRound)!;
  let calls=0;
  const original=bannerWeather.current;
  bannerWeather.current=async()=>{calls++;return {condition:"rainy",label:"Rain",temperature:14,observedAt:new Date().toISOString(),fetchedAt:new Date().toISOString()};};
  const request=(user="demo-admin",query="")=>GET(new NextRequest(`http://localhost:3000/api/banner-weather?eventId=${encodeURIComponent(event.id)}${query}`,{headers:{cookie:`apex_demo=${user}`}}));
  try {
    assert.equal((await request("missing-user")).status,401);
    assert.equal((await request("demo-admin","&preview=invalid")).status,400);
    const preview=await request("demo-admin","&preview=rainy");assert.equal(preview.status,200);assert.equal(calls,0);
    assert.match((await preview.json()).photo,/-rainy\.webp/);
    assert.equal((await request("demo-1","&preview=night")).status,403);
    const live=await request();assert.equal(live.headers.get("Cache-Control"),"private, no-store");
    const liveData=await live.json();assert.equal(liveData.weather.label,"Rain");assert.match(liveData.photo,/-rainy\.webp/);
    assert.deepEqual(Object.keys(liveData).sort(),["eventId","photo","weather"]);
    await transaction(s=>{s.events.find(e=>e.id===event.id)!.photo="data:image/png;base64,manual";});
    assert.equal((await (await request()).json()).photo,null);
    await transaction(s=>{const e=s.events.find(e=>e.id===event.id)!;e.photo="";s.settings.savedBannerPhotos=[{year:s.seasons.find(x=>x.id===e.seasonId)!.year,name:e.name,circuit:e.circuit,photo:"data:image/png;base64,saved",focal:50,credit:"Owner"}];});
    assert.equal((await (await request()).json()).photo,null);
    await transaction(s=>{s.settings.savedBannerPhotos=[];s.seasons.find(x=>x.id===event.seasonId)!.archived=true;});
    const before=calls;assert.equal((await (await request()).json()).weather,null);assert.equal(calls,before);
    await transaction(s=>{s.users.find(u=>u.id==="demo-1")!.seasonIds=[];});
    assert.equal((await request("demo-1")).status,404);
    await transaction(s=>{s.users.find(u=>u.id==="demo-admin")!.active=false;});
    assert.equal((await request()).status,401);
  } finally {
    bannerWeather.current=original;
    await fs.rm(`.data/${process.env.DEMO_DATA_FILE}`,{force:true});
  }
});
