import { findById, nextId } from './collectionUtils.js';

// Normaliza o número do pedido
export function normalizeOrderNumber(value) {
  return String(value ?? '').trim();
}

// Gera próximo número de ordem interno
export function nextOrderNumber(orders) {
  const maxNumber = orders.reduce((max, order) => {
    const current = Number(String(order.numeroInterno ?? '').replace(/\D/g, ''));
    return Number.isFinite(current) ? Math.max(max, current) : max;
  }, 0);
  return String(maxNumber + 1).padStart(3, '0');
}

// Calcula o total de um pedido
export function calculateOrderTotal(items) {
  return items.reduce((sum, item) => sum + Number(item.valorTotal ?? 0), 0);
}

// Normaliza itens do pedido para formato correto
export function normalizeOrderItems(items = []) {
  return items
    .map((item) => ({
      produtoId: Number(item.produtoId),
      quantidade: Number(item.quantidade ?? 0),
      precoTabela: Number(item.precoTabela ?? item.precoUnitario ?? 0),
      precoUnitario: Number(item.precoUnitario ?? item.precoTabela ?? 0),
      descontoPct: Number(item.descontoPct ?? 0),
      valorTotal: Number(item.valorTotal ?? 0)
    }))
    .filter((item) => item.produtoId && item.quantidade > 0);
}
