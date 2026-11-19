/*
  Keys of Hope Dashboard: all of the logic.

  What this does
    Reads up to four EmpowerDB "Table Export" Excel files that a staff member
    picks, works out the program numbers in the browser, and draws the page.
    Nothing is uploaded, saved, or sent anywhere.

  The four exports and the columns used from each
    Clients            Client ID, programs, race_1, countyOfOrigin, educationLevel
    Move Ins & Exits   Client ID, id_slot, date, exit_date, exit_reason, exit_destination
    Services           (loaded and counted, not charted yet)
    Groups             Date, Client ID(s)
  Columns that hold names, phones, emails, or birth dates are never read.

  Rules agreed with the program director on November 19, 2026
    - Success is any exit to "Permanent housing of choice", whenever it happens.
    - "Left before two years" is any exit reason other than "Completed Program Term".
    - "Different Room within Same Shelter" is a room change, not an exit. It is dropped.
    - Capacity is 70.
    - The grant year runs July to June.
    - The program relaunched in March 2026. Time charts mark it.

  Still placeholders, for the program director to set
    - Taking-part levels: workshops per 30 days of stay. Under 2 is Low,
      2 to 11 is Medium, 12 or more is High. See the line marked ENGAGEMENT.

  Privacy rules
    - Any table row with fewer than 5 women is folded into "All other answers".
    - Percentages and averages are hidden when fewer than 5 exits are behind them.
    - No screen lists individual women.

  To change this file: edit dashboard/src/app.js or dashboard/src/page.html,
  then run  python3 dashboard/build.py  to rebuild dashboard/KeysOfHope_dashboard.html.
*/

// ---------- Settings and lookups ----------
// CAP is the number of beds. RS and DS turn EmpowerDB's dropdown numbers into words;
// if the export already has words, they pass through unchanged.
const CAP=70,$=id=>document.getElementById(id);
const RS={"9":"Completed Program Term","10":"Client Choice to Withdraw","1":"Chronic Non-payment of Rent","2":"Non-compliance with Program Rules","3":"Violation of the Lease Agreement","11":"Left Housing/Program Without Notice","4":"Other","77":"Different Room within Same Shelter"};
const DS={"1":"Domestic violence emergency shelter","2":"Health care facility/substance abuse treatment program","3":"Homeless emergency shelter","4":"Hotel or motel","5":"Incarceration/jail","6":"Permanent housing of choice","7":"Temporary housing with family or friends","8":"Transitional housing","99":"Unknown","10":"Other"};
// ROOMS is the fallback way to spot Keys of Hope move-ins when no Clients file is loaded.
const ROOMS=["5394","9379","9380","9381","301/310","302/309","303/308","304/307"];
const HOUSED="Permanent housing of choice",DONE="Completed Program Term";
// T holds the raw tables by kind. stays is the cleaned list of Keys of Hope stays.
const T={};let stays=[],clients=null,sessions={},info={};

// ---------- Small helpers ----------
const txt=v=>v==null?"":String(v).trim();
const lk=(m,v)=>{v=txt(v);if(/^\d+\.0+$/.test(v))v=v.split(".")[0];return v===""?null:(m[v]||v)};
// Accepts a real date cell, an Excel serial number, YYYY-MM-DD, or MM/DD/YYYY. Returns null for blanks and bad dates.
function toDate(v){if(v==null||v==="")return null;let d=null;
 if(v instanceof Date)d=new Date(v.getFullYear(),v.getMonth(),v.getDate()+(v.getHours()>=23?1:0));
 else if(typeof v==="number"){const u=new Date(Math.round((v-25569)*86400000));d=new Date(u.getUTCFullYear(),u.getUTCMonth(),u.getUTCDate())}
 else{const s=txt(v);let m;if(m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))d=new Date(+m[1],m[2]-1,+m[3]);else if(m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/))d=new Date(+m[3]<100?2000+ +m[3]:+m[3],m[1]-1,+m[2]);}
 return d&&!isNaN(d)&&d.getFullYear()>1990?d:null}

// ---------- Reading the files ----------
// Finds the header row (the exports have a title row above it) and works out which
// export this is from its column names, so file names do not matter.
function readBook(buf){const wb=XLSX.read(buf,{type:"array",cellDates:true});const rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,raw:true,defval:null});
 let hi=rows.findIndex(r=>r&&r.some(c=>/^(client id|entry id)/i.test(txt(c))));if(hi<0)return null;
 const title=txt((rows[0]||[])[0]).toLowerCase(),h=rows[hi].map(txt);
 const data=rows.slice(hi+1).filter(r=>r&&r.some(c=>c!=null&&c!=="")).map(r=>{const o={};h.forEach((k,i)=>{if(k)o[k]=r[i]});return o});
 let kind=h.includes("exit_date")?"moves":h.includes("Client ID(s)")?"groups":h.includes("Service Type")?"services":h.includes("programs")?"clients":null;
 return{kind,data,title}}
