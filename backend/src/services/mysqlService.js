import mysql from 'mysql2/promise';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sapRoot = join(__dirname, '..', '..', '..', 'sap-files');
const outboundDir = join(sapRoot, 'outbound');
const inboundDir = join(sapRoot, 'inbound');

let pool;

// Driver MySQL é o padrão porque o projeto já terá o banco db_crm.

export function isMysqlEnabled() {
  return String(process.env.DB_DRIVER ?? 'mysql').toLowerCase() === 'mysql';
}

// Cria um pool reutilizável para evitar abrir conexão a cada consulta.
export function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 3306),
      user: process.env.DB_USER ?? 'root',
      password: process.env.DB_PASSWORD ?? '',
      database: process.env.DB_NAME ?? 'db_crm',
      waitForConnections: true,
      connectionLimit: 10,
      namedPlaceholders: true,
      decimalNumbers: true,
      dateStrings: true
    });
  }
  return pool;
}

export async function testConnection() {
  const [rows] = await getPool().query('SELECT DATABASE() AS db, NOW() AS now');
  return rows[0];
}

const bool = (value) => Boolean(Number(value));
const dateOnly = (value) => value ? String(value).slice(0, 10) : null;

// Mappers convertem snake_case do MySQL para camelCase usado pelo frontend.
function mapUser(row, includePassword = false) {
  const mapped = {
    id: row.id,
    login: row.login,
    codigoRepresentanteSap: row.codigo_representante_sap,
    nome: row.nome,
    email: row.email,
    perfil: row.perfil,
    ativo: bool(row.ativo),
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em
  };
  if (includePassword) mapped.password = row.senha_hash;
  return mapped;
}

function mapCustomer(row) {
  return {
    id: row.id,
    codigoSap: row.codigo_sap,
    razaoSocial: row.razao_social,
    nomeFantasia: row.nome_fantasia,
    cnpj: row.cnpj,
    endereco: row.endereco,
    cidade: row.cidade,
    uf: row.uf,
    telefone: row.telefone,
    vendedorId: row.vendedor_id,
    tabelaPrecoId: row.tabela_preco_id,
    limiteCredito: row.limite_credito,
    ativo: bool(row.ativo),
    bloqueado: bool(row.bloqueado)
  };
}

function mapProduct(row) {
  return {
    id: row.id,
    codigoSap: row.codigo_sap,
    descricao: row.descricao,
    unidade: row.unidade,
    codigoBarras: row.codigo_barras,
    categoria: row.categoria,
    imagemUrl: row.imagem_url,
    estoqueAtual: Number(row.estoque_atual ?? 0),
    estoqueMinimo: Number(row.estoque_minimo ?? 0),
    ativo: bool(row.ativo)
  };
}

function mapPriceTable(row) {
  return {
    id: row.id,
    nome: row.nome,
    vigenciaInicio: dateOnly(row.vigencia_inicio),
    vigenciaFim: dateOnly(row.vigencia_fim),
    ativa: bool(row.ativa)
  };
}

function mapPriceTableItem(row) {
  return {
    id: row.id,
    tabelaPrecoId: row.tabela_preco_id,
    produtoId: row.produto_id,
    precoBase: Number(row.preco_base ?? 0),
    descontoMaxPct: Number(row.desconto_max_pct ?? 0)
  };
}

function mapOrder(row, itens = []) {
  return {
    id: row.id,
    numeroInterno: row.numero_interno,
    numeroSap: row.numero_sap,
    clienteId: row.cliente_id,
    vendedorId: row.vendedor_id,
    codigoRepresentanteSap: row.codigo_representante_sap,
    tabelaPrecoId: row.tabela_preco_id,
    status: row.status,
    origem: row.origem,
    condicaoPagamento: row.condicao_pagamento,
    dataEntrega: dateOnly(row.data_entrega),
    observacao: row.observacao,
    valorTotal: Number(row.valor_total ?? 0),
    erroMensagem: row.erro_mensagem,
    enviadoSapEm: row.enviado_sap_em,
    processadoSapEm: row.processado_sap_em,
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em,
    itens
  };
}

