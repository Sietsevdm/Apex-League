import { test } from "node:test";
import { promises as fs } from "node:fs";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { parseWeather, validLocation, weatherCircuitId, createWeatherService, WEATHER_INTERVAL } from "../lib/banner-weather";
import { hasManualBanner, matchedWeatherBanner, weatherBannerPhoto } from "../lib/banner-images";
import { calendarEvents } from "../lib/provider";
import { mergeCalendar } from "../lib/calendar-sync";
import { seed } from "../lib/seed";
import { backgroundRefresh } from "../lib/background-refresh";

const now = Date.parse("2026-10-18T12:00:00Z");
const current = (code = 0, day = 1, at = now) => ({ current: { weather_code: code, is_day: day, temperature_2m: 14.3, time: at / 1000 } });

test("All 24 circuit scenes include four distinct packaged weather images", async () => {
  const directory="public/banners/2027";
  const files=(await fs.readdir(directory)).filter(file=>/-(sunny|cloudy|rainy|night)\.webp$/.test(file));
  const scenes=new Set(files.map(file=>file.replace(/-(sunny|cloudy|rainy|night)\.webp$/,"")));
  assert.equal(scenes.size,24);assert.equal(files.length,96);
  for(const scene of scenes){const hashes=new Set<string>();for(const condition of ["sunny","cloudy","rainy","night"]){
    const bytes=await fs.readFile(`${directory}/${scene}-${condition}.webp`);
    assert.equal(bytes.toString("ascii",8,12),"WEBP");
    hashes.add(createHash("sha256").update(bytes).digest("hex"));
  }assert.equal(hashes.size,4,`${scene} needs distinct condition artwork`);}
});

test("Banner weather uses circuit daylight and distinguishes precipitation from fog and snow", () => {
  for (const [code, condition, label] of [[0,"sunny","Sunny"],[1,"sunny","Sunny"],[2,"cloudy","Cloudy"],[3,"cloudy","Cloudy"],[45,"cloudy","Fog"],[61,"rainy","Rain"],[56,"rainy","Rain"],[80,"rainy","Rain"],[95,"rainy","Thunderstorm"],[71,"cloudy","Snow"]] as const) {
    const value = parseWeather(current(code), now)!;
    assert.equal(value.condition, condition); assert.equal(value.label, label); assert.equal(value.temperature, 14);
    assert.equal(parseWeather(current(code, 0), now)?.condition, "night");
  }
  assert.equal(parseWeather(current(0, 0), now)?.label, "Clear");
  for (const data of [null, {}, current(123), current(0, 2), current(0,1,now-2*3600_000), { current: { ...current().current, temperature_2m: null } }, { current: { ...current().current, time: "2026-10-18" } }])
    assert.equal(parseWeather(data, now), null);
  assert.ok(validLocation({latitude:0,longitude:0}));
  assert.ok(!validLocation({latitude:NaN,longitude:0}));
  assert.ok(!validLocation({latitude:91,longitude:0}));
});

test("Calendar imports retain validated circuit coordinates through sync", () => {
  const input = { round:"1",raceName:"Test Grand Prix",date:"2027-04-01",time:"12:00:00Z",Circuit:{circuitId:"spa",circuitName:"Spa",Location:{locality:"Spa",lat:"50.4372",long:"5.97139"}} };
  const imported = calendarEvents([input],2027)[0];
  assert.deepEqual(imported.location,{latitude:50.4372,longitude:5.97139});
  const s=seed(true), season=s.seasons[0];
  const event={...s.events[0],providerCircuitId:"spa",location:undefined};s.events=[event];
  mergeCalendar(s,season,[{...imported,id:event.id}],now);
  assert.deepEqual(event.location,imported.location);
  assert.equal(calendarEvents([{...input,Circuit:{...input.Circuit,Location:{...input.Circuit.Location,lat:""}}}],2027)[0].location,undefined);
});

