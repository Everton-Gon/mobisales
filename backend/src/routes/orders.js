import { sendJson, readJson } from '../utils/http.js';
import {
  handleListOrders,
  handleGetOrderById,
  handleCreateOrder,
  handleUpdateOrder,
  handleDeleteOrder
} from '../controllers/ordersController.js';

export async function ordersRoutes(request, response, data) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const orderMatch = url.pathname.match(/^\/api\/orders\/(\d+)$/);

  try {
    // GET /api/orders
    if (request.method === 'GET' && url.pathname === '/api/orders') {
      const result = await handleListOrders(data);
      return sendJson(response, 200, { orders: result.orders });
    }

    // POST /api/orders
    if (request.method === 'POST' && url.pathname === '/api/orders') {
      const body = await readJson(request);
      const result = await handleCreateOrder(body, data);
      return sendJson(response, result.status, result.ok ? result : { message: result.message });
    }

    // GET /api/orders/:id
    if (orderMatch && request.method === 'GET') {
      const result = await handleGetOrderById(orderMatch[1], data);
      return sendJson(response, result.status ?? 200, result.ok ? result : { message: result.message });
    }

    // PUT/PATCH /api/orders/:id
    if (orderMatch && (request.method === 'PUT' || request.method === 'PATCH')) {
      const body = await readJson(request);
      const result = await handleUpdateOrder(orderMatch[1], body, data);
      return sendJson(response, result.status, result.ok ? result : { message: result.message });
    }

    // DELETE /api/orders/:id
    if (orderMatch && request.method === 'DELETE') {
      const result = await handleDeleteOrder(orderMatch[1], data);
      return sendJson(response, result.status, result.ok ? result : { message: result.message });
    }
  } catch (error) {
    if (!response.headersSent) {
      sendJson(response, 500, { message: error.message });
    }
    return true;
  }

  return false;
}