function mapOrderItem(row) {
  return {
    id: row.id,
    pedidoId: row.pedido_id,
    produtoId: row.produto_id,
    quantidade: Number(row.quantidade ?? 0),
    precoTabela: Number(row.preco_tabela ?? 0),
    precoUnitario: Number(row.preco_unitario ?? 0),
    descontoPct: Number(row.desconto_pct ?? 0),
    descontoValor: Number(row.desconto_valor ?? 0),
    valorTotal: Number(row.valor_total ?? 0),
    observacaoItem: row.observacao_item
  };
}

function mapIntegrationLog(row) {
  return {
    id: row.id,
    pedidoId: row.pedido_id,
    usuarioId: row.usuario_id,
    direcao: row.direcao,
    tipo: row.tipo,
    arquivoNome: row.arquivo_nome,
    caminhoArquivo: row.caminho_arquivo,
    payloadTxt: row.payload_txt,
    respostaSap: row.resposta_sap,
    numeroSap: row.numero_sap,
    resultado: row.resultado,
    statusAnterior: row.status_anterior,
    statusNovo: row.status_novo,
    criadoEm: row.criado_em
  };
}

async function queryAll(sql, params, mapper) {
  const [rows] = await getPool().query(sql, params);
  return rows.map(mapper);
}

export async function getUserForLogin(login) {
  const [rows] = await getPool().query('SELECT * FROM usuarios WHERE login = ? AND ativo = 1 LIMIT 1', [login]);
  return rows[0] ? mapUser(rows[0], true) : null;
}

// Bootstrap entrega em uma chamada todos os dados que o frontend precisa para montar as telas.
export async function getBootstrap() {
  const [users, customers, products, priceTables, priceTableItems, orders, integrationLogs] = await Promise.all([
    queryAll('SELECT * FROM usuarios ORDER BY id', [], (row) => mapUser(row, false)),
    queryAll('SELECT * FROM clientes ORDER BY razao_social', [], mapCustomer),
    queryAll('SELECT * FROM produtos ORDER BY descricao', [], mapProduct),
    queryAll('SELECT * FROM tabelas_preco ORDER BY nome', [], mapPriceTable),
    queryAll('SELECT * FROM tabela_preco_itens ORDER BY tabela_preco_id, produto_id', [], mapPriceTableItem),
    listOrders(),
    queryAll('SELECT * FROM integracao_logs ORDER BY criado_em DESC, id DESC', [], mapIntegrationLog)
  ]);

  return { users, customers, products, priceTables, priceTableItems, orders, integrationLogs };
}

export async function listOrders() {
  const [orderRows] = await getPool().query('SELECT * FROM pedidos ORDER BY id');
  const [itemRows] = await getPool().query('SELECT * FROM pedido_itens ORDER BY pedido_id, id');
  const itemsByOrder = new Map();

  itemRows.forEach((row) => {
    const item = mapOrderItem(row);
    const list = itemsByOrder.get(item.pedidoId) ?? [];
    list.push(item);
    itemsByOrder.set(item.pedidoId, list);
  });

  return orderRows.map((row) => mapOrder(row, itemsByOrder.get(row.id) ?? []));
}

export async function getOrderById(id) {
  const [orderRows] = await getPool().query('SELECT * FROM pedidos WHERE id = ? LIMIT 1', [id]);
  if (!orderRows[0]) return null;
  const [itemRows] = await getPool().query('SELECT * FROM pedido_itens WHERE pedido_id = ? ORDER BY id', [id]);
  return mapOrder(orderRows[0], itemRows.map(mapOrderItem));
}

