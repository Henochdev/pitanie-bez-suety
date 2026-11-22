(()=>{"use strict";
const KEY="pbs-purchases-v1";const $=s=>document.querySelector(s),fmt=n=>Math.round(n).toLocaleString("ru-RU")+" ₽";
function read(){try{const a=JSON.parse(localStorage.getItem(KEY));return Array.isArray(a)?a.filter(x=>x&&typeof x.name==="string"&&Number.isFinite(x.paid)):[]}catch{return []}}
let records=read();const storeLabels={estimate:"Другой / не указан",magnit:"Магнит"};
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(records))}catch(e){alert("Не удалось сохранить покупки. Проверь свободное место в браузере.")}};
const esc=x=>String(x).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const today=()=>{const d=new Date(),off=d.getTimezoneOffset()*60000;return new Date(d.getTime()-off).toISOString().slice(0,10)};
const allNames=()=>[...new Set((window.PBS_RECIPES||[]).flatMap(r=>r.ingredients.map(x=>x[0])))].sort((a,b)=>a.localeCompare(b,"ru"));
function show(name,store,unit,expectedQty){const modal=$("#purchase-modal");$("#purchase-product").value=name||"";$("#purchase-date").value=today();$("#purchase-store").value=store==="magnit"?"Магнит":"";$("#purchase-quantity").value=expectedQty&&expectedQty>0?Number(expectedQty.toFixed(2)):1;$("#purchase-unit").value=unit==="шт."?"шт.":unit==="мл"?"мл":"г";$("#purchase-paid").value="";$("#purchase-message").textContent="Укажи реально купленное количество и итоговую сумму из чека. Это отдельная запись, а не изменение примерной цены.";modal.showModal();$("#purchase-paid").focus()}
function bind(){if($("#purchase-listener-ready"))return;const mark=document.createElement("span");mark.id="purchase-listener-ready";mark.hidden=true;document.body.append(mark);
$("#shopping-list").addEventListener("click",e=>{const b=e.target.closest("button[data-buy-name]");if(!b)return;show(b.dataset.buyName,$("#store-select").value,b.dataset.buyUnit,Number(b.dataset.buyQty))});
$("#new-purchase").addEventListener("click",()=>show("",$("#store-select").value,"г",1));
$("#purchase-close").addEventListener("click",()=>$("#purchase-modal").close());
$("#purchase-modal").addEventListener("click",e=>{if(e.target.id==="purchase-modal")e.target.close()});
$("#purchase-form").addEventListener("submit",e=>{e.preventDefault();const name=$("#purchase-product").value.trim(),quantity=Number($("#purchase-quantity").value),paid=Number($("#purchase-paid").value),date=$("#purchase-date").value,store=$("#purchase-store").value.trim()||"Не указан",unit=$("#purchase-unit").value;
if(!name||!Number.isFinite(quantity)||quantity<=0||!Number.isFinite(paid)||paid<0||!/^\d{4}-\d{2}-\d{2}$/.test(date)){alert("Укажи продукт, дату, положительное количество и фактическую сумму.");return}
records.push({id:Date.now().toString(36)+Math.random().toString(36).slice(2,8),name,quantity,unit,paid,date,store});save();$("#purchase-modal").close();render()});
$("#export-purchases").addEventListener("click",()=>{const blob=new Blob([JSON.stringify({exportedAt:new Date().toISOString(),purchases:records},null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="pitanie-pokupki.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),5000)});
$("#purchase-history").addEventListener("click",e=>{const b=e.target.closest("button[data-remove]");if(!b)return;if(!confirm("Удалить запись о покупке?"))return;records=records.filter(r=>r.id!==b.dataset.remove);save();render()});
$("#analytics-period").addEventListener("change",render);
const datalist=$("#product-options");datalist.replaceChildren(...allNames().map(n=>{const o=document.createElement("option");o.value=n;return o}));
}
function render(){if(!$("#analytics"))return;const period=$("#analytics-period").value;const cutoff=new Date();cutoff.setDate(cutoff.getDate()-Number(period));const cutoffString=new Date(cutoff.getTime()-cutoff.getTimezoneOffset()*60000).toISOString().slice(0,10);
const items=records.filter(r=>r.date>=cutoffString).sort((a,b)=>b.date.localeCompare(a.date));const total=items.reduce((s,r)=>s+r.paid,0),budget=Number($("#budget").value)||25200;
$("#analytics-spent").textContent=fmt(total);$("#analytics-count").textContent=items.length+" покупок";$("#analytics-budget").textContent="Бюджет на 30 дней: "+fmt(budget)+" (период сравнения: "+period+" дн.)";$("#analytics-delta").textContent=period==="30"?fmt(budget-total)+" осталось до общего бюджета (не учитывает кафе и доставку)":"Для корректного сравнения с бюджетом выбери период 30 дней";
const byStore=new Map(),byProduct=new Map();for(const r of items){byStore.set(r.store,(byStore.get(r.store)||0)+r.paid);const key=r.name+"|"+r.unit;const old=byProduct.get(key)||{name:r.name,quantity:0,paid:0,unit:r.unit};old.quantity+=r.quantity;old.paid+=r.paid;byProduct.set(key,old)}
$("#analytics-stores").replaceChildren(...[...byStore].sort((a,b)=>b[1]-a[1]).map(([s,n])=>line(s,fmt(n))),...(!byStore.size?[line("Пока нет покупок","—")]:[]));
$("#analytics-products").replaceChildren(...[...byProduct.values()].sort((a,b)=>b.paid-a.paid).slice(0,12).map(r=>line(r.name,fmt(r.paid)+" · "+fmt(r.paid/r.quantity)+"/"+r.unit)),...(!byProduct.size?[line("Пока нет покупок","—")]:[]));
$("#purchase-history").replaceChildren(...items.map(r=>{const row=document.createElement("div");row.className="countline";row.innerHTML='<div style="min-width:0"><strong>'+esc(r.name)+'</strong><div class="subtle">'+esc(r.date+" · "+r.store+" · "+r.quantity+" "+r.unit)+'</div></div>';const cost=document.createElement("strong");cost.textContent=fmt(r.paid);const del=document.createElement("button");del.textContent="×";del.title="Удалить покупку";del.setAttribute("aria-label","Удалить покупку");del.dataset.remove=r.id;row.append(cost,del);return row}),...(!items.length?[line("История пока пуста","Добавь покупку")]:[]));
}
function line(label,value){const row=document.createElement("div");row.className="countline";const a=document.createElement("span"),b=document.createElement("strong");a.textContent=label;b.textContent=value;row.append(a,b);return row}
window.PBS_ANALYTICS={bind,render,show,records:()=>[...records]};
})();