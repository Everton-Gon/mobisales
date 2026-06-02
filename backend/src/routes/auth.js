import { sendJson, readJson } from '../utils/http.js';
import { handleLogin, handleGetUsers } from '../controllers/authController.js';

export async function authRoutes(request, response, data) {
  const url = new URL(request.url, `http://${request.headers.host}`);

  try {
    // POST /api/auth/login
    if (request.method === 'POST' && url.pathname === '/api/auth/login') {
      const body = await readJson(request);
      const result = await handleLogin(body, data);
      return sendJson(response, result.ok ? 200 : 401, result.ok ? { user: result.user } : { message: result.message });
    }
  } catch (error) {
    if (!response.headersSent) {
      sendJson(response, 500, { message: error.message });
    }
  }

  return false;
}