// Reads each chosen file. A second Services file is added to the first, because
// EmpowerDB splits that table at 50,000 rows.
async function load(files){for(const f of files){try{const b=readBook(await f.arrayBuffer());if(b&&b.kind){T[b.kind]=(b.kind=="services"&&T.services&&T._sn!==f.name)?T.services.concat(b.data):b.data;if(b.kind=="services")T._sn=f.name;info[b.kind]=f.name+" ("+b.data.length+" rows)"}else info["?"+f.name]="not recognized"}catch(e){info["?"+f.name]="could not be read"}}
 build()}

// ---------- Turning raw rows into stays ----------
function build(){const need=["moves"],have=k=>!!T[k];
 $("files").innerHTML=[["clients","Clients"],["moves","Move Ins & Exits"],["services","Services"],["groups","Groups"]].map(x=>`<span class="${have(x[0])?'ok':'no'}">${have(x[0])?'✓':'○'} ${x[1]}${info[x[0]]?': '+info[x[0]]:''}</span>`).join("")+Object.keys(info).filter(k=>k[0]=="?").map(k=>`<span class=no>✕ ${k.slice(1)}: ${info[k]}</span>`).join("");
 if(!have("moves")){$("dash").hidden=true;$("empty").hidden=false;return}
 let koh=null;if(T.clients){koh=new Set();clients={};T.clients.forEach(c=>{if(/keys of hope/i.test(txt(c.programs))){const id=txt(c["Client ID"]);koh.add(id);clients[id]=c}})}
 let dropped=0;stays=[];T.moves.forEach(r=>{const id=txt(r["Client ID"]);if(koh?!koh.has(id):!ROOMS.includes(txt(r.id_slot)))return;
  const a=toDate(r.date),b=toDate(r.exit_date),rs=lk(RS,r.exit_reason),ds=lk(DS,r.exit_destination);if(!a){dropped++;return}if(rs=="Different Room within Same Shelter")return;
  stays.push({c:id,a,b,rs:b?rs:null,ds:b?ds:null})});
 const ids=new Set(stays.map(s=>s.c));sessions={};
 (T.groups||[]).forEach(r=>{const d=toDate(r.Date);if(!d)return;txt(r["Client ID(s)"]).split(/[,;|\s]+/).forEach(id=>{if(ids.has(id))(sessions[id]=sessions[id]||[]).push(d)})});
  // ENGAGEMENT: workshops per 30 days of stay decide Low, Medium, or High.
 const now=today();stays.forEach(s=>{const end=s.b||now;s.days=Math.max(1,Math.round((end-s.a)/864e5));const n=(sessions[s.c]||[]).filter(d=>d>=s.a&&d<=end).length,pm=n/(s.days/30);s.eng=pm>=12?"High":pm>=2?"Medium":"Low"});
 const first=stays.reduce((m,s)=>s.a<m?s.a:m,now);const sel=$("v");sel.innerHTML="";const V={};
 V["Since January 2026"]=[new Date(2026,0,1),now];
 for(let y=now.getMonth()>=6?now.getFullYear():now.getFullYear()-1;y>=Math.max(first.getFullYear()-1,now.getFullYear()-6);y--){const lo=new Date(y,6,1),hi=new Date(y+1,5,30);if(hi<first)break;V[`Grant year ${y}-${String(y+1).slice(2)} (July to June)`]=[lo,hi<now?hi:now]}
 V["All time"]=[new Date(first.getFullYear(),first.getMonth(),1),now];
 Object.keys(V).forEach(k=>sel.add(new Option(k,k)));sel.onchange=()=>draw(V[sel.value]);
 $("empty").hidden=true;$("dash").hidden=false;
 $("note").textContent=`${ids.size} Keys of Hope women found`+(koh?" (picked by the program column in Clients)":" (picked by room choice, because no Clients file was loaded)")+(dropped?`. ${dropped} move-in rows had no move-in date and were left out`:"")+(T.groups?"":". No Groups file loaded, so the two taking-part charts are empty")+`. Read on ${now.toLocaleDateString()}.`;
 draw(V[sel.value])}

