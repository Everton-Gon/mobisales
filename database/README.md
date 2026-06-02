# Banco de Dados - db_crm

## 1. Criar estrutura

No MySQL, execute:

```powershell
mysql -u root -p < database\schema.sql
```

## 2. Inserir dados iniciais

```powershell
mysql -u root -p db_crm < database\seed.sql
```

## 3. Configurar backend

Crie um arquivo `backend\.env` baseado em `backend\.env.example`:

```env
PORT=3333
DB_DRIVER=mysql
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=sua_senha
DB_NAME=db_crm
```

Como o Node não carrega `.env` automaticamente neste projeto, você pode iniciar com variáveis no PowerShell:

```powershell
cd backend
$env:DB_DRIVER="mysql"
$env:DB_HOST="localhost"
$env:DB_PORT="3306"
$env:DB_USER="root"
$env:DB_PASSWORD="sua_senha"
$env:DB_NAME="db_crm"
npm run dev
```

Para voltar temporariamente ao JSON local:

```powershell
$env:DB_DRIVER="json"
npm run dev
```
