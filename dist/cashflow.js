import {balance,cashDate,credit,dueDate,addMonth} from './model.js';

// Cash basis: carried amounts are calculated from history, never inserted as a
// new income/expense. Pending commitments affect only the forecast.
export function monthlyCashflow(state,month){
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw Error('Selecione um mês válido.');
  const start=month+'-01',next=addMonth(month)+'-01';
  const prior=addMonth(month,-1);
  const carried=balance(state,prior+'-31');
  let received=0,paid=0,pendingIncome=0,pendingExpenses=0,overdueExpenses=0;
  let pendingExpensesByMonth=0;
  for(const t of state.transactions){
    if(t.status==='paid'){
      const date=cashDate(t);
      if(date>=start&&date<next){if(t.type==='income')received+=t.amount;else paid+=t.amount;}
      continue;
    }
    const isCredit=credit(t);
    const referenceMonth=isCredit?t.invoice:t.date.slice(0,7);
    if(t.type==='expense'&&referenceMonth<=month)pendingExpensesByMonth+=t.amount;
    const date=isCredit?(t.invoiceDueDate||dueDate(t.invoice,state.cards.find(c=>c.id===t.card))):t.date;
    if(date>=next)continue;
    if(t.type==='income')pendingIncome+=t.amount;
    else {pendingExpenses+=t.amount;if(date<start)overdueExpenses+=t.amount;}
  }
  const result=received-paid,closing=carried+result;
  return {carried,received,paid,result,closing,pendingIncome,pendingExpenses,pendingExpensesByMonth,overdueExpenses,projected:closing+pendingIncome-pendingExpenses};
}
