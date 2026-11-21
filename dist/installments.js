import {prepareTransaction} from './cards.js';
import {addMonth,credit,saveTransaction,validateTransaction} from './model.js';

export function splitInstallments(total,count){
  if(!Number.isSafeInteger(total)||total<=0)throw Error('Informe um valor total válido.');
  if(!Number.isInteger(count)||count<1||count>120)throw Error('Escolha de 1 a 120 parcelas.');
  if(total<count)throw Error('Cada parcela deve ter pelo menos R$ 0,01.');
  const base=Math.floor(total/count),remainder=total%count;
  return Array.from({length:count},(_,i)=>base+(i<remainder?1:0));
}

export function validateInstallment(t){
  if(t.installment===undefined)return;
  const p=t.installment;
  if(!credit(t)||!p||typeof p.planId!=='string'||!p.planId||!Number.isInteger(p.count)||p.count<2||p.count>120||!Number.isInteger(p.index)||p.index<1||p.index>p.count)throw Error('Dados de parcelamento inválidos. Parcelas devem usar cartão de crédito.');
}

export const installmentLabel=t=>t.installment?` · ${t.installment.index}/${t.installment.count}`:'';

export function saveInstallmentPurchase(state,t,count=1){
  const amounts=splitInstallments(t.amount,count);
  if(count===1)return saveTransaction(state,t);
  if(!credit(t)||t.type!=='expense')throw Error('Parcelamento disponível apenas para despesas no cartão de crédito.');
  if(t.installment||state.transactions.some(x=>x.id===t.id||x.installment?.planId===t.id))throw Error('Edite as parcelas já cadastradas, sem criar a compra novamente.');
  validateTransaction(t,state);
  const rows=amounts.map((amount,i)=>{
    const row={...t,id:i===0?t.id:crypto.randomUUID(),amount,invoice:addMonth(t.invoice,i),status:i===0?t.status:'pending',installment:{planId:t.id,index:i+1,count}};
    if(row.status==='pending')delete row.paidDate;
    validateTransaction(row,state);return prepareTransaction(state,row);
  });
  return {...state,transactions:[...state.transactions,...rows]};
}
