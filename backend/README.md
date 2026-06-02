# Backend

API Node.js responsável por autenticação, carga de dados, pedidos, geração TXT e retorno SAP.

## Scripts

```powershell
npm run dev      # inicia a API em http://localhost:3333
npm run check    # valida a sintaxe de server.js
npm run db:init  # aplica database/schema.sql e database/seed.sql no MySQL
```

## Variáveis de ambiente

```text
PORT=3333
DB_DRIVER=mysql
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=db_crm
```

Use `DB_DRIVER=json` apenas para testes locais sem MySQL.

## Rotas principais

### Saúde da API

```text
GET /api/health
```

Retorna se a API está de pé e qual driver está ativo: `mysql` ou `json`.

### Login

```text
POST /api/auth/login
```

Body:

```json
{
  "login": "b91_everton",
  "password": "123456"
}
```

### Bootstrap

```text
GET /api/bootstrap
```

Retorna todos os dados usados pelo frontend: usuários, clientes, produtos, tabelas de preço, pedidos e logs.

### Pedido

```text
GET /api/orders
GET /api/orders/:id
POST /api/orders
PUT /api/orders/:id
PATCH /api/orders/:id
DELETE /api/orders/:id
```

### Geração TXT

```text
POST /api/orders/:id/generate-txt
```

Gera `sap-files/outbound/PED_XXXXX.txt` e cria um log de integração.

### Retorno SAP

```text
POST /api/sap/import-return
```

Body:

```json
{
  "fileName": "00241_ok.txt"
}
```

Lê o arquivo em `sap-files/inbound` e atualiza status do pedido.

## Serviços internos

- `server.js`: concentra rotas e resposta HTTP.
- `mysqlService.js`: camada de banco e TXT usando MySQL.
- `sapTxtService.js`: geração/leitura TXT no modo JSON.
- `persistenceService.js`: grava os mocks em `backend/storage/database.json` no modo JSON.
- `mockDatabase.js`: dados iniciais para teste sem banco.

## Observação sobre senha

No MVP, a senha está sendo comparada como texto simples para facilitar o teste. Antes de produção, trocar por hash seguro, como `bcrypt`, e incluir JWT ou sessão segura.
