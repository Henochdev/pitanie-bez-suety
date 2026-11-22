(()=>{"use strict";
const R=window.PBS_RECIPES||[],K={plan:"pbs-menu",settings:"pbs-settings-v2",checks:"pbs-checks-v2",favorites:"pbs-favorites-v2"},$=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
// Meal prep on Sunday and Wednesday. The first Monday uses a batch prepared on the preceding Sunday.
const BFAST=[0,2,4,1,6,26,0];
const SUN_LUNCH=[13,28,32,34,7],SUN_DINNER=[18,39,42,15,17];
const WED_LUNCH=[[7,8],[28,30],[32,34],[8,13],[9,12]];
const WED_DINNER=[[15,18],[39,42],[18,15],[17,20],[39,15]];
const defaults=Array.from({length:30},(_,i)=>{const w=Math.floor(i/7),d=i%7;const b=BFAST[d];if(d<=1){const prev=(w+4)%5;return[b,SUN_LUNCH[prev],SUN_DINNER[prev]]}if(d<=5)return[b,WED_LUNCH[w%5][(d-2)%2],WED_DINNER[w%5][(d-2)%2]];return[b,SUN_LUNCH[w%5],SUN_DINNER[w%5]]});
const PREVIOUS_DEFAULT=Array.from({length:30},(_,i)=>[i%7,7+i%7,14+i%7]);
const EXTERNAL_FOOD=3*1200+2*1300;
const P=window.PBS_PRICING||{stores:{estimate:{label:"Ориентировочные",prices:{}}}};
let chosenStore=load("pbs-store-v1","estimate");if(!P.stores[chosenStore])chosenStore="estimate";
const ingredientPrice=(name,estimated)=>P.stores[chosenStore]?.prices?.[name]?.unitPrice??estimated;
const checkedKey=(week,name,people=settings.people)=>"w:"+week+":"+people+":"+name;
function weeksFor(name){const result=[];for(let w=0;w<5;w++){let start=w*7,end=Math.min(30,start+7);if(plan.slice(start,end).flat().some(i=>R[i].ingredients.some(x=>x[0]===name)))result.push(w)}return result}
function checkedStatus(w,name){if(w===-1){const weeks=weeksFor(name);return weeks.length>0&&weeks.every(x=>!!checks[checkedKey(x,name)])}return !!checks[checkedKey(w,name)]}
function toggleChecked(w,name,value){const weeks=w===-1?weeksFor(name):[w];for(const i of weeks)checks[checkedKey(i,name)]=value;save(K.checks,checks)}

function anchorFor(d){const wd=d%7;return wd<=1?d-wd-1:wd<=5?d-wd+2:d}
function batchDays(anchor){if(anchor<0)return[0,1];if(anchor%7===2)return Array.from({length:4},(_,i)=>anchor+i).filter(x=>x<30);return Array.from({length:3},(_,i)=>anchor+i).filter(x=>x<30)}
function batchName(a){return a<0?"Воскресенье перед началом меню":a%7===2?"Среда · день "+(a+1):"Воскресенье · день "+(a+1)}
function batchRecipes(a){const counts=new Map();for(const d of batchDays(a))for(const idx of plan[d].slice(1)){counts.set(idx,(counts.get(idx)||0)+1)}return [...counts].map(([id,n])=>({id,n}))}

function load(key,fallback){try{let v=JSON.parse(localStorage.getItem(key));return v===null?fallback:v}catch{return fallback}}
const savedPlan=load(K.plan,null);const isOldDefault=Array.isArray(savedPlan)&&savedPlan.length===30&&savedPlan.every((row,i)=>JSON.stringify(row)===JSON.stringify(PREVIOUS_DEFAULT[i]));const fromOld=isOldDefault?defaults:(savedPlan||defaults);let plan=Array.isArray(fromOld)&&fromOld.length===30?fromOld.map((x,i)=>Array.isArray(x)&&x.length===3?x.map((v,j)=>Number.isInteger(v)&&R[v]?v:defaults[i][j]):[...defaults[i]]):defaults.map(x=>[...x]);
const savedSettings=load(K.settings,{});let settings={people:1,budget:25200,...savedSettings};
if(savedSettings&&savedSettings.people===3&&savedSettings.budget===25200&&!localStorage.getItem("pbs-batch-defaults-migrated")){
  settings.people=1;try{localStorage.setItem("pbs-batch-defaults-migrated","yes");localStorage.setItem(K.settings,JSON.stringify(settings))}catch(e){}
}
settings.people=Math.min(12,Math.max(1,parseInt(settings.people,10)||1));settings.budget=Math.max(1,parseInt(settings.budget,10)||25200);
let checks=load(K.checks,{});if(!checks||typeof checks!=="object")checks={};
// Migrate previous month-only and week-only states once, retaining previously checked purchases.
if(!load("pbs-checks-sync-migrated",false)){
 for(const [key,value] of Object.entries(checks)){if(!value)continue;const match=key.match(/^(-1|[0-4]):(\d+):(.+)$/);if(!match)continue;const w=Number(match[1]),people=Number(match[2]),name=match[3];if(w===-1){for(let i=0;i<5;i++)checks[checkedKey(i,name,people)]=true}else checks[checkedKey(w,name,people)]=true}
 try{localStorage.setItem(K.checks,JSON.stringify(checks));localStorage.setItem("pbs-checks-sync-migrated","true")}catch(e){console.warn("Migration:",e)}
}let favorites=load(K.favorites,[]);if(!Array.isArray(favorites))favorites=[];
let day=0,week=0,scope=0,tab="home",category="Все",onlyFavorites=false,editSlot=null;
const localISO=dt=>{const d=new Date(dt);d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,10)};
let planStart=load("pbs-plan-start",null);if(!/^\d{4}-\d{2}-\d{2}$/.test(planStart||"")){const monday=new Date();monday.setDate(monday.getDate()-((monday.getDay()+6)%7));planStart=localISO(monday);try{localStorage.setItem("pbs-plan-start",JSON.stringify(planStart))}catch(e){}}
function planDayOffset(offset=0){const now=new Date(),base=new Date(planStart+"T12:00:00");now.setHours(12,0,0,0);return Math.round((now-base)/86400000)+offset}
const humanDate=d=>new Intl.DateTimeFormat("ru-RU",{day:"numeric",month:"long",weekday:"long"}).format(d);

const save=(key,val)=>{try{localStorage.setItem(key,JSON.stringify(val))}catch(e){console.warn("Не удалось сохранить:",e)}},money=n=>Math.round(n).toLocaleString("ru-RU")+" ₽",plural=n=>n===1?"человек":n>=2&&n<=4?"человека":"человек";
const cost=r=>r.ingredients.reduce((sum,[name,q,unit])=>sum+q*ingredientPrice(name,unit),0),monthTotal=()=>plan.flat().reduce((sum,i)=>sum+cost(R[i]),0)*settings.people;
const isPiece=n=>n==="яйца"||n==="банан",qty=(n,v)=>Number.isInteger(v)?v.toLocaleString("ru-RU"):(Math.round(v*10)/10).toLocaleString("ru-RU"),unit=n=>isPiece(n)?"шт.":n==="молоко"?"мл":"г";
const el=(tag,cls,txt)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(txt!==undefined)x.textContent=txt;return x};
function button(text,fn,cls=""){const b=el("button",cls,text);b.type="button";b.addEventListener("click",fn);return b}
function photo(r,cls="imagebox"){const wrap=el("div",cls);const fall=el("span","fallback",r.emoji);if(!r.photo){wrap.classList.add("failed");wrap.append(fall);return wrap}const img=el("img");img.src=r.photo;img.alt="Фото блюда: "+r.name;img.loading="lazy";img.addEventListener("error",()=>wrap.classList.add("failed"));wrap.append(img,fall);return wrap}
function goto(next){tab=next;render();window.scrollTo({top:0,behavior:"smooth"})}
function chips(container,choices,active,handler){container.replaceChildren(...choices.map(([id,label])=>button(label,()=>handler(id),"pill"+(active===id?" active":""))))}
function recipeCard(r,compact=false){const card=el("article",compact?"recipe-tile":"card meal-card");card.append(photo(r));const info=el("div",compact?"tile-body":"meal-info");info.append(el("div","label",r.category+" · "+r.minutes+" мин · ~"+money(cost(r)*settings.people)),el("h3","",r.name));let actions=el("div","button-row");actions.append(button("Рецепт",()=>openRecipe(r.id),"primary"));const favorite=button(favorites.includes(r.id)?"♥":"♡",()=>{favorites=favorites.includes(r.id)?favorites.filter(i=>i!==r.id):[...favorites,r.id];save(K.favorites,favorites);render()},"");favorite.title="В избранное";favorite.setAttribute("aria-label",favorite.title);if(compact){actions.append(button("В меню",()=>selectRecipe(r.id)));actions.append(favorite)}else{actions.append(button("Заменить",()=>{editSlot=R[r.id].category;goto("recipes")}));actions.append(favorite)}info.append(actions);card.append(info);return card}
function renderBatch(){const a=anchorFor(day),target=$("#batch-info");target.replaceChildren();const head=el("h3","","🍱 Готовим заранее");target.append(head,el("p","subtle",a===-1?"На первые два дня меню приготовь обеды и ужины в предыдущее воскресенье.":"Эти блюда готовятся в "+(a%7===2?"среду":"воскресенье")+" сразу на несколько порций."));for(const {id,n} of batchRecipes(a)){const row=el("div","countline");row.append(el("span","",R[id].name),el("strong","",n*settings.people+" порц."));target.append(row)}const badge=el("p","note",a%7===2?"Порции на конец недели охлади и заморозь сразу после приготовления. В холодильнике готовые блюда обычно хранят не более 3–4 дней; рис лучше быстро охлаждать и использовать раньше либо замораживать.":"Блюда готовятся сразу на несколько дней. Быстро охлади, храни в закрытых контейнерах в холодильнике, а запасные порции заморозь.");target.append(badge)}
function renderPrep(){const container=$("#prep-week");container.replaceChildren();const a=week*7-1;const anchors=[a,week*7+2,week*7+6].filter(x=>x<30);for(const x of anchors){const box=el("div","card content-card");box.append(el("h3","",batchName(x)));for(const {id,n} of batchRecipes(x)){const item=el("div","countline");item.append(el("span","",R[id].name),el("strong","",n*settings.people+" порц."));box.append(item)}container.append(box)}}
function renderMenu(){const weeks=$("#weeks");chips(weeks,Array.from({length:5},(_,i)=>[i,"Неделя "+(i+1)]),week,v=>{week=v;day=v*7;renderMenu()});chips($("#days"),Array.from({length:Math.min(7,30-week*7)},(_,i)=>[week*7+i,"День "+(week*7+i+1)]),day,v=>{day=v;renderMenu()});$("#daytitle").textContent="День "+(day+1);$("#daycost").textContent="~"+money(plan[day].reduce((s,i)=>s+cost(R[i]),0)*settings.people)+" на "+settings.people+" "+plural(settings.people);$("#meals").replaceChildren(...plan[day].map(i=>recipeCard(R[i])));$("#prep-day-note").textContent=day%7<=1?"🧊 Обед и ужин готовы с воскресенья. Осталось разогреть.":day%7===2?"🍳 Сегодня день большой готовки: сразу на несколько дней.":day%7===6?"🍳 Воскресная готовка — подготовь еду на сегодня, понедельник и вторник.":"🥡 Используй готовые порции. Свежие овощи добавляй перед подачей.";renderBatch();renderPrep()}
function renderHome(){
const now=new Date(),index=planDayOffset(),tom=planDayOffset(1),inRange=index>=0&&index<30;
$("#header-date").textContent=new Intl.DateTimeFormat("ru-RU",{day:"numeric",month:"short"}).format(now);
$("#home-day-label").textContent=humanDate(now).toUpperCase();
const focus=$("#home-focus"),list=$("#home-meals"),tomorrow=$("#home-tomorrow");
focus.replaceChildren();list.replaceChildren();tomorrow.replaceChildren();
const h=$("#home-greeting");const hour=now.getHours();h.textContent=(hour<12?"Доброе утро.":hour<18?"Хорошего дня.":"Добрый вечер.")+" Всё по плану.";
if(!inRange){h.textContent=index<0?"Меню ещё впереди.":"Время обновить план.";const box=el("div","focus-content");box.append(el("span","focus-kicker","ПЛАН НА 30 ДНЕЙ"),el("h2","","Выбери дату начала меню"),el("p","","Настрой календарь — и здесь появятся актуальные дела на сегодня и завтра."),button("Открыть настройки",()=>goto("settings"),"focus-button"));focus.append(box);$("#home-tomorrow").hidden=true;return}
$("#home-tomorrow").hidden=false;
const wd=index%7,prep=wd===2||wd===6,categoryLabel=prep?"ВРЕМЯ ГОТОВИТЬ":wd===1||wd===5?"ПОДГОТОВКА К ГОТОВКЕ":"СЕГОДНЯ МОЖНО НЕ ГОТОВИТЬ";
const title=prep?"Готовим на несколько дней":wd===1||wd===5?"Проверь продукты на завтра":"Сегодня без большой готовки";
let description=prep?"Сегодня подготовь обеды и ужины сразу на несколько порций. Загляни в список покупок и план заготовок.":wd===1||wd===5?"Завтра день готовки. Посмотри список ингредиентов, чтобы ничего не забыть.":"Если заготовки готовы, достаточно разогреть обед и ужин. Большая готовка сегодня не запланирована.";
// Ground shopping status in the current week's checked items.
const expected=new Set(plan.slice(index,Math.min(index+2,30)).flat().flatMap(id=>R[id]?.ingredients.map(a=>a[0])||[]));
const pending=[...expected].filter(name=>!checkedStatus(Math.floor(index/7),name));const line=el("div","focus-content");
line.append(el("span","focus-kicker",categoryLabel),el("h2","",title),el("p","",description));
const aux=el("div","focus-summary");aux.append(el("span","",prep?"🍳 Основная готовка":wd===1||wd===5?"🛒 Подготовка":"✓ Без лишней суеты"),el("span","",pending.length+" позиций без отметки «куплено»"));line.append(aux);
line.append(button(prep?"Посмотреть план готовки":pending.length?"Открыть покупки":"Посмотреть меню",()=>{day=index;week=Math.floor(day/7);if(prep)goto("menu");else if(pending.length)goto("shop");else goto("menu")},"focus-button"));
focus.append(line);focus.setAttribute("data-variant",prep?"cooking":"calm");
const names=["Завтрак","Обед","Ужин"];plan[index].forEach((id,slot)=>{const r=R[id],item=el("button","home-meal-item");item.type="button";const pic=photo(r,"imagebox home-meal-image"),body=el("div","home-meal-info");body.append(el("span","label",names[slot]+(slot===0?" · быстро":prep?" · готовим":" · заготовлено")),el("strong","",r.name));const arrow=el("span","meal-arrow","↗");item.append(pic,body,arrow);item.addEventListener("click",()=>openRecipe(id));list.append(item)});
const next=el("div","tomorrow-inner");next.append(el("div","tomorrow-heading","ЗАВТРА"));if(tom>=30){next.append(el("h3","","План на месяц завершён"),el("p","","Можно начать новый цикл в настройках."))}else{const d=new Date(now);d.setDate(d.getDate()+1);next.append(el("h3","",humanDate(d)));const nextPrep=tom%7===2||tom%7===6;next.append(el("p","",nextPrep?"🍳 День готовки на несколько дней":"🥡 План питания готов, без большой готовки"));const summary=el("div","tomorrow-food");summary.textContent=plan[tom].map(id=>R[id].name).join(" · ");next.append(summary);next.append(button("План на завтра →",()=>{day=tom;week=Math.floor(tom/7);goto("menu")},"text-button"))}tomorrow.append(next)
}
function filtered(){const text=$("#search").value.trim().toLocaleLowerCase("ru");return R.filter(r=>(category==="Все"||r.category===category)&&(!onlyFavorites||favorites.includes(r.id))&&(!text||r.name.toLocaleLowerCase("ru").includes(text)||r.ingredients.some(a=>a[0].toLocaleLowerCase("ru").includes(text))))}
function renderCatalog(){let cats=[["Все","Все"],["Завтрак","Завтраки"],["Обед","Обеды"],["Ужин","Ужины"]];chips($("#categories"),cats,category,c=>{category=c;renderCatalog()});$("#favfilter").classList.toggle("active",onlyFavorites);$("#favfilter").textContent=onlyFavorites?"♥ Только избранное":"♡ Избранное";$("#catalogcount").textContent=filtered().length+" рецептов";const arr=filtered();$("#catalog").replaceChildren(...arr.map(r=>recipeCard(r,true)));$("#noresults").hidden=arr.length>0;$("#addhint").textContent=editSlot?"Выбирай блюдо для категории «"+editSlot+"». День "+(day+1)+".":"Нажми «В меню», чтобы поставить блюдо на выбранный день ("+(day+1)+")."}
function selectRecipe(id){let r=R[id];if(!r)return;const slot=["Завтрак","Обед","Ужин"].indexOf(r.category);if(slot<0)return;plan[day][slot]=id;save(K.plan,plan);editSlot=null;category="Все";goto("menu")}
function openRecipe(id){const r=R[id];if(!r)return;
const batch=r.category==="Завтрак"?1:(batchRecipes(anchorFor(day)).find(x=>x.id===id)?.n||1);
let multiplier=1;const modal=$("#recipe-modal");
$("#modal-title").textContent=r.name;
$("#modal-image").replaceWith(photo(r,"imagebox detail-photo"));$("#recipe-modal .detail-photo").id="modal-image";
$("#modal-steps").replaceChildren(...r.steps.map(s=>el("li","",s)));
$("#recipe-intro").textContent=r.description||"";
$("#recipe-tips").textContent=r.tips||"";
$("#photo-context").textContent=r.photo?(r.photoNote||"Фото блюда носит иллюстративный характер.")+(r.photoCredit?" · Фото: "+r.photoCredit:""):"Фотография пока не подобрана. Показан значок блюда.";
function renderAmounts(){const servings=multiplier*settings.people;
$("#modal-meta").replaceChildren(...[r.category,r.minutes+" мин","~"+money(cost(r)*servings)+" · "+servings+" порц."].map(x=>el("span","",x)));
$("#modal-ingredients").replaceChildren(...r.ingredients.map(([name,q])=>{const x=el("div","ingredient-row");x.append(el("span","",name),el("strong","",qty(name,q*servings)+" "+unit(name)));return x}));
$("#modal-batch").textContent=multiplier>1?"✓ Показано на всю партию ("+servings+" порц.)":"🍱 Показать на партию ("+(batch*settings.people)+" порц.)";
$("#modal-batch").hidden=batch<=1;
}
$("#modal-batch").onclick=()=>{multiplier=multiplier===1?batch:1;renderAmounts()};
renderAmounts();
$("#modal-add").onclick=()=>{selectRecipe(id);modal.close()};
modal.showModal()
}
// Shopping cadence is guidance, not an assertion of any product's expiry date.
// Monthly staples: dry goods and unopened canned foods. Proteins are purchased on
// cooking days or purchased frozen and safely thawed in the fridge.
const MONTHLY_STAPLES=new Set(["овсянка","гречка","рис","макароны","чечевица","мука","манка","булгур","пшено","кускус","тунец","фасоль"]);
const COOKING_DAY=new Set(["куриное филе","индейка","рыба"]);
function buyingCategory(name){return COOKING_DAY.has(name)?"prep":MONTHLY_STAPLES.has(name)?"month":"fresh"}
function aggregateIngredients(days,category){const tally=new Map();for(const d of days){if(d<0||d>=30)continue;for(const recipeId of plan[d])for(const [name,amount,unitPrice] of R[recipeId].ingredients){if(buyingCategory(name)!==category)continue;const old=tally.get(name)||0;tally.set(name,old+amount*settings.people)}}return tally}
function addPurchaseLines(parent,amounts){if(amounts.size===0){parent.append(el("p","subtle","Для выбранного периода ничего покупать не нужно."));return}for(const [name,amount]of [...amounts].sort((a,b)=>a[0].localeCompare(b[0],"ru"))){const row=el("div","countline");row.append(el("span","",name),el("strong","",qty(name,amount)+" "+unit(name)));parent.append(row)}}
function renderPurchaseGuide(){
const container=$("#purchase-guide");if(!container)return;container.replaceChildren();
const monthDays=Array.from({length:30},(_,i)=>i),weekStart=scope<0?0:scope*7,weekEnd=scope<0?30:Math.min(30,weekStart+7),days=monthDays.slice(weekStart,weekEnd);
const month=el("details","card content-card");month.open=true;month.append(el("summary","","📦 Купить на месяц — сухие продукты и консервы"));month.append(el("p","subtle","Весь месячный объём. Крупы, муку и закрытые консервы можно взять заранее; проверяй срок и условия хранения на упаковке."));addPurchaseLines(month,aggregateIngredients(monthDays,"month"));container.append(month);
const fresh=el("details","card content-card");fresh.open=true;fresh.append(el("summary","","🥬 Свежие продукты — покупать по неделям"));
fresh.append(el("p","subtle",scope<0?"Ниже объёмы для каждой недели. Овощи, фрукты, молочное и хлеб не стоит покупать на весь месяц без подходящего хранения.":"Ниже объёмы только выбранной недели. Скоропортящиеся позиции при необходимости докупай ближе к употреблению."));
if(scope<0){for(let w=0;w<5;w++){const first=w*7,last=Math.min(30,first+7),period=el("details","");period.append(el("summary","","Неделя "+(w+1)+" · дни "+(first+1)+"–"+last));addPurchaseLines(period,aggregateIngredients(monthDays.slice(first,last),"fresh"));fresh.append(period)}}else addPurchaseLines(fresh,aggregateIngredients(days,"fresh"));container.append(fresh);
const prep=el("details","card content-card");prep.open=true;prep.append(el("summary","","🍗 Мясо и рыба — к дням готовки"));
prep.append(el("p","subtle","Для воскресной и средовой готовки. Охлаждённую птицу обычно используют за 1–2 суток; при ранней покупке сразу замораживай. Размораживай в холодильнике, не на столе."));
const anchors=[-1,...monthDays.filter(d=>d%7===2||d%7===6)];
const relevant=anchors.filter(a=>{const targets=batchDays(a);return scope<0||targets.some(d=>d>=weekStart&&d<weekEnd)||a>=weekStart&&a<weekEnd});
for(const anchor of relevant){const amounts=new Map();for(const d of batchDays(anchor)){for(const recipeId of plan[d].slice(1)){for(const [name,amount]of R[recipeId].ingredients){if(!COOKING_DAY.has(name))continue;amounts.set(name,(amounts.get(name)||0)+amount*settings.people)}}}
if(!amounts.size)continue;const batch=el("details","");batch.append(el("summary","",batchName(anchor)));addPurchaseLines(batch,amounts);prep.append(batch)}
container.append(prep);
container.append(el("p","note","План закупок — рекомендация, не гарантия сохранности продуктов: ориентируйся на срок годности, температуру холодильника, размер упаковки и то, что уже есть дома. Готовые порции охлаждай быстро, часть сразу замораживай."));
}
function renderShop(){const total=monthTotal(),homeBudget=Math.max(0,settings.budget-EXTERNAL_FOOD),progress=homeBudget>0?total/homeBudget:Infinity;$("#total").textContent=money(total);$("#budgetcompare").textContent="На домашнюю еду "+money(homeBudget)+" из "+money(settings.budget)+" общего бюджета · "+(progress<=1?"остаток "+money(homeBudget-total):"превышение "+money(total-homeBudget));$("#budgetcompare").classList.toggle("warning",progress>1);$("#shoppeople").textContent="Продукты на "+settings.people+" "+plural(settings.people)+". Галочки связаны между месяцем и неделями.";
const storeSelect=$("#store-select");storeSelect.value=chosenStore;
$("#store-info").textContent=P.stores[chosenStore]?.notes||"Ориентировочные цены.";chips($("#shopweeks"),[[-1,"30 дней"],...[0,1,2,3,4].map(i=>[i,"Неделя "+(i+1)])],scope,c=>{scope=c;renderShop()});const start=scope===-1?0:scope*7,end=scope===-1?30:Math.min(30,start+7),tally=new Map();plan.slice(start,end).flat().forEach(i=>R[i].ingredients.forEach(([name,q,price])=>{const prev=tally.get(name)||[0,0];tally.set(name,[prev[0]+q*settings.people,prev[1]+q*ingredientPrice(name,price)*settings.people])}));let entries=[...tally].sort((a,b)=>a[0].localeCompare(b[0],"ru"));$("#periodcost").textContent="Стоимость периода: "+money(entries.reduce((s,x)=>s+x[1][1],0));$("#shopping-list").replaceChildren(...entries.map(([name,[number,price]])=>{
const row=el("div","countline"),label=el("label","checkrow"+(checkedStatus(scope,name)?" checked":"")),checkbox=el("input");
checkbox.type="checkbox";checkbox.checked=checkedStatus(scope,name);
checkbox.addEventListener("change",()=>{toggleChecked(scope,name,checkbox.checked);label.classList.toggle("checked",checkbox.checked);updateProgress()});
label.append(checkbox,el("span","",name+" · "+qty(name,number)+" "+unit(name)));
row.append(label,el("strong","",money(price)));const action=button("Записать",()=>window.PBS_ANALYTICS?.show(name,chosenStore,unit(name),number),"");action.dataset.buyName=name;action.dataset.buyUnit=unit(name);action.dataset.buyQty=String(number);action.title="Добавить фактическую покупку в аналитику";row.append(action);return row}));
function updateProgress(){const marked=entries.filter(([name])=>checkedStatus(scope,name)).length;$("#checkedcount").textContent="Куплено "+marked+" из "+entries.length}
updateProgress();
$("#emptyshopping").hidden=entries.length>0;renderPurchaseGuide()}
function renderSettings(){ $("#plan-start").value=planStart; $("#people").value=settings.people;$("#budget").value=settings.budget;$("#settings-total").textContent="На домашнюю еду: "+money(Math.max(0,settings.budget-EXTERNAL_FOOD))+" (остальное: доставка 3 × 1 200 ₽, кафе 2 × 1 300 ₽). Примерная стоимость текущего домашнего меню: "+money(monthTotal());$("#install-instructions").textContent=/iPad|iPhone|iPod/.test(navigator.userAgent)?"В Safari нажми «Поделиться» → «На экран Домой» → «Добавить». Если пункта нет, открой сайт именно в Safari.":"На iPhone открой сайт в Safari → «Поделиться» → «На экран Домой». На Android в Chrome выбери «Установить приложение»."}
function render(){ $$(".tab").forEach(b=>{const yes=b.dataset.tab===tab;b.classList.toggle("active",yes);b.setAttribute("aria-selected",String(yes))});$$(".screen").forEach(s=>s.hidden=s.id!==tab);$("#hero-people").textContent=settings.people+" "+plural(settings.people);$("#hero-budget").textContent=money(settings.budget);if(tab==="home")renderHome();if(tab==="menu")renderMenu();if(tab==="recipes")renderCatalog();if(tab==="shop")renderShop();if(tab==="settings")renderSettings();if(tab==="analytics")window.PBS_ANALYTICS?.render()}
$(".tab").forEach(b=>b.addEventListener("click",()=>{editSlot=null;goto(b.dataset.tab)}));
$("#brand-home").addEventListener("click",()=>goto("home"));
$("#settings-open").addEventListener("click",()=>goto("settings"));
$("#home-menu-link").addEventListener("click",()=>{let i=planDayOffset();if(i>=0&&i<30){day=i;week=Math.floor(i/7)}goto("menu")});
$("#search").addEventListener("input",renderCatalog);$("#favfilter").addEventListener("click",()=>{onlyFavorites=!onlyFavorites;renderCatalog()});$("#modal-close").addEventListener("click",()=>$("#recipe-modal").close());$("#recipe-modal").addEventListener("click",e=>{if(e.target.id==="recipe-modal")e.currentTarget.close()});
$("#save-settings").addEventListener("click",()=>{const people=Number($("#people").value),budget=Number($("#budget").value);if(!Number.isInteger(people)||people<1||people>12||!Number.isFinite(budget)||budget<1){alert("Укажи от 1 до 12 человек и бюджет больше нуля.");return}settings={people,budget:Math.round(budget)};save(K.settings,settings);
const date=$("#plan-start").value;if(/^\d{4}-\d{2}-\d{2}$/.test(date)){const d=new Date(date+"T12:00:00");if(d.getDay()!==1){alert("Выбери понедельник: недельный план готовки построен с понедельника по воскресенье.");return}planStart=date;save("pbs-plan-start",planStart)}
render();$("#saved").textContent="✓ Настройки сохранены"});
$("#reset").addEventListener("click",()=>{if(confirm("Вернуть меню с готовкой по воскресеньям и средам на все 30 дней?")){plan=defaults.map(x=>[...x]);save(K.plan,plan);goto("menu")}});
$("#store-select").addEventListener("change",e=>{chosenStore=e.target.value;save("pbs-store-v1",chosenStore);renderShop()});
$("#clear-checks").addEventListener("click",()=>{if(confirm("Очистить отметки купленных продуктов?")){checks={};save(K.checks,checks);renderShop()}});
window.PBS_ANALYTICS?.bind();
if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(e=>console.warn("Service worker:",e)));
render();
})();