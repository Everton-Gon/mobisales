import { findById, nextId } from '../utils/collectionUtils.js';
import { calculateOrderTotal, normalizeOrderNumber, normalizeOrderItems } from '../utils/orderUtils.js';
import { validateJsonOrderPayload } from '../utils/validators.js';

export async function handleListOrders(data) {
  const { useMysql, mysqlService, mockData } = data;
  const orders = useMysql ? await mysqlService.listOrders() : mockData.orders;
  return { ok: true, orders };
}

export async function handleGetOrderById(id, data) {
  const { useMysql, mysqlService, mockData } = data;
  const order = useMysql ? await mysqlService.getOrderById(id) : findById(mockData.orders, id);
  
  if (!order) return { ok: false, message: 'Pedido nao encontrado', status: 404 };
  return { ok: true, order };
}

export async function handleCreateOrder(body, data) {
  const { useMysql, mysqlService, mockData, persistenceService } = data;
  
  if (useMysql) {
    const result = await mysqlService.createOrder(body);
    return { ...result, status: result.ok ? 201 : 400 };
  }

  const result = createJsonOrder(body, mockData);
  if (result.ok) await persistenceService.saveData();
  
  return { ...result, status: result.ok ? 201 : 400 };
}

export async function handleUpdateOrder(id, body, data) {
  const { useMysql, mysqlService, mockData, persistenceService } = data;
  
  if (useMysql) {
    const result = await mysqlService.updateOrder(id, body);
    if (result?.ok === false) return { ...result, status: 400 };
    return result ? { ok: true, order: result, status: 200 } : { ok: false, message: 'Pedido nao encontrado', status: 404 };
  }

  const result = updateJsonOrder(id, body, mockData);
  if (result?.ok === false) return { ...result, status: 400 };
  if (result) await persistenceService.saveData();
  
  return result ? { ok: true, order: result, status: 200 } : { ok: false, message: 'Pedido nao encontrado', status: 404 };
}

export async function handleDeleteOrder(id, data) {
  const { useMysql, mysqlService, mockData, persistenceService } = data;
  
  if (useMysql) {
    const result = await mysqlService.deleteOrder(id);
    return result ? { ok: true, order: result, status: 200 } : { ok: false, message: 'Pedido nao encontrado', status: 404 };
  }

  const result = deleteJsonOrder(id, mockData);
  if (result) await persistenceService.saveData();
  
  return result ? { ok: true, order: result, status: 200 } : { ok: false, message: 'Pedido nao encontrado', status: 404 };
}

// Funções auxiliares para JSON
function createJsonOrder(body, mockData) {
  const validated = validateJsonOrderPayload(body, mockData);
  if (validated.error) return { ok: false, message: validated.error };

  const seller = findById(mockData.users, validated.vendedorId);
  const orderItems = validated.itens.map((item) => ({
    ...item,
    valorTotal: item.valorTotal || item.quantidade * item.precoUnitario
  }));

  const order = {
    id: nextId(mockData.orders),
    numeroInterno: validated.numeroInterno,
    numeroSap: null,
    clienteId: validated.clienteId,
    vendedorId: validated.vendedorId,
    codigoRepresentanteSap: seller?.codigoRepresentanteSap ?? null,
    tabelaPrecoId: validated.tabelaPrecoId,
    status: 'PENDENTE_TXT',
    condicaoPagamento: body.condicaoPagamento ?? '',
    dataEntrega: body.dataEntrega ?? null,
    valorTotal: Number(body.valorTotal ?? calculateOrderTotal(orderItems)),
    erroMensagem: null,
    itens: orderItems,
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString()
  };

  mockData.orders.push(order);
  return { ok: true, order };
}

function updateJsonOrder(id, body, mockData) {
  const order = findById(mockData.orders, id);
  if (!order) return null;
  
  const nextItems = body.itens ? normalizeOrderItems(body.itens) : order.itens;
  const numeroInterno = normalizeOrderNumber(body.numeroInterno ?? order.numeroInterno);
  
  if (!numeroInterno) return { ok: false, message: 'Numero do pedido e obrigatorio' };
  const targetClienteId = Number(body.clienteId ?? order.clienteId);
  if (mockData.orders.some((item) => item.numeroInterno === numeroInterno && Number(item.clienteId) === targetClienteId && Number(item.id) !== Number(id))) {
    return { ok: false, message: 'Numero do pedido ja existe para este cliente' };
  }

  Object.assign(order, {
    numeroInterno,
    clienteId: targetClienteId,
    vendedorId: body.vendedorId ? Number(body.vendedorId) : order.vendedorId,
    tabelaPrecoId: body.tabelaPrecoId ? Number(body.tabelaPrecoId) : order.tabelaPrecoId,
    condicaoPagamento: body.condicaoPagamento ?? order.condicaoPagamento,
    dataEntrega: body.dataEntrega ?? order.dataEntrega,
    status: body.status ?? order.status,
    itens: nextItems,
    valorTotal: Number(body.valorTotal ?? calculateOrderTotal(nextItems)),
    atualizadoEm: new Date().toISOString()
  });

  return order;
}

function deleteJsonOrder(id, mockData) {
  const index = mockData.orders.findIndex((item) => Number(item.id) === Number(id));
  if (index === -1) return null;
  const [order] = mockData.orders.splice(index, 1);
  return order;
}

