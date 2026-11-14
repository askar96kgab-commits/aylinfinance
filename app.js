const $=s=>document.querySelector(s);
const fmt=n=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(Number(n||0))+' сом';
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const monthKey=d=>(d||today()).slice(0,7);
const monthLabel=k=>{const [y,m]=k.split('-').map(Number);return new Date(y,m-1,1).toLocaleDateString('ru-RU',{month:'long',year:'numeric'})};
const dateLabel=d=>{const [y,m,day]=(d||today()).split('-');return `${day}.${m}.${y}`};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const expenseCategories=['Питание на улице','Питание на работе','Продукты домой','Одежда','Бензин','Тутун','Непредвиденные расходы','Транспорт','Жильё и коммунальные услуги','Здоровье','Развлечения','Другое'];
let db;
try{db=JSON.parse(localStorage.getItem('aylinfinance-data')||'{}')}catch{db={}}
db.ops=Array.isArray(db.ops)?db.ops:[];
db.payments=Array.isArray(db.payments)?db.payments:[];
db.debts=Array.isArray(db.debts)?db.debts:[];
db.debtHistory=Array.isArray(db.debtHistory)?db.debtHistory:[];
db.ops.forEach(o=>{if(!o.date)o.date=today();if(!o.category)o.category='Без категории'});
db.payments.forEach(p=>{if(p.paidAmount===undefined)p.paidAmount=p.paid?Number(p.amount):0;p.paidAmount=Math.min(Number(p.amount)||0,Math.max(0,Number(p.paidAmount)||0));p.paid=p.paidAmount>=Number(p.amount)});
db.debts.forEach(d=>{if(!d.date)d.date=today();if(!d.id)d.id=Date.now()+Math.random();if(d.paidAmount===undefined)d.paidAmount=0;d.paidAmount=Math.min(Number(d.amount)||0,Math.max(0,Number(d.paidAmount)||0))});
let tab='home', opsFilter='all', reportMode=false;
const expandedDebtGroups=new Set();
let debtFilter='all';
function persist(){localStorage.setItem('aylinfinance-data',JSON.stringify(db))}
function save(){persist();render()}
function totals(list=db.ops){return list.reduce((a,o)=>(a[o.kind]+=Number(o.amount),a),{income:0,expense:0})}
function thisMonthOps(){return db.ops.filter(o=>monthKey(o.date)===monthKey())}
function remaining(x){return Math.max(0,Number(x.amount||0)-Number(x.paidAmount||0))}
function currentPayments(){return db.payments.filter(p=>monthKey(p.date)===monthKey()&&remaining(p)>0)}
function debtTotals(){return db.debts.reduce((a,d)=>{a[d.direction]+=remaining(d);return a},{owe:0,owed:0})}
function empty(t){return `<div class="empty">${t}</div>`}
function row(title,sub,amount,cls='',icon='•',right=''){return `<div class="item"><div class="bubble">${icon}</div><div class="item-content"><b>${esc(title)}</b><small>${esc(sub)}</small></div><div class="amount ${cls}">${amount||''}${right}</div></div>`}
function go(to){tab=to;render();$('#view').scrollTop=0}
$('#floatingAdd').addEventListener('click',()=>{
 const type=tab==='payments'?'payment':tab==='debts'?'debt':'operation';
 openForm(type);
});
function render(){
 const all=totals(),bal=all.income-all.expense, pending=currentPayments().length;
 const monthPay=db.payments.filter(p=>monthKey(p.date)===monthKey()).reduce((s,p)=>s+remaining(p),0);
 const debts=debtTotals();
 let html='';
 if(tab==='home'){
 const mo=totals(thisMonthOps());
 const upcoming=db.payments.filter(p=>(p.date||'')>=today()&&remaining(p)>0).sort((a,b)=>(a.date||'').localeCompare(b.date||'')).slice(0,2);
 const people=[...new Set(db.debts.map(d=>(d.person||'').trim()).filter(Boolean))].map(person=>({person,items:db.debts.filter(d=>(d.person||'').trim()===person)})).map(g=>({...g,total:g.items.reduce((s,d)=>s+remaining(d),0)})).filter(g=>g.total>0).sort((a,b)=>b.total-a.total).slice(0,3);
 html=`<section class="hero"><div class="hero-top"><div class="eyebrow">Общий баланс</div><span class="hero-eye">◉</span></div><div class="balance">${fmt(bal)}</div><div class="metrics"><div class="metric"><small>Доходы за месяц</small><b>${fmt(mo.income)}</b></div><div class="metric"><small>Расходы за месяц</small><b>${fmt(mo.expense)}</b></div></div></section>
 <div class="home-section-head"><h3>Ближайшие платежи</h3><button class="text-link" onclick="go('payments')">Ещё</button></div>
 ${upcoming.length?upcoming.map(p=>`<div class="home-list-row"><span class="home-list-icon purple">⌂</span><div class="home-list-main"><b>${esc(p.title)}</b><small>${esc(p.date)}</small></div><strong>${fmt(remaining(p))}</strong><span class="row-chevron">›</span></div>`).join(''):empty('На этот месяц все платежи оплачены.')}
 <div class="home-section-head"><h3>Долги</h3><button class="text-link" onclick="go('debts')">Ещё</button></div>
 <div class="debt-summary home-debt-summary"><button onclick="go('debts');setDebtFilter('owed')"><small>Мне должны</small><b>${fmt(debts.owed)}</b><span>›</span></button><button onclick="go('debts');setDebtFilter('owe')"><small>Я должен</small><b>${fmt(debts.owe)}</b><span>›</span></button></div>
 ${people.length?`<div class="home-people">${people.map(g=>`<button class="home-person-row" onclick="go('debts');expandedDebtGroups.add('${esc(g.person).replace(/'/g,"\\'")}');render()"><span class="person-avatar">●</span><span class="home-person-name"><b>${esc(g.person)}</b><small>${g.items.length} ${g.items.length===1?'запись':'записи'}</small></span><strong>${fmt(g.total)}</strong><span class="row-chevron">⌄</span></button>`).join('')}</div>`:''}
 <div class="home-section-head"><h3>Последние операции</h3><button class="text-link" onclick="go('ops')">Ещё</button></div>
 <div class="home-operations">${db.ops.slice().sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,4).map(o=>row(o.title,(o.category||'Без категории')+' · '+o.date,(o.kind==='income'?'+':'−')+fmt(o.amount),o.kind,o.kind==='income'?'↓':'↑')).join('')||empty('Пока нет операций. Добавьте первый доход или расход.')}</div>
 `;
 } else if(tab==='ops'){
 const ops=db.ops.slice().sort((a,b)=>(b.date||'').localeCompare(a.date||''));
 const shown=ops.filter(o=>opsFilter==='all'||(opsFilter==='purchases'?o.kind==='expense':o.kind===opsFilter));
 const months=[...new Set(shown.map(o=>monthKey(o.date)))].sort().reverse();
 html=`<div class="topline"><h2>Операции</h2></div>
 <div class="filter-row"><button class="${opsFilter==='all'?'selected':''}" onclick="setOpsFilter('all')">Все</button><button class="${opsFilter==='income'?'selected':''}" onclick="setOpsFilter('income')">Доходы</button><button class="${opsFilter==='expense'?'selected':''}" onclick="setOpsFilter('expense')">Расходы</button><button class="${opsFilter==='purchases'?'selected':''}" onclick="setOpsFilter('purchases')">История покупок</button></div>
 ${months.map(m=>`<h3 class="month-heading">${monthLabel(m)}</h3>${shown.filter(o=>monthKey(o.date)===m).map(o=>row(o.title,(o.category||'Без категории')+' · '+o.date,(o.kind==='income'?'+':'−')+fmt(o.amount),o.kind,o.kind==='income'?'↙':'↗',`<button class="ghost" aria-label="Удалить" onclick="removeItem('ops',${o.id})">×</button>`)).join('')}`).join('')||empty('Записей пока нет.')}`;
 } else if(tab==='payments'){
 const months=[...new Set(db.payments.map(p=>monthKey(p.date)))].sort((a,b)=>a.localeCompare(b));
 html=`<div class="topline"><h2>Мои платежи</h2></div>
 <div class="panel summary-line"><b>${pending}</b> платежей ожидают оплаты <strong>Остаток на этот месяц: ${fmt(monthPay)}</strong>${pending===0?'<div class="badge paid">Все платежи за этот месяц оплачены</div>':''}</div>
 ${months.map(m=>{const ps=db.payments.filter(p=>monthKey(p.date)===m).sort((a,b)=>a.date.localeCompare(b.date));const sum=ps.reduce((s,p)=>s+remaining(p),0);return `<section class="month-group"><div class="month-head"><h3>${monthLabel(m)}</h3><b>${fmt(sum)}</b></div>${sum===0?'<div class="badge paid">Все платежи оплачены · 0 сом</div>':''}${ps.map(p=>`<div class="item payment-item"><div class="bubble">▦</div><div class="item-content payment-main"><b title="${esc(p.title)}">${esc(p.title)}</b><small>${dateLabel(p.date)} · ${p.repeat?'Ежемесячно':'Разовый'}</small><span class="badge ${remaining(p)===0?'paid':''}">${remaining(p)===0?'Оплачено':Number(p.paidAmount||0)>0?`Оплачено ${fmt(p.paidAmount)} · Остаток ${fmt(remaining(p))}`:`Остаток ${fmt(remaining(p))}`}</span></div><strong class="payment-amount">${fmt(p.amount)}</strong><div class="payment-actions">${remaining(p)>0?`<button class="ghost" onclick="recordPayment(${p.id})">Оплатить</button>`:''}${Number(p.paidAmount||0)===0?`<button class="ghost" onclick="editPayment(${p.id})">Изменить</button>`:''}<button class="ghost" onclick="removeItem('payments',${p.id})">×</button></div></div>`).join('')}</section>`}).join('')||empty('Добавьте регулярные или разовые платежи.')}`;
 } else if(tab==='debts'){
 const names=[...new Set(db.debts.map(d=>d.person.trim()))].sort((a,b)=>a.localeCompare(b,'ru'));
 const grouped=names.map(person=>({person,items:db.debts.filter(d=>d.person.trim()===person)}));
 html=`<div class="topline"><h2>Долги</h2></div>
 <div class="debt-summary"><button class="${debtFilter==='owed'?'active':''}" onclick="setDebtFilter('owed')"><small>Мне должны</small><b>${fmt(debts.owed)}</b></button><button class="${debtFilter==='owe'?'active':''}" onclick="setDebtFilter('owe')"><small>Я должен</small><b>${fmt(debts.owe)}</b></button></div>
 ${grouped.map(g=>{const owed=g.items.filter(x=>x.direction==='owed').reduce((s,x)=>s+remaining(x),0),owe=g.items.filter(x=>x.direction==='owe').reduce((s,x)=>s+remaining(x),0),visibleItems=g.items.filter(x=>debtFilter==='all'||x.direction===debtFilter),key=encodeURIComponent(g.person),isOpen=expandedDebtGroups.has(g.person);if(!visibleItems.length)return '';return `<section class="debt-person"><div class="debt-person-head"><button class="debt-person-toggle" onclick="toggleDebtGroup('${key}')"><span class="debt-person-name">${esc(g.person)}</span><span class="debt-person-total">${owed?`Мне должны: ${fmt(owed)}`:''}${owed&&owe?' · ':''}${owe?`Я должен: ${fmt(owe)}`:''}${!owed&&!owe?'Долг погашен · 0 сом':''}</span><span class="debt-chevron">${isOpen?'⌃':'⌄'}</span></button><button class="small-action" onclick="openForm('debt','${esc(g.person).replace(/'/g,"&#39;")}')">＋ Новый долг</button></div>${isOpen?`<div class="debt-person-details">${visibleItems.slice().sort((a,b)=>(b.date||'').localeCompare(a.date||'')).map(d=>`<div class="debt-entry"><div><b>${d.direction==='owed'?'Мне должны':'Я должен'} · Остаток ${fmt(remaining(d))}</b><small>${esc(d.date||'Дата не указана')} · Было ${fmt(d.amount)} · Погашено ${fmt(d.paidAmount)}</small>${d.note?`<small>${esc(d.note)}</small>`:''}</div><div><button class="ghost" onclick="recordDebtPayment(${d.id})" ${remaining(d)===0?'disabled':''}>Погасить</button><button class="ghost" onclick="removeItem('debts',${d.id})">×</button></div></div>`).join('')}</div>`:''}</section>`}).join('')||empty('Пока нет долгов.')}`;
 } else {
 const mo=thisMonthOps(), mt=totals(mo), byCat=mo.filter(o=>o.kind==='expense').reduce((s,o)=>(s[o.category||'Без категории']=(s[o.category||'Без категории']||0)+Number(o.amount),s),{});
 const max=Math.max(...Object.values(byCat),1);
 const allMonths=[...new Set(db.ops.map(o=>monthKey(o.date)))].sort().reverse();
 html=`<h2>Аналитика</h2><div class="panel"><h3>${monthLabel(monthKey())}</h3><div class="stats-grid"><div><small>Доходы</small><b class="income">${fmt(mt.income)}</b></div><div><small>Расходы</small><b class="expense">${fmt(mt.expense)}</b></div></div><div class="progress"><i style="width:${mt.income/Math.max(mt.income,mt.expense,1)*100}%"></i></div><b>Остаток за месяц: ${fmt(mt.income-mt.expense)}</b></div>
 <div class="section-title">Расходы по категориям за месяц</div>
 ${Object.entries(byCat).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<div class="category-stat"><div><b>${esc(k)}</b><strong>${fmt(v)}</strong></div><div class="progress"><i style="width:${v/max*100}%;background:#e05a61"></i></div></div>`).join('')||empty('Добавьте расходы — здесь появится анализ по категориям.')}
 <div class="section-title">История по месяцам</div>${allMonths.map(m=>{const x=totals(db.ops.filter(o=>monthKey(o.date)===m));return `<div class="month-row"><b>${monthLabel(m)}</b><span class="income">+ ${fmt(x.income)}</span><span class="expense">− ${fmt(x.expense)}</span></div>`}).join('')||empty('Пока нет данных.')}`;
 }
 $('#view').innerHTML=html;
 document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
}
function setOpsFilter(v){opsFilter=v;render()}
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>go(b.dataset.tab));
function setDebtFilter(filter){debtFilter=debtFilter===filter?'all':filter;render()}
function toggleDebtGroup(encodedName){
 const name=decodeURIComponent(encodedName);
 if(expandedDebtGroups.has(name))expandedDebtGroups.delete(name);else expandedDebtGroups.add(name);
 render();
}
function removeItem(table,id){if(confirm('Удалить запись?')){db[table]=db[table].filter(x=>String(x.id)!==String(id));save()}}
function editPayment(id){
 const p=db.payments.find(x=>String(x.id)===String(id));if(!p||Number(p.paidAmount||0)>0||p.paid)return;
 const title=prompt('Название платежа:',p.title);if(title===null)return;
 const amountRaw=prompt('Сумма платежа, сом:',String(p.amount));if(amountRaw===null)return;
 const amount=Number(String(amountRaw).replace(',','.'));
 if(!(amount>0))return alert('Введите сумму больше нуля.');
 const date=prompt('Дата платежа (ГГГГ-ММ-ДД):',p.date);if(date===null)return;
 if(!/^\\d{4}-\\d{2}-\\d{2}$/.test(date))return alert('Укажите дату в формате ГГГГ-ММ-ДД.');
 const repeat=confirm('Сделать этот платёж ежемесячным?');
 p.title=title.trim()||p.title;p.amount=amount;p.date=date;p.repeat=repeat;
 save();
}
function recordPayment(id){
 const p=db.payments.find(x=>String(x.id)===String(id));if(!p)return;
 const left=remaining(p);if(left<=0)return;
 const raw=prompt(`Остаток по платежу «${p.title}»: ${fmt(left)}\\nВведите сумму, которую Вы оплатили:`,String(left));
 if(raw===null)return;const amount=Number(String(raw).replace(',','.'));
 if(!(amount>0)||amount>left)return alert('Введите сумму больше нуля и не больше остатка.');
 p.paidAmount=Number(p.paidAmount||0)+amount;p.paid=p.paidAmount>=Number(p.amount);
 if(p.paid&&p.repeat){
   const [y,m,d]=p.date.split('-').map(Number);const next=new Date(y,m,Math.min(d,new Date(y,m+1,0).getDate()));
   const nd=`${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,'0')}-${String(next.getDate()).padStart(2,'0')}`;
   if(!db.payments.some(x=>x.title===p.title&&x.date===nd))db.payments.push({id:Date.now()+Math.random(),title:p.title,amount:p.amount,date:nd,repeat:true,paid:false,paidAmount:0});
 }
 save();
}
function recordDebtPayment(id){
 const d=db.debts.find(x=>String(x.id)===String(id));if(!d)return;
 const left=remaining(d);if(left<=0)return;
 const raw=prompt(`Остаток долга: ${fmt(left)}\\nВведите сумму погашения:`,String(left));
 if(raw===null)return;const amount=Number(String(raw).replace(',','.'));
 if(!(amount>0)||amount>left)return alert('Введите сумму больше нуля и не больше остатка.');
 d.paidAmount=Number(d.paidAmount||0)+amount;save();
}

function openForm(type,preset=''){
 const fields=$('#formFields');$('#modalTitle').textContent=type==='operation'?'Новая операция':type==='payment'?'Новый платёж':'Новый долг';
 let html='';
 if(type==='operation')html=`<label>Тип операции<select name="kind" id="opKind"><option value="expense">Расход</option><option value="income">Доход</option></select></label><label>Название<input name="title" required placeholder="Например, зарплата"></label><label>Сумма, сом<input name="amount" required type="number" min="0.01" step="0.01"></label><label>Категория<select name="category" id="opCategory">${expenseCategories.map(c=>`<option>${c}</option>`).join('')}<option>Зарплата</option><option>Дополнительный доход</option></select></label><label>Дата<input name="date" type="date" value="${today()}" required></label>`;
 if(type==='payment')html=`<label>Название<input name="title" required placeholder="Аренда, кредит, интернет"></label><label>Сумма, сом<input name="amount" required type="number" min="0.01" step="0.01"></label><label>Дата оплаты<input name="date" type="date" value="${today()}" required></label><label>Повторение<select name="repeat"><option value="yes">Ежемесячно</option><option value="no">Разовый платёж</option></select></label>`;
 if(type==='debt')html=`<label>ФИО / имя должника<input name="person" id="debtPerson" autocomplete="off" required placeholder="Начните вводить имя"><div id="debtSuggestions" class="suggestions" hidden></div><small class="hint">Начните вводить имя — появятся сохранённые варианты. Можно ввести новое имя.</small></label><label>Сумма, сом<input name="amount" required type="number" min="0.01" step="0.01"></label><label>Тип<select name="direction"><option value="owed">Мне должны</option><option value="owe">Я должен</option></select></label><label>Дата долга<input name="date" type="date" value="${today()}" required></label><label>Примечание (необязательно)<input name="note" placeholder="Например, за покупку"></label>`;
 fields.innerHTML=html;$('#modal').dataset.type=type;$('#modal').showModal();
 if(type==='debt'){
 const personInput=$('#debtPerson'),suggestions=$('#debtSuggestions');
 if(preset)personInput.value=preset;
 const names=[...new Set(db.debts.map(d=>(d.person||'').trim()).filter(Boolean))];
 const showSuggestions=()=>{
  const q=personInput.value.trim().toLocaleLowerCase('ru');
  const matches=names.filter(n=>!q||n.toLocaleLowerCase('ru').includes(q));
  suggestions.innerHTML=matches.length?matches.map(n=>`<button type="button" class="suggestion-option">${esc(n)}</button>`).join(''):'<div class="suggestion-empty">Совпадений нет — будет создано новое имя</div>';
  suggestions.hidden=false;
  suggestions.querySelectorAll('button').forEach(b=>b.onclick=()=>{personInput.value=b.textContent;suggestions.hidden=true});
 };
 personInput.addEventListener('input',showSuggestions);
 personInput.addEventListener('focus',showSuggestions);
 personInput.addEventListener('blur',()=>setTimeout(()=>suggestions.hidden=true,180));
 }
 if(type==='operation')$('#opKind').onchange=e=>{const cat=$('#opCategory');cat.innerHTML=(e.target.value==='expense'?expenseCategories:['Зарплата','Дополнительный доход','Возврат долга','Другое']).map(c=>`<option>${c}</option>`).join('')};
}
function closeModal(){$('#modal').close()}
$('#closeModal').onclick=closeModal;$('#cancelModal').onclick=closeModal;
$('#entryForm').addEventListener('submit',e=>{
 e.preventDefault();const f=new FormData(e.currentTarget),type=$('#modal').dataset.type;
 const amount=Number(f.get('amount'));if(!(amount>0))return alert('Введите сумму больше нуля.');
 const id=Date.now()+Math.random();
 if(type==='operation')db.ops.push({id,kind:f.get('kind'),title:f.get('title'),amount,category:f.get('category')||'Без категории',date:f.get('date')||today()});
 if(type==='payment')db.payments.push({id,title:f.get('title'),amount,date:f.get('date'),repeat:f.get('repeat')==='yes',paid:false});
 if(type==='debt')db.debts.push({id,person:f.get('person').trim(),amount,direction:f.get('direction'),date:f.get('date')||today(),note:f.get('note')||''});
 closeModal();save();
});

function importJSONFile(file){
 if(!file)return;
 const reader=new FileReader();
 reader.onload=()=>{
  let incoming;
  try{incoming=JSON.parse(String(reader.result||''))}catch{return alert('Не удалось прочитать файл. Нужен корректный JSON-файл резервной копии.')}
  if(!incoming||typeof incoming!=='object'||!Array.isArray(incoming.ops)||!Array.isArray(incoming.payments)||!Array.isArray(incoming.debts)){
   return alert('Структура файла не распознана. Нужна резервная копия AylinFinance с разделами ops, payments и debts.');
  }
  const valid=(arr)=>arr.filter(x=>x&&typeof x==='object'&&Number(x.amount)>=0&&x.id!==undefined);
  const groups=['ops','payments','debts'];
  let added={ops:0,payments:0,debts:0};
  groups.forEach(k=>{
   const currentIds=new Set(db[k].map(x=>String(x.id)));
   valid(incoming[k]).forEach(item=>{
    if(!currentIds.has(String(item.id))){
     const copy={...item};
     if(k==='ops'){if(!copy.date)copy.date=today();if(!copy.category)copy.category='Без категории';}
     if(k==='debts'&&!copy.date)copy.date=today();if(k==='payments'){if(copy.paidAmount===undefined)copy.paidAmount=copy.paid?Number(copy.amount):0;copy.paid=copy.paidAmount>=Number(copy.amount)}if(k==='debts'&&copy.paidAmount===undefined)copy.paidAmount=0;
     db[k].push(copy);currentIds.add(String(copy.id));added[k]++;
    }
   });
  });
  if(Array.isArray(incoming.debtHistory)){
   db.debtHistory=Array.isArray(db.debtHistory)?db.debtHistory:[];
   const ids=new Set(db.debtHistory.map(x=>String(x.id)));
   incoming.debtHistory.forEach(x=>{if(x&&x.id!==undefined&&!ids.has(String(x.id))){db.debtHistory.push(x);ids.add(String(x.id));}});
  }
  persist();render();
  alert(`Импорт завершён. Добавлено:\\nПлатежи: ${added.payments}\\nДолги: ${added.debts}\\nОперации: ${added.ops}\\n\\nСуществующие записи сохранены.`);
 };
 reader.onerror=()=>alert('Не удалось открыть файл резервной копии.');
 reader.readAsText(file);
}
$('#importBtn').onclick=()=>$('#importFile').click();
$('#importFile').addEventListener('change',e=>{importJSONFile(e.target.files?.[0]);e.target.value='';});

function exportJSON(){const blob=new Blob([JSON.stringify(db,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='aylinfinance-backup.json';a.click();URL.revokeObjectURL(a.href)}
function exportPDF(){
 const t=totals(), debts=debtTotals(), months=[...new Set([...db.ops.map(o=>monthKey(o.date)),...db.payments.map(p=>monthKey(p.date))])].sort().reverse();
 const w=window.open('','_blank');if(!w){alert('Разрешите всплывающие окна для печати PDF.');return}
 const esc2=esc;
 const content=`<html lang="ru"><head><meta charset="utf-8"><title>Отчёт AylinFinance</title><style>
 body{font:14px Arial,sans-serif;color:#18243b;margin:32px}.report-actions{position:sticky;top:0;display:flex;justify-content:flex-end;padding:8px 0;background:#fff}.report-actions button{border:0;border-radius:9px;background:#2878e8;color:white;font-size:15px;font-weight:600;padding:10px 16px;cursor:pointer}@media print{.report-actions{display:none}}h1{color:#17325f;margin-bottom:4px}h2{font-size:17px;margin:24px 0 10px;color:#17325f}.muted{color:#71809a}.cards{display:flex;gap:12px;margin:18px 0}.card{border:1px solid #dce4f0;border-radius:10px;padding:12px;flex:1}.card b{display:block;font-size:18px;margin-top:6px}table{width:100%;border-collapse:collapse;margin:8px 0 18px}th,td{padding:8px;border-bottom:1px solid #e5eaf2;text-align:left}th{background:#f2f6fc}td:last-child,th:last-child{text-align:right}.right{text-align:right}.section{page-break-inside:avoid}.foot{margin-top:28px;color:#71809a;font-size:11px;text-align:center}@media print{body{margin:15mm}}</style></head><body>
 <div class="report-actions"><button type="button" onclick="try{window.close()}catch(e){};setTimeout(()=>{if(!window.closed)history.back()},150)">Закрыть отчёт ✕</button></div>
 <h1>AylinFinance</h1><div class="muted">Персональный финансовый отчёт · сформирован ${today()}</div>
 <div class="cards"><div class="card">Общий доход<b>${fmt(t.income)}</b></div><div class="card">Общий расход<b>${fmt(t.expense)}</b></div><div class="card">Баланс<b>${fmt(t.income-t.expense)}</b></div></div>
 <h2>Долги</h2><div class="cards"><div class="card">Мне должны<b>${fmt(debts.owed)}</b></div><div class="card">Я должен<b>${fmt(debts.owe)}</b></div></div>
 ${months.map(m=>`<div class="section"><h2>${monthLabel(m)}</h2><table><tr><th>Дата</th><th>Операция</th><th>Категория</th><th>Тип</th><th>Сумма</th></tr>${db.ops.filter(o=>monthKey(o.date)===m).map(o=>`<tr><td>${esc2(o.date)}</td><td>${esc2(o.title)}</td><td>${esc2(o.category)}</td><td>${o.kind==='income'?'Доход':'Расход'}</td><td>${fmt(o.amount)}</td></tr>`).join('')||'<tr><td colspan="5">Нет операций</td></tr>'}</table><table><tr><th>Платёж</th><th>Дата</th><th>Статус</th><th>Сумма</th></tr>${db.payments.filter(p=>monthKey(p.date)===m).map(p=>`<tr><td>${esc2(p.title)}</td><td>${esc2(p.date)}</td><td>${p.paid?'Оплачено':'Ожидает'}</td><td>${fmt(p.amount)}</td></tr>`).join('')||'<tr><td colspan="4">Нет платежей</td></tr>'}</table></div>`).join('')}
 <h2>Долговые записи</h2><table><tr><th>Имя</th><th>Направление</th><th>Дата</th><th>Сумма</th></tr>${db.debts.map(d=>`<tr><td>${esc2(d.person)}</td><td>${d.direction==='owed'?'Мне должны':'Я должен'}</td><td>${esc2(d.date||'')}</td><td>${fmt(d.amount)}</td></tr>`).join('')||'<tr><td colspan="4">Нет долгов</td></tr>'}</table>
 <div class="foot">Акча бул жөн гана каражат, бирок үнөмдөөнү унутпа · AylinFinance</div><script>window.onload=()=>window.print()</script></body></html>`;
 w.document.open();w.document.write(content);w.document.close();
}
$('#exportBtn').onclick=()=>{const choice=confirm('Нажмите «ОК» для PDF-отчёта или «Отмена» для JSON-резервной копии.');if(choice)exportPDF();else exportJSON()};
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
render();