// ---------- Numbers for one time period ----------
const today=()=>{const d=new Date();return new Date(d.getFullYear(),d.getMonth(),d.getDate())};
const sm=n=>n>0&&n<5?"Fewer than 5":n;
function view(lo,hi){const now=today(),ins=stays.filter(s=>s.a>=lo&&s.a<=hi),ex=stays.filter(s=>s.b&&s.b>=lo&&s.b<=hi),perm=ex.filter(s=>s.ds==HOUSED);
 const months=[];let d=new Date(lo.getFullYear(),lo.getMonth(),1);while(d<=hi){const nx=new Date(d.getFullYear(),d.getMonth()+1,1);let last=new Date(nx-864e5);if(last>now)last=now;
  months.push({m:d.toLocaleString("en-US",{month:"short"})+" "+String(d.getFullYear()).slice(2),key:d.getFullYear()*12+d.getMonth(),occ:stays.filter(s=>s.a<=last&&(!s.b||s.b>last)).length,ins:ins.filter(s=>s.a>=d&&s.a<nx).length,ex:ex.filter(s=>s.b>=d&&s.b<nx).length});d=nx}
 const tab=(arr,f)=>{const c={};arr.forEach(s=>{const k=f(s)||"Not recorded";c[k]=(c[k]||0)+1});return Object.entries(c).sort((a,b)=>b[1]-a[1])};
 const eng=["Low","Medium","High"].map(lv=>{const e=ex.filter(s=>s.eng==lv);return{lv,n:e.length,perm:e.length?Math.round(100*e.filter(s=>s.ds==HOUSED).length/e.length):null,stay:e.length?Math.round(e.reduce((a,s)=>a+s.days,0)/e.length):null}});
 const served=[...new Set(stays.filter(s=>s.a<=hi&&(!s.b||s.b>=lo)).map(s=>s.c))];
 return{ins:ins.length,ex:ex.length,perm:ex.length>=5?Math.round(100*perm.length/ex.length):null,permN:perm.length,early:ex.filter(s=>s.rs!=DONE).length,stay:ex.length>=5?Math.round(ex.reduce((a,s)=>a+s.days,0)/ex.length):null,months,dest:tab(ex,s=>s.ds),why:tab(ex,s=>s.rs),eng,served,tab}}

// ---------- Drawing ----------
// tbl folds any row under 5 into "All other answers" before showing it.
function tbl(el,rows,hi,unit){const t=rows.reduce((a,r)=>a+r[1],0);if(!t){el.innerHTML="<tr><td>Nothing in this period.</td></tr>";return}
 const big=rows.filter(r=>r[1]>=5),small=rows.filter(r=>r[1]<5),s=small.reduce((a,r)=>a+r[1],0);let out=big.slice();if(small.length)out.push([small.length>1?"All other answers":small[0][0],s]);
 el.innerHTML=`<tr><th></th><th class=n>${unit||"Women"}</th><th class=n>Share</th></tr>`+out.map(r=>`<tr class="${r[0]==hi?'hi':''}"><td>${r[0]}</td><td class=n>${sm(r[1])}</td><td class=n>${r[1]<5?"":Math.round(100*r[1]/t)+"%"}</td></tr>`).join("")+`<tr><td><b>Total</b></td><td class=n><b>${sm(t)}</b></td><td class=n><b>${t<5?"":"100%"}</b></td></tr>`}
// RL is March 2026 as year*12+month, used to place the relaunch marker.
const RL=2026*12+2;
function mark(ms,x,y0,y1){const i=ms.findIndex(m=>m.key==RL);if(i<0)return"";const X=x(i);return `<line x1=${X} x2=${X} y1=${y0} y2=${y1} stroke="#fa4616" stroke-width=1.5 stroke-dasharray="2 3"/><text x=${X+4} y=${y0+9} font-size=10.5 fill="#b83000" font-weight=700>Relaunch</text>`}
function line(el,ms){const W=560,H=210,l=30,b=28,t=10,mx=Math.max(80,...ms.map(m=>m.occ)),x=i=>l+(W-l-14)*(ms.length>1?i/(ms.length-1):.5),y=v=>t+(H-t-b)*(1-v/mx);
 let g=[0,20,40,60,80].map(v=>`<line x1=${l} x2=${W-8} y1=${y(v)} y2=${y(v)} stroke="#d9d9d9"/><text x=${l-5} y=${y(v)+4} font-size=10.5 text-anchor=end fill="#6b6b6b">${v}</text>`).join("");
 const st=Math.ceil(ms.length/8),lab=ms.map((m,i)=>i%st==0?`<text x=${x(i)} y=${H-8} font-size=10.5 text-anchor=middle fill="#6b6b6b">${m.m}</text>`:"").join(""),L=ms[ms.length-1];
 el.innerHTML=`<svg viewBox="0 0 ${W} ${H}">${g}<line x1=${l} x2=${W-8} y1=${y(CAP)} y2=${y(CAP)} stroke="#000" stroke-dasharray="5 4" stroke-width=1.5 /><polyline fill="none" stroke="#fa4616" stroke-width=3 points="${ms.map((m,i)=>x(i)+","+y(m.occ)).join(" ")}"/>${L?`<text x=${x(ms.length-1)-4} y=${y(L.occ)-8} font-size=12 font-weight=700 text-anchor=end>${L.occ} now</text>`:""}${lab}${mark(ms,x,t,H-b)}</svg>`}
