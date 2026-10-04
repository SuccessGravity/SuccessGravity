// Local check: node workers/stack-og/test.mjs  (writes sample.svg next to this file)
import fs from 'fs';
import { decodeStack, stackSvg, stackMeta } from './worker.js';
const d = JSON.parse(fs.readFileSync(new URL('../../data/tools.json', import.meta.url)));
const byId = {}; d.tools.forEach((t) => { byId[t.id] = t; });
const url = new URL('https://successgravity.com/stack/?s=notion~~3,slack~~3,zoom~~2,semrush~249.95,clickup~~3,gamma&n=Choi%20%26%20Co%20Agency');
const st = decodeStack(url.searchParams, byId);
console.log(stackMeta(st, url));
fs.writeFileSync(new URL('./sample.svg', import.meta.url), stackSvg(st));
