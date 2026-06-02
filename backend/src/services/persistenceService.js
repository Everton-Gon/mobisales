import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { customers, integrationLogs, orders, priceTableItems, priceTables, products, users } from '../data/mockDatabase.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const storageDir = join(__dirname, '..', '..', 'storage');
const storageFile = join(storageDir, 'database.json');

// Coleções mantidas em memória no modo JSON.
// Esse modo é útil para teste local quando o MySQL ainda não está configurado.
const collections = {
  users,
  customers,
  products,
  priceTables,
  priceTableItems,
  orders,
  integrationLogs
};

function replaceArray(target, source) {
  target.splice(0, target.length, ...(Array.isArray(source) ? source : []));
}

// Carrega o arquivo JSON persistido; se ele não existir, cria com os mocks iniciais.
export async function loadData() {
  try {
    const raw = await readFile(storageFile, 'utf8');
    const parsed = JSON.parse(raw);

    Object.entries(collections).forEach(([key, target]) => {
      if (Array.isArray(parsed[key])) replaceArray(target, parsed[key]);
    });

    return { ok: true, loaded: true, file: storageFile };
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    await saveData();
    return { ok: true, loaded: false, file: storageFile };
  }
}

// Salva o estado atual em disco para não perder pedidos criados em modo JSON.
export async function saveData() {
  await mkdir(storageDir, { recursive: true });
  const payload = Object.fromEntries(
    Object.entries(collections).map(([key, value]) => [key, value])
  );
  await writeFile(storageFile, JSON.stringify(payload, null, 2), 'utf8');
  return { ok: true, file: storageFile };
}
