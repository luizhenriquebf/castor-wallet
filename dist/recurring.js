import {methods,invoiceMonth,saveTransaction,credit,monthOf,validDate} from './model.js';
const validMonth=m=>typeof m==='string'&&/^\d{4}-(0[1-9]|1[0-2])$/.test(m);

export function validateRecurringRule(rule,state){
  if(!rule||typeof rule.id!=='string'||!rule.id||typeof rule.description!=='string'||!rule.description.trim()||rule.description.length>120)throw Error('Informe uma descrição válida.');
  if(!Number.isSafeInteger(rule.amount)||rule.amount<=0||rule.amount>99999999900)throw Error('Informe um valor mensal válido.');
  if(!Number.isInteger(rule.day)||rule.day<1||rule.day>31)throw Error('Escolha um dia entre 1 e 31.');
  if(!validMonth(rule.start)||(rule.end!==''&&(!validMonth(rule.end)||rule.end<rule.start)))throw Error('Informe um período válido.');
  if(!state.categories.some(c=>c.id===rule.category)||!methods.includes(rule.method)||typeof rule.active!=='boolean')throw Error('Categoria, pagamento ou status da recorrência inválido.');
  if(rule.method==='Cartão de crédito'&&!state.cards.some(c=>c.id===rule.card))throw Error('Selecione um cartão cadastrado.');
  if(rule.suppressedThroughMonth!==undefined&&!validMonth(rule.suppressedThroughMonth))throw Error('Histórico de limpeza da recorrência inválido.');
  if(rule.autoFromMonth!==undefined&&!validMonth(rule.autoFromMonth))throw Error('Mês de retomada inválido.');
  return rule;
}

export function validateRecurringState(state){
  const rules=state.recurringRules??[],ledger=state.recurringLedger??[];
  if(!Array.isArray(rules)||!Array.isArray(ledger)||new Set(rules.map(r=>r?.id)).size!==rules.length)throw Error('Recorrências inválidas no backup.');
  rules.forEach(r=>validateRecurringRule(r,state));
  if(ledger.some(e=>!e||!rules.some(r=>r.id===e.ruleId)||!validMonth(e.month))||new Set(ledger.map(e=>JSON.stringify([e.ruleId,e.month]))).size!==ledger.length)throw Error('Histórico de recorrências inválido.');
}

export function saveRecurringRule(state,rule,effectiveMonth){
  validateRecurringRule(rule,state);
  const original=(state.recurringRules??[]).find(r=>r.id===rule.id);
  const clean={...rule,description:rule.description.trim(),...(original?.suppressedThroughMonth?{suppressedThroughMonth:original.suppressedThroughMonth}:{})};
  if(original?.autoFromMonth)clean.autoFromMonth=original.autoFromMonth;
  if(original&&!original.active&&clean.active){if(!validMonth(effectiveMonth))throw Error('Informe o mês de retomada.');clean.autoFromMonth=effectiveMonth;}
  if(clean.method!=='Cartão de crédito')delete clean.card;
  const rules=state.recurringRules??[];
  return {...state,recurringRules:rules.some(r=>r.id===clean.id)?rules.map(r=>r.id===clean.id?clean:r):[...rules,clean]};
}

export function generateRecurringMonth(state,month){
  if(!validMonth(month))throw Error('Selecione um mês válido.');
  let next=state,created=0;
  const ledger=[...(state.recurringLedger??[])];
  for(const rule of state.recurringRules??[]){
    validateRecurringRule(rule,state);
    if(!rule.active||month<rule.start||(rule.end&&month>rule.end)||(rule.suppressedThroughMonth&&month<=rule.suppressedThroughMonth)||(rule.autoFromMonth&&month<rule.autoFromMonth))continue;
    if(ledger.some(e=>e.ruleId===rule.id&&e.month===month)||state.transactions.some(t=>t.recurringId===rule.id&&t.recurringMonth===month))continue;
    const [year,m]=month.split('-').map(Number);
    const date=month+'-'+String(Math.min(rule.day,new Date(Date.UTC(year,m,0)).getUTCDate())).padStart(2,'0');
    const row={id:crypto.randomUUID(),description:rule.description,date,amount:rule.amount,type:'expense',status:'pending',category:rule.category,method:rule.method,recurringId:rule.id,recurringMonth:month};
    if(rule.method==='Cartão de crédito'){
      row.card=rule.card;
      row.invoice=invoiceMonth(date,state.cards.find(c=>c.id===rule.card).closing);
    }
    next=saveTransaction(next,row);ledger.push({ruleId:rule.id,month});created++;
  }
  return {state:created?{...next,recurringLedger:ledger}:state,created};
}

const monthIndex=m=>Number(m.slice(0,4))*12+Number(m.slice(5,7))-1;
const indexedMonth=n=>String(Math.floor(n/12)).padStart(4,'0')+'-'+String(n%12+1).padStart(2,'0');

export function ensureRecurringThroughMonth(state,month){
  if(!validMonth(month))throw Error('Selecione um mês válido.');
  const target=monthIndex(month),ranges=[];
  for(const rule of state.recurringRules??[]){
    validateRecurringRule(rule,state);
    if(!rule.active)continue;
    const first=Math.max(monthIndex(rule.start),rule.suppressedThroughMonth?monthIndex(rule.suppressedThroughMonth)+1:0,rule.autoFromMonth?monthIndex(rule.autoFromMonth):0);
    const last=Math.min(target,rule.end?monthIndex(rule.end):target);
    if(first<=last)ranges.push([first,last]);
  }
  if(!ranges.length)return {state,created:0};
  let next=state,created=0;
  for(let i=Math.min(...ranges.map(r=>r[0]));i<=Math.max(...ranges.map(r=>r[1]));i++){
    const result=generateRecurringMonth(next,indexedMonth(i));next=result.state;created+=result.created;
  }
  return {state:next,created};
}

export function recurringChargesForMonth(state,month){
  if(!validMonth(month))throw Error('Selecione um mês válido.');
  return state.transactions.filter(t=>t.recurringId&&t.type==='expense'&&(credit(t)?t.invoice:monthOf(t.date))===month);
}

export function setRecurringPayment(state,id,paid,date){
  if(typeof paid!=='boolean')throw Error('Status de pagamento inválido.');
  const row=state.transactions.find(t=>t.id===id&&t.recurringId&&t.type==='expense');
  if(!row)throw Error('Cobrança recorrente não encontrada.');
  if(paid&&!validDate(date))throw Error('Informe uma data de pagamento válida.');
  if((row.status==='paid')===paid)return state;
  const next={...row,status:paid?'paid':'pending'};
  if(paid)next.paidDate=date;else delete next.paidDate;
  return saveTransaction(state,next);
}

export function settleRecurringMonth(state,month,date){
  if(!validDate(date))throw Error('Informe uma data de pagamento válida.');
  return recurringChargesForMonth(state,month).filter(t=>t.status==='pending').reduce((next,row)=>setRecurringPayment(next,row.id,true,date),state);
}

export function suppressRecurringAfterReset(state,month){
  if(!validMonth(month))throw Error('Selecione um mês válido para a limpeza.');
  return (state.recurringRules??[]).map(rule=>{
    const months=[month,rule.suppressedThroughMonth,...(state.recurringLedger??[]).filter(e=>e.ruleId===rule.id).map(e=>e.month),...state.transactions.filter(t=>t.recurringId===rule.id).map(t=>t.recurringMonth)].filter(validMonth);
    return {...rule,suppressedThroughMonth:months.sort().at(-1)};
  });
}