function flow(el,ms){const W=760,H=210,l=30,b=28,t=10,mx=Math.max(5,...ms.map(m=>Math.max(m.ins,m.ex))),bw=(W-l-8)/Math.max(ms.length,1),y=v=>t+(H-t-b)*(1-v/mx);
 const st=Math.ceil(ms.length/10);let s="";ms.forEach((m,i)=>{const x0=l+i*bw,w=Math.max(2,bw*.36);s+=`<rect x=${x0+bw*.1} y=${y(m.ins)} width=${w} height=${H-b-y(m.ins)} fill="#fa4616"/><rect x=${x0+bw*.1+w+1} y=${y(m.ex)} width=${w} height=${H-b-y(m.ex)} fill="#000"/>`;if(i%st==0)s+=`<text x=${x0+bw/2} y=${H-8} font-size=10.5 text-anchor=middle fill="#6b6b6b">${m.m}</text>`});
 el.innerHTML=`<svg viewBox="0 0 ${W} ${H}"><text x=${l-5} y=${y(mx)+4} font-size=10.5 text-anchor=end fill="#6b6b6b">${mx}</text><text x=${l-5} y=${y(0)+4} font-size=10.5 text-anchor=end fill="#6b6b6b">0</text><line x1=${l} x2=${W-8} y1=${H-b} y2=${H-b} stroke="#000"/>${s}${mark(ms,i=>l+i*bw+bw/2,t,H-b)}</svg>`}
function hb(el,e,key,suf,mx){const W=420,rh=44;let s="";e.forEach((r,i)=>{const v=r.n<5?null:r[key],w=v==null?0:(W-170)*v/mx;s+=`<text x=0 y=${i*rh+26} font-size=13 font-weight=600>${r.lv}</text><rect x=70 y=${i*rh+8} width=${w} height=26 fill="${r.lv=="High"?"#fa4616":r.lv=="Medium"?"#6b6b6b":"#b3b3b3"}"/><text x=${78+w} y=${i*rh+27} font-size=14 font-weight=700>${v==null?(r.n?"Fewer than 5 exits":"No exits"):v+suf}</text>`});
 el.innerHTML=`<svg viewBox="0 0 ${W} ${e.length*rh+6}">${s}</svg>`}
function draw(r){const v=view(r[0],r[1]),nowN=stays.filter(s=>!s.b).length;
 const c=[["Left for a home of their own",v.perm==null?"n/a":v.perm+"%",v.perm==null?"fewer than 5 exits in this period":sm(v.permN)+" of "+v.ex+" exits"],["Women living here today",nowN,"right now"],["Beds filled",Math.round(100*nowN/CAP)+"%","of "+CAP+" right now"],["Move-ins",sm(v.ins),"in this period"],["Exits",sm(v.ex),"in this period"],["Average stay",v.stay==null?"n/a":v.stay,v.stay==null?"fewer than 5 exits":"days, for women who left"],["Left before two years",sm(v.early),"see where they went"]];
 $("cards").innerHTML=c.map((x,i)=>`<div class="card${i==0?' lead':''}"><b>${x[0]}</b><i>${x[1]}</i><small>${x[2]}</small></div>`).join("");
 tbl($("dest"),v.dest,HOUSED);tbl($("why"),v.why,DONE);line($("occ"),v.months);flow($("flow"),v.months);hb($("eng1"),v.eng,"perm","%",100);hb($("eng2"),v.eng,"stay"," days",Math.max(...v.eng.map(e=>e.stay||0),1));
 const demo=$("demo");if(clients){demo.hidden=false;const cs=v.served.map(id=>clients[id]).filter(Boolean),tb=f=>v.tab(cs,c=>txt(c[f])||null);tbl($("d1"),tb("race_1"));tbl($("d2"),tb("countyOfOrigin"));tbl($("d3"),tb("educationLevel"));$("dn").textContent=`Women who lived at Keys of Hope at any point in this period.`}else demo.hidden=true}

// ---------- Wiring: file button, drag and drop, first paint ----------
const pick=$("pick");pick.onchange=()=>load([...pick.files]);
["dragover","drop"].forEach(e=>document.addEventListener(e,ev=>{ev.preventDefault();if(e=="drop"&&ev.dataTransfer.files.length)load([...ev.dataTransfer.files])}));
build();
