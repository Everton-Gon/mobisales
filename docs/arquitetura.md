# Arquitetura do sistema

## Objetivo

O sistema funciona como uma camada de vendas desacoplada do SAP. O representante trabalha no frontend, o backend controla as regras de negócio e o SAP recebe pedidos por arquivo TXT.

## Camadas

### Frontend

Aplicação React/Vite responsável pela experiência do representante. Ela consome a API, mostra os dados em tela, monta pedidos, gera relatórios do usuário e aciona a geração de carga TXT.

Arquivos principais:

- `frontend/src/main.jsx`: decide se o usuário verá a área admin ou representante.
- `frontend/src/api.js`: centraliza as chamadas HTTP para o backend.
- `frontend/src/pages/DashboardVendedor.jsx`: visão principal do representante.
- `frontend/src/pages/FormPedido.jsx`: montagem e confirmação do pedido.
- `frontend/src/pages/PaginaCarga.jsx`: geração de TXT e acompanhamento dos pedidos pendentes.
- `frontend/src/components/MenuLateral.jsx`: menu recolhível e responsivo.

### Backend

API Node.js usando o módulo `http` nativo. Ela recebe as chamadas do frontend, valida dados, salva no MySQL e controla a integração TXT.

Arquivos principais:

- `backend/src/server.js`: rotas HTTP e escolha entre MySQL ou JSON.
- `backend/src/services/mysqlService.js`: persistência real em MySQL e integração SAP em modo banco.
- `backend/src/services/sapTxtService.js`: integração TXT em modo JSON.
- `backend/src/services/persistenceService.js`: persistência JSON para testes sem MySQL.
- `backend/scripts/init-db.js`: aplica `schema.sql` e `seed.sql` no MySQL.

### Banco de dados

O banco `db_crm` armazena usuários, clientes, produtos, tabelas de preço, pedidos, itens e logs de integração.

Tabelas principais:

- `usuarios`
- `clientes`
- `produtos`
- `tabelas_preco`
- `tabela_preco_itens`
- `pedidos`
- `pedido_itens`
- `integracao_logs`

### Integração SAP

O sistema não chama o SAP em tempo real. Ele gera arquivos TXT na pasta de saída e lê arquivos de retorno na pasta de entrada.

Pastas:

- `sap-files/outbound`: arquivos gerados para o SAP consumir.
- `sap-files/inbound`: arquivos de retorno gerados pelo SAP.

## Status de pedido

- `PENDENTE_TXT`: pedido salvo, mas ainda sem arquivo gerado.
- `TXT_GERADO`: arquivo TXT criado para o SAP.
- `IMPORTADO`: SAP retornou sucesso.
- `ERRO_SAP`: SAP retornou erro.
- `RASCUNHO`: reservado para pedido ainda não confirmado.

## Decisão importante

A visão admin existe no projeto, mas as melhorias recentes estão concentradas na visão do representante, conforme a regra combinada: só mexer no admin quando isso for pedido explicitamente.
