import { sendJson } from '../utils/http.js';

// Middleware de tratamento de erros
export function handleError(error, response) {
  console.error('Erro:', error);
  // Verifica se headers já foram enviados
  if (!response.headersSent) {
    sendJson(response, 500, { message: error.message });
  }
}
