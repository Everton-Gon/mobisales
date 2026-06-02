import { sendJson, readJson } from '../utils/http.js';
import { handleGenerateTxt, handleImportSapReturn } from '../controllers/sapController.js';

export async function sapRoutes(request, response, data) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const generateTxtMatch = url.pathname.match(/^\/api\/orders\/(\d+)\/generate-txt$/);

  try {
    // POST /api/orders/:id/generate-txt
    if (request.method === 'POST' && generateTxtMatch) {
      const body = await readJson(request);
      const result = await handleGenerateTxt(generateTxtMatch[1], body, data);
      return sendJson(response, result.status, result.ok ? result : result.message);
    }

    // POST /api/sap/import-return
    if (request.method === 'POST' && url.pathname === '/api/sap/import-return') {
      const body = await readJson(request);
      const result = await handleImportSapReturn(body, data);
      return sendJson(response, result.status, result.ok ? result : result.message);
    }
  } catch (error) {
    if (!response.headersSent) {
      sendJson(response, 500, { message: error.message });
    }
    return true;
  }

  return false;
}
