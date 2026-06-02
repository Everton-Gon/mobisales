import http from 'node:http';
import { handleRoutes } from './routes/index.js';
import { customers, integrationLogs, orders, priceTableItems, priceTables, products, users } from './data/mockDatabase.js';
import { loadData, saveData } from './services/persistenceService.js';
import * as mysqlService from './services/mysqlService.js';
import * as sapService from './services/sapTxtService.js';
import { handleError } from './middleware/errorHandler.js';

const port = Number(process.env.PORT ?? 3333);
const useMysql = mysqlService.isMysqlEnabled();

// Dados compartilhados entre rotas
const appData = {
  useMysql,
  mysqlService,
  sapService,
  persistenceService: { saveData },
  mockData: { users, customers, products, priceTables, priceTableItems, orders, integrationLogs }
};

// Servidor HTTP
const server = http.createServer(async (request, response) => {
  try {
    await handleRoutes(request, response, appData);
  } catch (error) {
    handleError(error, response);
  }
});

// No modo JSON, carrega dados antes de iniciar
if (!useMysql) await loadData();
server.listen(port, () => console.log(`API rodando em http://localhost:${port} usando ${useMysql ? 'MySQL' : 'JSON'}`));




