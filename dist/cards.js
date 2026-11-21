import {credit,dueDate,validDate} from './model.js';
export const DEFAULT_CARD_COLOR='#204f40';
export function validateCard(card){
  if(typeof card?.name!=='string'||!card.name.trim()||card.name.length>45)throw Error('Informe o nome do cartão com até 45 caracteres.');
  if(!Number.isInteger(card.closing)||card.closing<1||card.closing>28||!Number.isInteger(card.due)||card.due<1||card.due>28)throw Error('Informe dias de 1 a 28.');
  if(card.color!==undefined&&!/^#[\da-f]{6}$/i.test(card.color))throw Error('Escolha uma cor válida.');
}
export function invoiceDue(state,cardId,month){
  const recorded=state.transactions.find(t=>credit(t)&&t.card===cardId&&t.invoice===month&&validDate(t.invoiceDueDate));
  return recorded?.invoiceDueDate||dueDate(month,state.cards.find(c=>c.id===cardId));
}
export function prepareTransaction(state,t){
  if(!credit(t)){const result={...t};delete result.invoiceDueDate;delete result.invoiceClosingDay;return result;}
  const original=state.transactions.find(x=>x.id===t.id);
  const sameInvoice=original&&original.card===t.card&&original.invoice===t.invoice;
  const recordedClosing=state.transactions.find(x=>credit(x)&&x.card===t.card&&x.invoice===t.invoice&&x.invoiceClosingDay)?.invoiceClosingDay??state.cards.find(c=>c.id===t.card).closing;
  return {...t,invoiceClosingDay:sameInvoice?(original.invoiceClosingDay??recordedClosing):recordedClosing,invoiceDueDate:sameInvoice&&validDate(original.invoiceDueDate)?original.invoiceDueDate:invoiceDue(state,t.card,t.invoice)};
}
export function saveCard(state,card){
  validateCard(card);
  const old=state.cards.find(c=>c.id===card.id);
  if(card.id&&!old)throw Error('Cartão não encontrado.');
  const clean={...card,id:old?.id||crypto.randomUUID(),name:card.name.trim(),color:card.color||DEFAULT_CARD_COLOR};
  return {...state,cards:old?state.cards.map(c=>c.id===old.id?clean:c):[...state.cards,clean],transactions:old?state.transactions.map(t=>credit(t)&&t.card===old.id?{...t,invoiceClosingDay:t.invoiceClosingDay??old.closing,invoiceDueDate:t.invoiceDueDate||dueDate(t.invoice,old)}:t):state.transactions};
}
export function cardTextColor(color=DEFAULT_CARD_COLOR){
  const [r,g,b]=color.slice(1).match(/../g).map(c=>parseInt(c,16));
  return (r*299+g*587+b*114)/1000>=150?'#18372c':'#ffffff';
}
