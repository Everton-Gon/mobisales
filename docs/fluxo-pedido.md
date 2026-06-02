# Fluxo do pedido

## 1. Login

O representante entra com login e senha. O login pode seguir o padrão do Landix, por exemplo `b91_everton`, e o código SAP do representante fica salvo no cadastro do usuário.

Rota usada:

```text
POST /api/auth/login
```

## 2. Carga inicial da tela

Depois do login, o frontend busca todos os dados necessários para funcionar:

```text
GET /api/bootstrap
```

Esse retorno alimenta dashboard, clientes, produtos, pedidos, tabelas de preço e logs.

## 3. Montagem do pedido

Na tela `Novo pedido`, o sistema:

- filtra os clientes vinculados ao vendedor logado;
- identifica a tabela de preço do cliente;
- lista apenas produtos ativos que possuem preço nessa tabela;
- calcula preço unitário com desconto;
- bloqueia desconto acima do máximo permitido;
- calcula subtotal do pedido.

## 4. Salvamento no banco

Ao confirmar, o frontend chama:

```text
POST /api/orders
```

O backend valida:

- cliente existente;
- vendedor existente;
- tabela de preço existente;
- pelo menos um item com quantidade maior que zero;
- produto existente;
- produto com preço na tabela selecionada;
- desconto dentro do limite.

Se tudo estiver correto, o pedido é salvo com status `PENDENTE_TXT`.

## 5. Atualização da visão do representante

Depois de salvar, o frontend chama novamente `/api/bootstrap`. Por isso, quando o banco está funcionando, as telas `Meus pedidos`, `Dashboard`, `Relatórios` e `Gerar Carga` passam a refletir o pedido novo.

## 6. Geração do arquivo TXT

Na tela `Gerar Carga`, o usuário pode gerar o TXT de um pedido ou a carga completa dos pedidos pendentes.

Rota usada:

```text
POST /api/orders/:id/generate-txt
```

O backend cria o arquivo em:

```text
sap-files/outbound/PED_XXXXX.txt
```

Depois disso, o pedido muda para `TXT_GERADO` e o log de integração registra o envio.

## 7. Retorno do SAP

Quando existir arquivo de retorno em `sap-files/inbound`, o sistema pode importar esse retorno pela rota:

```text
POST /api/sap/import-return
```

Formato esperado do retorno no MVP:

```text
NUMERO_INTERNO|OK|NUMERO_SAP
NUMERO_INTERNO|ERRO||MENSAGEM_DO_ERRO
```

Exemplos:

```text
00241|OK|4500012341
00241|ERRO||Preço divergente no SAP
```

## 8. Resultado final

- Retorno `OK`: pedido vira `IMPORTADO` e recebe o número SAP.
- Retorno `ERRO`: pedido vira `ERRO_SAP` e guarda a mensagem de erro.
