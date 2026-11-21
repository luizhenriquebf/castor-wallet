# Castor Wallet

Aplicação de gestão financeira pessoal em português, com receitas, despesas, compras parceladas, faturas de cartão e despesas recorrentes. Funciona no computador e no celular e armazena os dados no navegador.

## Executar localmente

Requisito: **Node.js 22 ou superior**, com npm. O projeto usa módulos nativos do Node.js e não precisa instalar dependências.

1. Baixe ou clone o projeto.
2. Abra o terminal na pasta que contém `package.json`.
3. Execute:

```sh
npm start
```

4. Acesse [http://127.0.0.1:4173](http://127.0.0.1:4173).

Mantenha o terminal aberto enquanto utiliza a aplicação. Use `Ctrl+C` para encerrar o servidor. Se a porta 4173 estiver ocupada, encerre a outra instância antes de executar novamente.

O servidor local serve os arquivos de `dist/`. Essa pasta contém o código da aplicação e deve permanecer no Git; não há uma etapa de compilação.

## Começar sua carteira

O primeiro acesso inclui exemplos fictícios de seis meses para demonstrar os gráficos.

1. Abra **Guia rápido**, pelo botão `?` no topo.
2. Para remover os exemplos, clique em **Apagar todas as transações**.
3. Confira o resumo, digite **APAGAR** e confirme. Isso remove as transações de todos os meses e zera o saldo inicial, preservando os cadastros.
4. No guia, ajuste o **saldo inicial da carteira** para o valor anterior ao primeiro lançamento que você pretende registrar.
5. Cadastre seus cartões e comece a adicionar receitas e despesas.

O saldo inicial é da carteira inteira; não é preciso preenchê-lo a cada mês. Sobras e déficits são transportados automaticamente entre os meses.

## Como usar

### Receitas, despesas e categorias

Em **Nova transação**, preencha descrição, valor, data, categoria, meio de pagamento e status. Marque **Pago** quando o valor tiver sido recebido ou pago.

Em **Transações**, busque pela descrição, filtre por categoria, tipo ou status, edite e exclua lançamentos. O seletor de mês controla o período exibido nas telas financeiras.

Em **Categorias → Nova categoria**, informe nome e cor. A categoria passa a aparecer nos formulários, filtros e gráficos automaticamente, sem alterar fórmulas ou código.

### Emprego e salário

Em **Emprego**, cadastre o salário mensal, dia de recebimento, empresa opcional, categoria e meio de recebimento. Depois, use **Nova transação → Usar salário cadastrado**, revise a receita e salve.

O cadastro de emprego, por si só, não cria uma receita nem aumenta o saldo. Alterar o salário cadastrado preserva os valores das receitas anteriores.

### Cartões e faturas

Em **Cartões e faturas**, adicione um cartão com nome, cor, dia de fechamento e dia de vencimento. Os dias permitidos são de 1 a 28, para que existam em todos os meses.

- Compras após o fechamento são sugeridas para a próxima fatura. Você pode ajustar o mês da fatura no lançamento.
- Use **Editar cartão** para alterar nome, cor ou datas. As faturas e vencimentos já registrados são preservados; novas faturas usam o novo padrão.
- Compras adicionais em uma fatura existente usam o vencimento registrado nela.
- Use **Pagar fatura** para quitar suas compras pendentes e informar a data efetiva. Não cadastre outra despesa com o total da fatura, pois isso duplicaria o gasto.

### Compras parceladas

Em **Nova transação → Cartão de crédito**, informe o **valor total da compra**, a quantidade de parcelas (1 a 120) e o mês da primeira fatura.

O total é dividido em centavos entre as faturas mensais. R$ 100,00 em três vezes resulta em R$ 33,34, R$ 33,33 e R$ 33,33. Cada lançamento exibe sua posição, como `1/3`.

Se a compra for cadastrada como paga, somente a primeira parcela fica quitada. As seguintes começam pendentes. Edição e exclusão afetam apenas a parcela escolhida. A quantidade de parcelas é definida ao criar uma nova compra.

### Despesas recorrentes

Abra **Transações → Despesas recorrentes**, também disponível em **Nova transação**. Há atalhos para plano de saúde, telefone e internet, e você pode cadastrar outras contas mensais.

Informe valor, dia da cobrança, categoria, meio de pagamento, mês inicial e fim opcional. Ao abrir a carteira, salvar um cadastro ou selecionar um mês, as cobranças ativas até o mês selecionado são incluídas automaticamente como pendentes, inclusive meses anteriores ainda não registrados desde o início da recorrência.

- Não é necessário gerar cobranças manualmente.
- O histórico impede duplicação e a recriação de cobranças excluídas individualmente.
- Dias inexistentes, como 31 em fevereiro, são ajustados para o último dia do mês.
- No cartão, o fechamento determina a fatura em que a cobrança será contabilizada.
- Assinale **Pago** e confirme a data efetiva para registrar um pagamento.
- Use **Marcar todas do mês como pagas** para quitar as recorrências pendentes daquela competência.
- Desmarque **Pago** e confirme para corrigir um pagamento. Use **Editar cobrança** para ajustar um lançamento específico.
- Editar ou pausar o cadastro mantém as cobranças já criadas. Ao reativar, a inclusão recomeça no mês selecionado, sem cobrar os meses pausados.

A aplicação atualiza as recorrências enquanto é utilizada; não existe um serviço executando em segundo plano com o site fechado.

## Entender os indicadores

| Indicador | Critério |
| --- | --- |
| **Despesas do mês** | Despesas pagas e pendentes da competência selecionada. Cartão usa o mês da fatura; os outros meios usam a data do lançamento. |
| **A pagar até este mês** | Despesas pendentes com vencimento até o final do mês, incluindo atrasados. Cartão usa o vencimento registrado na fatura. |
| **Saldo anterior** | Saldo inicial mais recebimentos e pagamentos realizados até o fim do mês passado. Pode ser positivo ou negativo. |
| **Saldo realizado** | Saldo anterior mais entradas realizadas menos saídas realizadas. Para cartão e recorrências com pagamento registrado, considera a data efetiva. |
| **Saldo previsto após pendências** | Saldo realizado mais receitas pendentes menos despesas pendentes até o fim do mês. |

**Despesas do mês** e **A pagar até este mês** podem ser diferentes: uma compra pode pertencer à fatura de dezembro e vencer em janeiro. Pagar uma despesa reduz as pendências e atualiza o saldo realizado, sem criar uma segunda despesa.

O painel inclui evolução do saldo em seis meses, gastos por categoria e comparação entre cartão de crédito e pagamentos à vista.

## Dados e backups

Os dados ficam no `localStorage` do navegador, sob a chave `castor-wallet-v1`. O aplicativo não envia transações para um banco de dados no servidor, não sincroniza dispositivos, não conecta contas bancárias e não executa pagamentos.

- **Exportar backup JSON** e **Importar backup JSON** ficam no topo, com acesso também no guia.
- A importação valida o arquivo e pede confirmação antes de substituir a carteira atual. O limite é 5 MB.
- Backups incluem transações, categorias, cartões, emprego, recorrências e seu histórico.
- Limpar os dados do navegador pode apagar a carteira. Exporte backups regularmente.
- Outro navegador, dispositivo ou endereço possui armazenamento separado. As versões local e hospedada não compartilham dados automaticamente.

A limpeza por **APAGAR** remove as transações e zera o saldo inicial. Categorias, cartões, emprego e recorrências cadastradas permanecem. As cobranças apagadas não são recriadas; meses posteriores seguem as recorrências ativas.

Os backups contêm informações financeiras pessoais. O `.gitignore` exclui exportações com o padrão `castor-wallet-*.json`, além das pastas `backups/` e `arquivos-teste/`. Ele também exclui dependências, arquivos de ambiente, chaves, caches, logs e arquivos temporários. O código em `dist/` permanece versionado.

## Testes

Execute os testes de lógica:

```sh
npm test
```

A suíte cobre cálculos em centavos, CRUD, saldo entre meses, faturas, parcelas, recorrências, pagamentos, backups e limpeza protegida. Os testes de regressão dos bugs corrigidos permanecem no projeto.

Para executar as verificações de interface e responsividade:

```sh
node tests/responsive-server.mjs
```

Depois, abra:

- [Testes dos formulários e pagamentos](http://127.0.0.1:4174/__features).
- [Testes da navegação responsiva](http://127.0.0.1:4174/__responsive).

As páginas executam as verificações automaticamente e exibem o resultado. Usam dados fictícios no endereço local de teste e restauram o armazenamento anterior ao terminar. Aguarde uma execução terminar antes de iniciar a outra, pois ambas usam o mesmo armazenamento de teste.

Os testes responsivos exercitam telas de 320 a 1280 pixels e verificam navegação, espaço para o conteúdo, rótulos, áreas de toque, rolagem horizontal e pagamento de recorrências no celular.

## Estrutura do projeto

```text
dist/
  index.html        Estrutura e diálogos da aplicação
  style.css         Estilos e layout responsivo
  app.js            Navegação e interação com a interface
  model.js          Estado, validações e transações
  cashflow.js       Fluxo de caixa e transporte de saldo
  cards.js          Cartões e vencimentos das faturas
  installments.js  Compras parceladas
  recurring.js      Recorrências e seus pagamentos
  employment.js     Cadastro e preenchimento do salário
  reset.js          Limpeza com confirmação por digitação
  assets/           Logo e demais recursos visuais
tests/              Testes de lógica e páginas de regressão
server.mjs          Servidor para execução local
.openai/hosting.json Configuração da hospedagem Sites
```

## Hospedagem

A aplicação é estática: um servidor de arquivos pode servir o conteúdo de `dist/`, sem compilação. O arquivo `.openai/hosting.json` configura a publicação existente no Sites; ele não contém as transações dos usuários.

O servidor `server.mjs` é destinado à execução local. O controle de acesso da hospedagem é independente do armazenamento da carteira no navegador.
