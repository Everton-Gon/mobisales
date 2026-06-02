# Força de Vendas SAP TXT

Sistema MVP para força de vendas com React, Node.js, MySQL e integração com SAP por arquivo TXT.

A proposta do projeto é permitir que o representante faça pedidos em uma interface web simples, enquanto o backend salva os dados no MySQL e gera arquivos TXT no layout esperado pelo SAP. O SAP pode consumir esses arquivos por job/agendamento e devolver arquivos de retorno para atualizar o status dos pedidos.

## O que já existe

- Login por usuário, como `b91_everton`.
- Visão do representante com dashboard, clientes, produtos, novo pedido, meus pedidos, relatórios e geração de carga.
- Menu lateral recolhível no desktop e menu tipo hambúrguer no celular.
- Layout responsivo para smartphone, tablet, notebook e desktop.
- Backend com rotas REST usadas pelo frontend.
- Persistência principal em MySQL usando o banco `db_crm`.
- Modo alternativo em JSON para testes rápidos sem banco.
- Geração de arquivo TXT de pedido em `sap-files/outbound`.
- Leitura de retorno SAP em `sap-files/inbound`.
- Logs de integração para acompanhar envio e retorno.

## Estrutura de pastas

```text
crm/
  backend/       API Node.js, banco, integração TXT e scripts
  database/      schema.sql, seed.sql e instruções do banco db_crm
  docs/          documentação funcional e técnica em português
  frontend/      aplicação React/Vite
  sap-files/     arquivos TXT de envio e retorno SAP
```

## Como rodar o backend

```powershell
cd C:\Users\egoncalves\Downloads\crm\backend
npm install
npm run dev
```

Por padrão a API roda em:

```text
http://localhost:3333/api
```

## Como preparar o banco MySQL

Crie/garanta o banco `db_crm` no MySQL e configure as credenciais por variável de ambiente, se necessário:

```powershell
$env:DB_DRIVER='mysql'
$env:DB_HOST='localhost'
$env:DB_PORT='3306'
$env:DB_USER='root'
$env:DB_PASSWORD='sua_senha'
$env:DB_NAME='db_crm'
npm run db:init
```

Se o seu MySQL estiver sem senha para o usuário `root`, o projeto já usa senha vazia como padrão.

## Como rodar o frontend

```powershell
cd C:\Users\egoncalves\Downloads\crm\frontend
npm install
npm run dev -- --port 5173
```

Acesse:

```text
http://127.0.0.1:5173
```

## Logins iniciais

- Representante: `b91_everton` / `123456`
- Admin: `admin` / `admin123`

## Fluxo principal

1. O representante faz login.
2. O frontend carrega usuários, clientes, produtos, tabelas de preço, pedidos e logs por `/api/bootstrap`.
3. O representante monta um pedido com cliente, condição de pagamento, data de entrega, produtos, quantidades e descontos.
4. O backend valida cliente, vendedor, tabela de preço, produtos e desconto máximo.
5. O pedido é salvo no MySQL com status `PENDENTE_TXT`.
6. Na tela de geração de carga, o sistema gera `PED_XXXXX.txt`.
7. O status passa para `TXT_GERADO` e um log de integração é criado.
8. Quando o SAP gerar retorno, o backend lê o arquivo em `sap-files/inbound` e atualiza o pedido para `IMPORTADO` ou `ERRO_SAP`.

## Documentação complementar

- [Arquitetura](docs/arquitetura.md)
- [Fluxo do pedido](docs/fluxo-pedido.md)
- [Backend](backend/README.md)
- [Frontend](frontend/README.md)
- [Banco de dados](database/README.md)
