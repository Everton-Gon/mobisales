import { findById } from './collectionUtils.js';
import { normalizeOrderItems, normalizeOrderNumber } from './orderUtils.js';

// Valida pedido no modo JSON
export function validateJsonOrderPayload(body, { customers, orders, users, priceTables, products, priceTableItems }) {
  const clienteId = Number(body.clienteId);
  const vendedorId = Number(body.vendedorId);
  const tabelaPrecoId = Number(body.tabelaPrecoId);
  const itens = normalizeOrderItems(body.itens ?? []);
  const numeroInterno = normalizeOrderNumber(body.numeroInterno);

  if (!numeroInterno) return { error: 'Numero do pedido e obrigatorio' };
  if (orders.some((order) => order.numeroInterno === numeroInterno && Number(order.clienteId) === clienteId && Number(order.id) !== Number(body.id))) {
    return { error: 'Numero do pedido ja existe para este cliente' };
  }
  if (!findById(customers, clienteId)) return { error: 'Cliente nao encontrado' };
  if (!findById(users, vendedorId)) return { error: 'Vendedor nao encontrado' };
  if (!findById(priceTables, tabelaPrecoId)) return { error: 'Tabela de preco nao encontrada' };
  if (itens.length === 0) {
    return { error: 'Pedido precisa ter ao menos um item com quantidade maior que zero' };
  }

  for (const item of itens) {
    if (!findById(products, item.produtoId)) return { error: `Produto ${item.produtoId} nao encontrado` };
    const priceItem = priceTableItems.find(
      (entry) => Number(entry.tabelaPrecoId) === tabelaPrecoId && Number(entry.produtoId) === Number(item.produtoId)
    );
    if (!priceItem) return { error: `Produto ${item.produtoId} nao possui preco na tabela selecionada` };
    if (item.descontoPct > Number(priceItem.descontoMaxPct ?? 0)) {
      return { error: `Desconto do produto ${item.produtoId} excede o maximo permitido` };
    }
  }

  return { clienteId, vendedorId, tabelaPrecoId, itens, numeroInterno };
}

