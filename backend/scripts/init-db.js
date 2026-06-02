import mysql from 'mysql2/promise';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

// Script de preparação do banco usado no início do projeto.
// Ele aplica o schema e depois popula dados iniciais para teste da aplicação.
const rootDir = join(process.cwd(), '..');
const schemaPath = join(rootDir, 'database', 'schema.sql');
const seedPath = join(rootDir, 'database', 'seed.sql');

const config = {
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
  multipleStatements: true
};

async function runSqlFile(connection, path) {
  const sql = await readFile(path, 'utf8');
  await connection.query(sql);
}

const connection = await mysql.createConnection(config);
try {
  console.log('Aplicando schema em db_crm...');
  await runSqlFile(connection, schemaPath);

  console.log('Inserindo seed inicial...');
  await runSqlFile(connection, seedPath);

  console.log('Banco db_crm pronto.');
} finally {
  await connection.end();
}