test("Weather images match circuit aliases, condition and season without changing manual photos", async () => {
  const e={...seed(true).events[0],name:"British Grand Prix",providerCircuitId:"silverstone",photo:""};
  const assets=[{key:"british-grand-prix-rainy",file:"british-grand-prix-rainy.webp",url:"shared-rain"},{key:"2027/british-grand-prix-rainy",file:"2027/british-grand-prix-rainy.webp",url:"season-rain"},{key:"british-grand-prix-night",file:"british-grand-prix-night.webp",url:"night"}];
  assert.equal(matchedWeatherBanner(e,2027,"rainy",assets)?.url,"season-rain");
  assert.equal(matchedWeatherBanner(e,2028,"rainy",assets)?.url,"shared-rain");
  assert.equal(matchedWeatherBanner({...e,name:"Local race"},2028,"night",assets)?.url,"night");
  assert.equal(matchedWeatherBanner(e,2028,"cloudy",assets),undefined);
  assert.equal(weatherCircuitId(e),"silverstone");
  assert.equal(weatherCircuitId({...e,providerCircuitId:undefined}),"silverstone");
  assert.ok(hasManualBanner({...e,photo:"data:image/png;base64,manual"}));
  assert.equal(await weatherBannerPhoto({...e,photo:"data:image/png;base64,manual"},2027,"rainy"),null);
});

test("Weather cache deduplicates requests, refreshes after 15 minutes and fails back without stale conditions", async () => {
  let at=now, calls=0, fail=false;
  const service=createWeatherService((async () => {calls++;await Promise.resolve();if(fail)throw new Error("offline");return Response.json(current(61,1,at));}) as typeof fetch,()=>at);
  const e={...seed(true).events[0],location:{latitude:50.4,longitude:5.9}};
  const results=await Promise.all([service.current(e),service.current(e)]);
  assert.equal(calls,1); assert.equal(results[0]?.condition,"rainy");
  await service.current(e); assert.equal(calls,1);
  at+=WEATHER_INTERVAL+1;fail=true;
  assert.equal(await service.current(e),null);assert.equal(calls,2);
  assert.equal(await service.current(e),null);assert.equal(calls,2);
  at+=60_001;fail=false;
  assert.equal((await service.current(e))?.condition,"rainy");assert.equal(calls,3);
});

test("Old calendars resolve circuit coordinates once and never geocode a city name", async () => {
  const urls:string[]=[];
  const service=createWeatherService((async input=>{const url=String(input);urls.push(url);return Response.json(url.includes("jolpi")?{MRData:{CircuitTable:{Circuits:[{Location:{lat:"50.4372",long:"5.97139"}}]}}}:current(0,0));}) as typeof fetch,()=>now);
  const e={...seed(true).events[0],providerCircuitId:"spa",location:undefined};
  assert.equal((await service.current(e))?.condition,"night");
  await service.current(e);assert.equal(urls.length,2);
  assert.match(urls[0],/circuits\/spa\//);assert.match(urls[1],/latitude=50.4372/);
  assert.equal(await service.current({...e,providerCircuitId:"../private",name:"Unknown",circuit:"Unknown"}),null);
});

test("Weather refresh can load immediately without polling hidden pages", async () => {
  let active=false, changed=()=>{}, calls=0;
  const timers:{callback:()=>void,delay:number}[]=[];
  const refresh=backgroundRefresh({initiallyStale:true,interval:WEATHER_INTERVAL,now:()=>now,
    active:()=>active,subscribe:f=>{changed=f;return()=>{};},
    setTimer:(callback,delay)=>{const timer={callback,delay};timers.push(timer);return timer;},clearTimer:()=>{},
    load:async()=>{calls++;return null;},onData:()=>{},onError:()=>{}});
  assert.equal(timers.length,0);active=true;changed();assert.equal(timers[0].delay,0);
  timers[0].callback();await new Promise(resolve=>setImmediate(resolve));assert.equal(calls,1);
  assert.equal(timers.at(-1)?.delay,WEATHER_INTERVAL);refresh.dispose();
});
