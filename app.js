const $=s=>document.querySelector(s);
const fmt=n=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(Number(n||0))+' сом';
const today=()=>new Date().toISOString().slice(0,10);
let db=JSON.parse(localStorage.getItem('aylinfinance-data')||'{"ops":[],"payments":[],"debts":[]}');
let tab='home', mode='expense';
function save(){localStorage.setItem('aylinfinance-data',JSON.stringify(db));render()}
function totals(){return db.ops.reduce((a,o)=>(a[o.kind]+=Number(o.amount),a),{income:0,expense:0})}
function empty(t){return `<div class="empty">${t}</div>`}
function row(title,sub,amount,cls='',icon='•',right=''){return `<div class="item"><div class="bubble">${icon}</div><div class="item-content"><b>${esc(title)}</b><small>${esc(sub)}</small></div><div class="amount ${cls}">${amount||''}${right}</div></div>`}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function render(){
 const t=totals(),bal=t.income-t.expense, pending=db.payments.filter(p=>!p.paid).length;
 let html='';
 if(tab==='home'){
 html=`<section class="hero"><div class="eyebrow">Общий баланс</div><div class="balance">${fmt(bal)}</div><div class="metrics"><div class="metric"><small>Доходы</small><b>${fmt(t.income)}</b></div><div class="metric"><small>Расходы</small><b>${fmt(t.expense)}</b></div></div></section>
 <div class="tiles"><div class="tile"><small>Платежи к оплате</small><b>${pending}</b></div><div class="tile"><small>Долги</small><b>${db.debts.length}</b></div></div><div class="section-title">Последние операции</div>${db.ops.slice().reverse().slice(0,5).map(o=>row(o.title,o.category+' · '+o.date,(o.kind==='income'?'+':'−')+fmt(o.amount),o.kind,'↗')).join('')||empty('Пока нет операций. Добавьте первый доход или расход.')}`;
 } else if(tab==='ops'){
 html=`<div class="topline"><h2>Операции</h2><button class="primary" onclick="openForm('operation')">＋ Добавить</button></div>${db.ops.slice().reverse().map(o=>row(o.title,o.category+' · '+o.date,(o.kind==='income'?'+':'−')+fmt(o.amount),o.kind,o.kind==='income'?'↙':'↗',`<button class="ghost" onclick="removeItem('ops',${o.id})">×</button>`)).join('')||empty('Добавьте первую операцию.')}`;
 } else if(tab==='payments'){
 html=`<div class="topline"><h2>Мои платежи</h2><button class="primary" onclick="openForm('payment')">＋ Добавить</button></div><div class="panel"><b>${pending}</b> платежей ожидают оплаты</div>${db.payments.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(p=>`<div class="item"><div class="bubble">▦</div><div class="item-content"><b>${esc(p.title)}</b><small>${p.date} · ${p.repeat?'Ежемесячно':'Разовый'}</small><span class="badge ${p.paid?'paid':''}">${p.paid?'Оплачено':'Ожидает'}</span></div><div class="amount">${fmt(p.amount)}<button class="ghost" onclick="togglePaid(${p.id})">${p.paid?'↶':'✓'}</button><button class="ghost" onclick="removeItem('payments',${p.id})">×</button></div></div>`).join('')||empty('Добавьте регулярные или разовые платежи.')}`;
 } else if(tab==='debts'){
 html=`<div class="topline"><h2>Долги</h2><button class="primary" onclick="openForm('debt')">＋ Добавить</button></div>${db.debts.map(d=>row(d.person,d.direction==='owe'?'Я должен':'Мне должны',fmt(d.amount),'', '↔',`<button class="ghost" onclick="removeItem('debts',${d.id})">×</button>`)).join('')||empty('Пока нет долгов.')}`;
 } else {
 const max=Math.max(t.income,t.expense,1);
 html=`<h2>Аналитика</h2><div class="panel"><b>Доходы</b><div>${fmt(t.income)}</div><div class="progress"><i style="width:${t.income/max*100}%"></i></div><b>Расходы</b><div>${fmt(t.expense)}</div><div class="progress"><i style="width:${t.expense/max*100}%;background:#e05a61"></i></div><hr><b>Чистый результат: ${fmt(t.income-t.expense)}</b></div><div class="section-title">Структура операций</div>${db.ops.length?db.ops.reduce((s,o)=>(s[o.category]=(s[o.category]||0)+Number(o.amount),s),{} )&&Object.entries(db.ops.reduce((s,o)=>(s[o.category]=(s[o.category]||0)+Number(o.amount),s),{})).map(([k,v])=>row(k,'Сумма операций',fmt(v))).join(''):empty('Добавьте операции для аналитики.')}`;
 }
 $('#view').innerHTML=html;
 document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
}
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;render()});
function removeItem(table,id){if(confirm('Удалить запись?')){db[table]=db[table].filter(x=>x.id!==id);save()}}
function togglePaid(id){const p=db.payments.find(x=>x.id===id);p.paid=!p.paid;save()}
function openForm(type){
 const fields=$('#formFields');$('#modalTitle').textContent=type==='operation'?'Новая операция':type==='payment'?'Новый платёж':'Новый долг';
 let html='';
 if(type==='operation')html=`<label>Тип операции<select name="kind"><option value="expense">Расход</option><option value="income">Доход</option></select></label><label>Название<input name="title" required placeholder="Например, зарплата"></label><label>Сумма, сом<input name="amount" required type="number" min="0.01" step="0.01"></label><label>Категория<input name="category" placeholder="Продукты, транспорт..."></label>`;
 if(type==='payment')html=`<label>Название<input name="title" required placeholder="Аренда, кредит, интернет"></label><label>Сумма, сом<input name="amount" required type="number" min="0.01" step="0.01"></label><label>Дата оплаты<input name="date" type="date" value="${today()}" required></label><label>Повторение<select name="repeat"><option value="yes">Ежемесячно</option><option value="no">Разовый платёж</option></select></label>`;
 if(type==='debt')html=`<label>Имя / описание<input name="person" required placeholder="Кому или от кого"></label><label>Сумма, сом<input name="amount" required type="number" min="0.01" step="0.01"></label><label>Тип<select name="direction"><option value="owe">Я должен</option><option value="owed">Мне должны</option></select></label>`;
 fields.innerHTML=html;$('#modal').dataset.type=type;$('#modal').showModal();
}
$('#entryForm').addEventListener('submit',e=>{
 if(e.submitter?.value==='cancel')return;
 e.preventDefault();const f=new FormData(e.currentTarget),type=$('#modal').dataset.type;
 const amount=Number(f.get('amount'));if(!(amount>0))return alert('Введите сумму больше нуля.');
 const id=Date.now();
 if(type==='operation')db.ops.push({id,kind:f.get('kind'),title:f.get('title'),amount,category:f.get('category')||'Без категории',date:today()});
 if(type==='payment')db.payments.push({id,title:f.get('title'),amount,date:f.get('date'),repeat:f.get('repeat')==='yes',paid:false});
 if(type==='debt')db.debts.push({id,person:f.get('person'),amount,direction:f.get('direction')});
 $('#modal').close();save();
});
$('#exportBtn').onclick=()=>{const blob=new Blob([JSON.stringify(db,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='aylinfinance-backup.json';a.click();URL.revokeObjectURL(a.href)};
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
render();
