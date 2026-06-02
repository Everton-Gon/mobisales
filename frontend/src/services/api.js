// Cliente HTTP centralizado do frontend.
// Se o backend mudar de porta ou host, ajuste apenas esta constante.
const API_URL = 'http://localhost:3333/api';

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
    ...options
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message ?? 'Erro na requisicao');
  return data;
}

// Autenticação do usuário pelo login estilo Landix, exemplo: b91_everton.
export const login = (payload) => request('/auth/login', { method: 'POST', body: JSON.stringify(payload) });

// Carga inicial usada para alimentar dashboard, clientes, produtos, pedidos e logs.
export const loadBootstrap = () => request('/bootstrap');

// Cria pedido no backend e deixa o status inicial como PENDENTE_TXT.
export const createOrder = (payload) => request('/orders', { method: 'POST', body: JSON.stringify(payload) });

// Atualiza cabeçalho e itens de um pedido existente.
export const updateOrder = (orderId, payload) => request(`/orders/${orderId}`, { method: 'PUT', body: JSON.stringify(payload) });

// Gera o arquivo PED_XXXXX.txt para o SAP consumir.
export const generateOrderTxt = (orderId) => request(`/orders/${orderId}/generate-txt`, { method: 'POST' });

// Lê um arquivo de retorno já disponível em sap-files/inbound.
export const importSapReturn = (fileName) => request('/sap/import-return', { method: 'POST', body: JSON.stringify({ fileName }) });