function normalizeItems(items = []) {
  return items
    .map((item) => ({
      produtoId: Number(item.produtoId),
      quantidade: Number(item.quantidade ?? 0),
      precoTabela: Number(item.precoTabela ?? item.precoUnitario ?? 0),
      precoUnitario: Number(item.precoUnitario ?? item.precoTabela ?? 0),
      descontoPct: Number(item.descontoPct ?? 0),
      descontoValor: Number(item.descontoValor ?? 0),
      valorTotal: Number(item.valorTotal ?? 0),
      observacaoItem: item.observacaoItem ?? null
    }))
    .filter((item) => item.produtoId && item.quantidade > 0);
}

async function nextOrderNumber(conn) {
  const [rows] = await conn.query('SELECT COALESCE(MAX(CAST(numero_interno AS UNSIGNED)), 0) + 1 AS next_number FROM pedidos');
  return String(rows[0].next_number).padStart(3, '0');
}

function normalizeOrderNumber(value) {
  return String(value ?? '').trim();
}

async function orderNumberExists(conn, clienteId, numeroInterno, ignoreId = null) {
  const params = ignoreId ? [clienteId, numeroInterno, ignoreId] : [clienteId, numeroInterno];
  const sql = ignoreId
    ? 'SELECT id FROM pedidos WHERE cliente_id = ? AND numero_interno = ? AND id <> ? LIMIT 1'
    : 'SELECT id FROM pedidos WHERE cliente_id = ? AND numero_interno = ? LIMIT 1';
  const [rows] = await conn.query(sql, params);
  return rows.length > 0;
}

// Centraliza as regras mínimas para impedir pedido inconsistente no banco.
async function validateOrder(conn, payload, items) {
  const [[customer]] = await conn.query('SELECT * FROM clientes WHERE id = ? LIMIT 1', [payload.clienteId]);
  if (!customer) return 'Cliente nao encontrado';

  const [[seller]] = await conn.query('SELECT * FROM usuarios WHERE id = ? LIMIT 1', [payload.vendedorId]);
  if (!seller) return 'Vendedor nao encontrado';

  const [[priceTable]] = await conn.query('SELECT * FROM tabelas_preco WHERE id = ? LIMIT 1', [payload.tabelaPrecoId]);
  if (!priceTable) return 'Tabela de preco nao encontrada';

  if (items.length === 0) return 'Pedido precisa ter ao menos um item com quantidade maior que zero';

  for (const item of items) {
    const [[priceItem]] = await conn.query(
      'SELECT * FROM tabela_preco_itens WHERE tabela_preco_id = ? AND produto_id = ? LIMIT 1',
      [payload.tabelaPrecoId, item.produtoId]
    );
    if (!priceItem) return `Produto ${item.produtoId} nao possui preco na tabela selecionada`;
    if (item.descontoPct > Number(priceItem.desconto_max_pct ?? 0)) return `Desconto do produto ${item.produtoId} excede o maximo permitido`;
  }

  return null;
}

