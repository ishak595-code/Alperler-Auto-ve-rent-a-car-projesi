import fs from "node:fs";
import path from "node:path";
const failures=[];
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.isDirectory())walk(f);else if(/\.(ts|html)$/.test(e.name))audit(f);}}
function audit(file){const s=fs.readFileSync(file,"utf8");const re=/<input\b[^>]*type=["\'](?:date|datetime-local)["\'][^>]*>/gi;let m;while((m=re.exec(s))){const tag=m[0];if(/aria-label\s*=|\[attr\.aria-label\]\s*=/.test(tag))continue;const line=s.slice(0,m.index).split("\n").length;failures.push(`${file}:${line}: native date control lacks explicit aria-label`);}}
walk("src");
const css=fs.readFileSync("src/runtime-stability.css","utf8");
if(!css.includes('input[type="date"]::-webkit-calendar-picker-indicator')||!css.includes('input[type="datetime-local"]::-webkit-calendar-picker-indicator')||!css.includes('display: none'))failures.push("global native picker TalkBack suppression is missing");
if(failures.length){console.error(failures.join("\n"));process.exit(1);}
console.log("Date-control accessibility guard passed.");
