import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import fs from 'node:fs';
import path from 'node:path';
import AppEntry from './components/AppEntry';
import { publicLoginData } from './lib/public-login';

const out = path.resolve('../outputs/login-options');
fs.mkdirSync(out, { recursive: true });
const css = fs.readFileSync('app/globals.css', 'utf8');
const chunks = '.next/static/chunks';
const builtCss = fs.readdirSync(chunks).filter(f => f.endsWith('.css')).map(f => fs.readFileSync(path.join(chunks, f), 'utf8')).join('\n');
const faces = (builtCss.match(/@font-face\{[^}]+\}/g) || []).filter(face => /font-family:(?:Barlow Condensed|DM Sans|"Barlow Condensed"|"DM Sans")/.test(face));
let fontCss = faces.join('\n').replaceAll('../media/', './');
for (const face of faces) for (const match of face.matchAll(/\.\.\/media\/([^)'"\s]+)/g)) fs.copyFileSync(path.join('.next/static/media', match[1]), path.join(out, match[1]));
const options = [
  ['celebration', '1. Race celebration', 'login-grid'],
  ['garage', '2. Night garage', 'login-garage'],
  ['sunset', '3. Golden-hour circuit', 'login-sunset'],
];
for (const [slug, title, asset] of options) {
  for (const suffix of ['', '-mobile']) fs.copyFileSync(`public/${asset}${suffix}.webp`, path.join(out, `${asset}${suffix}.webp`));
  const html = renderToStaticMarkup(createElement(AppEntry, {
    initialData: { ...publicLoginData({ name: 'Apex League' }), loginImage: `./${asset}.webp`, loginMobileImage: `./${asset}-mobile.webp` },
    hasSession: false,
  })).replaceAll('<form', '<form onsubmit="return false"');
  fs.writeFileSync(path.join(out, `${slug}.html`), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>${fontCss}:root{--font-dm:'DM Sans',Arial,sans-serif;--font-barlow:'Barlow Condensed','Arial Narrow',sans-serif} ${css}</style></head><body>${html}</body></html>`);
}
fs.writeFileSync(path.join(out, 'index.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Apex League — login options</title><style>*{box-sizing:border-box}body{margin:0;padding:24px;background:#0b1020;color:#f4f7fb;font:15px Arial,sans-serif}h1{font-size:24px}p{color:#a6b3c8}nav{display:flex;gap:8px;flex-wrap:wrap;margin:20px 0}button{padding:12px 16px;border:1px solid #344151;border-radius:9px;background:#151d30;color:#f4f7fb;cursor:pointer}button[aria-pressed=true]{border-color:#2de2c4;color:#2de2c4}iframe{display:block;width:100%;height:900px;border:1px solid #344151;border-radius:16px;margin:auto;background:#0b1020;max-width:100%}.mobile{width:390px}</style></head><body><h1>Choose your starting grid</h1><p>Three original login concepts in the app's navy, turquoise and gold. Your existing logo remains sharp at every size. These are visual previews; forms do not submit.</p><nav>${options.map(([slug,title],i)=>`<button data-scene="${slug}" aria-pressed="${slug==='garage'}">${title}</button>`).join('')}<button id="size" aria-pressed="false">Mobile preview</button></nav><iframe title="Login design preview" src="garage.html"></iframe><script>const frame=document.querySelector('iframe');for(const button of document.querySelectorAll('[data-scene]'))button.onclick=()=>{frame.src=button.dataset.scene+'.html';for(const b of document.querySelectorAll('[data-scene]'))b.setAttribute('aria-pressed',String(b===button))};document.querySelector('#size').onclick=function(){const mobile=frame.classList.toggle('mobile');this.setAttribute('aria-pressed',String(mobile));this.textContent=mobile?'Desktop preview':'Mobile preview'}</script></body></html>`);
console.log('Saved three responsive login previews and comparison gallery:', out);