// Cria o pedido e seus itens dentro de transação para não deixar dados pela metade.
export async function createOrder(payload) {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();

    const items = normalizeItems(payload.itens ?? []);
    const normalized = {
      clienteId: Number(payload.clienteId),
      vendedorId: Number(payload.vendedorId),
      tabelaPrecoId: Number(payload.tabelaPrecoId)
    };

    const validationError = await validateOrder(conn, normalized, items);
    if (validationError) {
      await conn.rollback();
      return { ok: false, message: validationError };
    }

    const [[seller]] = await conn.query('SELECT codigo_representante_sap FROM usuarios WHERE id = ?', [normalized.vendedorId]);
    const numeroInterno = normalizeOrderNumber(payload.numeroInterno);
    if (!numeroInterno) {
      await conn.rollback();
      return { ok: false, message: 'Numero do pedido e obrigatorio' };
    }
    if (await orderNumberExists(conn, normalized.clienteId, numeroInterno)) {
      await conn.rollback();
      return { ok: false, message: 'Numero do pedido ja existe para este cliente' };
    }
    const valorTotal = Number(payload.valorTotal ?? items.reduce((sum, item) => sum + item.valorTotal, 0));

    const [result] = await conn.query(
      `INSERT INTO pedidos
        (numero_interno, cliente_id, vendedor_id, codigo_representante_sap, tabela_preco_id, status, origem, condicao_pagamento, data_entrega, observacao, valor_total)
       VALUES (?, ?, ?, ?, ?, 'PENDENTE_TXT', 'WEB', ?, ?, ?, ?)`,
      [
        numeroInterno,
        normalized.clienteId,
        normalized.vendedorId,
        seller?.codigo_representante_sap ?? null,
        normalized.tabelaPrecoId,
        payload.condicaoPagamento ?? '',
        payload.dataEntrega ?? null,
        payload.observacao ?? null,
        valorTotal
      ]
    );

    for (const item of items) {
      const total = item.valorTotal || item.quantidade * item.precoUnitario;
      await conn.query(
        `INSERT INTO pedido_itens
          (pedido_id, produto_id, quantidade, preco_tabela, preco_unitario, desconto_pct, desconto_valor, valor_total, observacao_item)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [result.insertId, item.produtoId, item.quantidade, item.precoTabela, item.precoUnitario, item.descontoPct, item.descontoValor, total, item.observacaoItem]
      );
    }

    await conn.commit();
    return { ok: true, order: await getOrderById(result.insertId) };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function updateOrder(id, payload) {
  const existing = await getOrderById(id);
  if (!existing) return null;

  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const items = payload.itens ? normalizeItems(payload.itens) : existing.itens;
    const valorTotal = Number(payload.valorTotal ?? items.reduce((sum, item) => sum + Number(item.valorTotal ?? 0), 0));
    const numeroInterno = normalizeOrderNumber(payload.numeroInterno ?? existing.numeroInterno);
    if (!numeroInterno) {
      await conn.rollback();
      return { ok: false, message: 'Numero do pedido e obrigatorio' };
    }
    const targetClienteId = Number(payload.clienteId ?? existing.clienteId);
    if (await orderNumberExists(conn, targetClienteId, numeroInterno, id)) {
      await conn.rollback();
      return { ok: false, message: 'Numero do pedido ja existe para este cliente' };
    }

    await conn.query(
      `UPDATE pedidos
       SET numero_interno = ?, cliente_id = ?, vendedor_id = ?, tabela_preco_id = ?, status = ?, condicao_pagamento = ?, data_entrega = ?, observacao = ?, valor_total = ?
       WHERE id = ?`,
      [
        numeroInterno,
        targetClienteId,
        payload.vendedorId ?? existing.vendedorId,
        payload.tabelaPrecoId ?? existing.tabelaPrecoId,
        payload.status ?? existing.status,
        payload.condicaoPagamento ?? existing.condicaoPagamento,
        payload.dataEntrega ?? existing.dataEntrega,
        payload.observacao ?? existing.observacao,
        valorTotal,
        id
      ]
    );

    if (payload.itens) {
      await conn.query('DELETE FROM pedido_itens WHERE pedido_id = ?', [id]);
      for (const item of items) {
        await conn.query(
          `INSERT INTO pedido_itens
            (pedido_id, produto_id, quantidade, preco_tabela, preco_unitario, desconto_pct, desconto_valor, valor_total, observacao_item)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, item.produtoId, item.quantidade, item.precoTabela, item.precoUnitario, item.descontoPct, item.descontoValor, item.valorTotal, item.observacaoItem]
        );
      }
    }

    await conn.commit();
    return await getOrderById(id);
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function deleteOrder(id) {
  const existing = await getOrderById(id);
  if (!existing) return null;
  await getPool().query('DELETE FROM pedidos WHERE id = ?', [id]);
  return existing;
}

const pad = (value, size) => String(value ?? '').slice(0, size).padEnd(size, ' ');
const money = (value) => Number(value ?? 0).toFixed(2).replace('.', '').padStart(12, '0');

