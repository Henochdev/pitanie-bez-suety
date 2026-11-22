/* Work schedule v1: pure date and shift utilities, no network or persisted user data. */
window.PBS_SHIFT=(()=>{
 "use strict";
 const DAY=86400000;
 function parseDate(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(s||""))return null;const y=+s.slice(0,4),m=+s.slice(5,7),d=+s.slice(8,10);const date=new Date(Date.UTC(y,m-1,d));return date.getUTCFullYear()===y&&date.getUTCMonth()===m-1&&date.getUTCDate()===d?date:null}
 function iso(date){return [date.getUTCFullYear(),String(date.getUTCMonth()+1).padStart(2,"0"),String(date.getUTCDate()).padStart(2,"0")].join("-")}
 function plus(s,days){const d=parseDate(s);if(!d)return"";return iso(new Date(d.getTime()+days*DAY))}
 function diff(date,origin){const a=parseDate(date),b=parseDate(origin);return a&&b?Math.round((a-b)/DAY):NaN}
 function mod(n,m){return((n%m)+m)%m}
 function phase(date,firstWorkDate){return mod(diff(date,firstWorkDate),4)}
 function isWork(date,cfg){return phase(date,cfg.anchor)<2}
 function isCook(date,cfg){return phase(date,cfg.anchor)===3}
 function hhmmToMin(s){if(!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(s||""))return NaN;const [h,m]=s.split(":").map(Number);return h*60+m}
 function formatMin(n){return String(mod(Math.floor(n/60),24)).padStart(2,"0")+":"+String(mod(n,60)).padStart(2,"0")}
 function shiftTimes(cfg){const st=hhmmToMin(cfg.start),en=hhmmToMin(cfg.end),travel=Number(cfg.commute);if(!Number.isFinite(st)||!Number.isFinite(en)||st===en||!Number.isFinite(travel)||travel<0||travel>240)return null;const overnight=en<=st;return{leave:formatMin(st-travel),arrive:formatMin(en+travel),overnight:overnight||en+travel>=1440,shiftHours:((en-st+1440)%1440)/60}}
 function label(date){const d=parseDate(date);return d?new Intl.DateTimeFormat("ru-RU",{day:"numeric",month:"short",weekday:"short",timeZone:"UTC"}).format(d):date}
 function groups(menuStart,cfg,days=30){
   if(!parseDate(menuStart)||!parseDate(cfg.anchor))return[];
   const events=[];
   for(let a=-4;a<days;a++){
     const date=plus(menuStart,a);
     if(!isCook(date,cfg))continue;
     const targets=Array.from({length:4},(_,n)=>a+n).filter(i=>i>=0&&i<days);
     if(targets.length)events.push({anchor:a,date,targets,buyDate:date,external:a<0});
   }
   return events
 }
 function groupForDay(index,menuStart,cfg,days=30){return groups(menuStart,cfg,days).find(g=>g.targets.includes(index))||null}
 function validate(cfg){return !!parseDate(cfg.anchor)&&cfg.mode==="2/2"&&!!shiftTimes(cfg)}
 return{parseDate,plus,diff,phase,isWork,isCook,shiftTimes,formatMin,label,groups,groupForDay,validate};
})();