import { sendJson } from '../utils/http.js';
import { handleGetData } from '../controllers/dataController.js';

export async function dataRoutes(request, response, data) {
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (request.method !== 'GET') return false;

  const routes = {
    '/api/users': 'users',
    '/api/customers': 'customers',
    '/api/products': 'products',
    '/api/price-tables': 'price-tables',
    '/api/integration-logs': 'integration-logs'
  };

  try {
    if (routes[url.pathname]) {
      const result = await handleGetData(routes[url.pathname], data);
      sendJson(response, 200, result.data);
      return true;
    }
  } catch (error) {
    if (!response.headersSent) {
      sendJson(response, 500, { message: error.message });
    }
    return true;
  }

  return false;
}
