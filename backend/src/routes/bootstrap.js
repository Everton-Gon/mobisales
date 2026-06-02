import { sendJson } from '../utils/http.js';
import { handleGetBootstrap } from '../controllers/dataController.js';

export async function bootstrapRoute(request, response, data) {
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (request.method !== 'GET' || url.pathname !== '/api/bootstrap') return false;

  try {
    const result = await handleGetBootstrap(data);
    sendJson(response, 200, result.bootstrap);
  } catch (error) {
    if (!response.headersSent) {
      sendJson(response, 500, { message: error.message });
    }
  }

  return true;
}