// Monta o conteúdo TXT que será depositado para o job do SAP consumir.
function buildOrderTxt(order, customer, seller, products) {
  const lines = [[
    'H',
    pad(order.numeroInterno, 12),
    pad(customer?.codigoSap, 20),
    pad(seller?.codigoRepresentanteSap, 20),
    pad(order.condicaoPagamento, 30),
    pad(order.dataEntrega, 10),
    money(order.valorTotal)
  ].join('|')];

  order.itens.forEach((item, index) => {
    const product = products.find((entry) => Number(entry.id) === Number(item.produtoId));
    lines.push([
      'I',
      pad(index + 1, 3),
      pad(product?.codigoSap, 20),
      String(item.quantidade).padStart(10, '0'),
      money(item.precoUnitario),
      String(item.descontoPct).padStart(3, '0'),
      money(item.valorTotal)
    ].join('|'));
  });

  return `${lines.join('\n')}\n`;
}

// Gera o arquivo TXT, atualiza status do pedido e registra log de integração.
export async function generateOrderTxt(orderId, userId = null) {
  const order = await getOrderById(orderId);
  if (!order) return { ok: false, error: 'Pedido nao encontrado' };

  const bootstrap = await getBootstrap();
  const customer = bootstrap.customers.find((item) => Number(item.id) === Number(order.clienteId));
  const seller = bootstrap.users.find((item) => Number(item.id) === Number(order.vendedorId));

  await mkdir(outboundDir, { recursive: true });
  const payload = buildOrderTxt(order, customer, seller, bootstrap.products);
  const fileName = `PED_${order.numeroInterno}.txt`;
  const filePath = join(outboundDir, fileName);
  await writeFile(filePath, payload, 'utf8');

  const previousStatus = order.status;
  await getPool().query('UPDATE pedidos SET status = ?, enviado_sap_em = CURRENT_TIMESTAMP WHERE id = ?', ['TXT_GERADO', orderId]);
  await getPool().query(
    `INSERT INTO integracao_logs
      (pedido_id, usuario_id, direcao, tipo, arquivo_nome, caminho_arquivo, payload_txt, resultado, status_anterior, status_novo)
     VALUES (?, ?, 'ENVIO', 'PEDIDO_TXT', ?, ?, ?, 'SUCESSO', ?, 'TXT_GERADO')`,
    [orderId, userId, fileName, filePath, payload, previousStatus]
  );

  return { ok: true, fileName, filePath, payload, order: await getOrderById(orderId) };
}

// Lê retorno SAP, atualiza número/status do pedido e registra o resultado no log.
export async function importSapReturn(fileName) {
  await mkdir(inboundDir, { recursive: true });
  const filePath = join(inboundDir, fileName);
  const content = await readFile(filePath, 'utf8');
  const [numeroInterno, resultado, numeroSap, ...messageParts] = content.trim().split('|');
  const [rows] = await getPool().query('SELECT * FROM pedidos WHERE numero_interno = ? LIMIT 1', [numeroInterno]);
  const row = rows[0];
  if (!row) return { ok: false, error: 'Pedido do retorno nao encontrado' };

  const previousStatus = row.status;
  const status = resultado === 'OK' ? 'IMPORTADO' : 'ERRO_SAP';
  const errorMessage = resultado === 'OK' ? null : messageParts.join('|') || 'Erro retornado pelo SAP';

  await getPool().query(
    'UPDATE pedidos SET numero_sap = ?, status = ?, erro_mensagem = ?, processado_sap_em = CURRENT_TIMESTAMP WHERE id = ?',
    [numeroSap || null, status, errorMessage, row.id]
  );
  await getPool().query(
    `INSERT INTO integracao_logs
      (pedido_id, usuario_id, direcao, tipo, arquivo_nome, caminho_arquivo, resposta_sap, numero_sap, resultado, status_anterior, status_novo)
     VALUES (?, NULL, 'RETORNO', 'RETORNO_SAP', ?, ?, ?, ?, ?, ?, ?)`,
    [row.id, fileName, filePath, content, numeroSap || null, resultado === 'OK' ? 'SUCESSO' : 'ERRO', previousStatus, status]
  );

  return { ok: true, order: await getOrderById(row.id) };
}







