import { healthRoute } from './health.js';
import { authRoutes } from './auth.js';
import { bootstrapRoute } from './bootstrap.js';
import { dataRoutes } from './data.js';
import { ordersRoutes } from './orders.js';
import { sapRoutes } from './sap.js';
import { sendJson } from '../utils/http.js';

export async function handleRoutes(request, response, data) {
  const url = new URL(request.url, `http://${request.headers.host}`);

  // OPTIONS para CORS
  if (request.method === 'OPTIONS') {
    return sendJson(response, 204, {});
  }

  // Tenta cada rota em ordem
  if (await healthRoute(request, response, data)) return;
  if (await authRoutes(request, response, data)) return;
  if (await bootstrapRoute(request, response, data)) return;
  if (await dataRoutes(request, response, data)) return;
  if (await ordersRoutes(request, response, data)) return;
  if (await sapRoutes(request, response, data)) return;

  // 404
  return sendJson(response, 404, { message: 'Rota nao encontrada' });
}
