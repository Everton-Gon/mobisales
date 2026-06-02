import { sendJson } from '../utils/http.js';

export function healthRoute(request, response, data) {
  if (request.method !== 'GET') return false;
  if (new URL(request.url, `http://${request.headers.host}`).pathname !== '/api/health') return false;

  const db = data.useMysql ? { db: 'mysql' } : { db: 'json' };
  sendJson(response, 200, {
    ok: true,
    service: 'forca-vendas-sap-backend',
    driver: data.useMysql ? 'mysql' : 'json',
    db
  });

  return true;
}
