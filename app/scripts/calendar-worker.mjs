const endpoint=process.env.CALENDAR_SYNC_URL||'http://apex:3000/api/calendar-sync';
const secret=process.env.CALENDAR_SYNC_SECRET;
if(!secret||secret.length<32)throw new Error('Set CALENDAR_SYNC_SECRET to at least 32 random characters.');
async function run(){try{const response=await fetch(endpoint,{method:'POST',headers:{Authorization:`Bearer ${secret}`},signal:AbortSignal.timeout(180000)});if(!response.ok)throw new Error(`Calendar scheduler returned ${response.status}`);const result=await response.json();if(result.outcomes?.length)console.log('Calendar check:',JSON.stringify(result.outcomes));if(result.backup==='created'||result.backup==='failed')console.log('Daily backup:',result.backup);}catch(error){console.error(error.message);}}
await run();
setInterval(run,3600000);
