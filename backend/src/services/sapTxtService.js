import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { customers, integrationLogs, orders, products, users } from '../data/mockDatabase.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sapRoot = join(__dirname, '..', '..', '..', 'sap-files');
const outboundDir = join(sapRoot, 'outbound');
const inboundDir = join(sapRoot, 'inbound');

// Utilitários de formatação do arquivo TXT.
// O layout real do SAP pode exigir outros tamanhos/campos; este MVP mantém um formato simples e previsível.
const pad = (value, size) => String(value ?? '').slice(0, size).padEnd(size, ' ');
const money = (value) => Number(value ?? 0).toFixed(2).replace('.', '').padStart(12, '0');

function buildOrderTxt(order) {
  const customer = customers.find((item) => item.id === order.clienteId);
  const seller = users.find((item) => item.id === order.vendedorId);

  // Linha H = cabeçalho do pedido.
  const lines = [[
    'H',
    pad(order.numeroInterno, 12),
    pad(customer?.codigoSap, 20),
    pad(seller?.codigoRepresentanteSap, 20),
    pad(order.condicaoPagamento, 30),
    pad(order.dataEntrega, 10),
    money(order.valorTotal)
  ].join('|')];

  // Linha I = item do pedido. Um pedido pode gerar várias linhas I.
  order.itens.forEach((item, index) => {
    const product = products.find((entry) => entry.id === item.produtoId);
    lines.push([
      'I',
      pad(index + 1, 3),
      pad(product?.codigoSap, 20),
      String(item.quantidade).padStart(10, '0'),
      money(item.precoUnitario),
      String(item.descontoPct).padStart(5, '0'),
      money(item.valorTotal)
    ].join('|'));
  });

  return `${lines.join('\n')}\n`;
}

// Gera o TXT no modo JSON e registra o envio no log em memória.
export async function generateOrderTxt(orderId, userId) {
  const order = orders.find((item) => item.id === Number(orderId));
  if (!order) return { ok: false, error: 'Pedido nao encontrado' };

  await mkdir(outboundDir, { recursive: true });
  const payload = buildOrderTxt(order);
  const fileName = `PED_${order.numeroInterno}.txt`;
  const filePath = join(outboundDir, fileName);
  await writeFile(filePath, payload, 'utf8');

  const previousStatus = order.status;
  order.status = 'TXT_GERADO';
  integrationLogs.push({
    id: integrationLogs.length + 1,
    pedidoId: order.id,
    usuarioId: userId,
    direcao: 'ENVIO',
    tipo: 'PEDIDO_TXT',
    arquivoNome: fileName,
    caminhoArquivo: filePath,
    payloadTxt: payload,
    resultado: 'SUCESSO',
    statusAnterior: previousStatus,
    statusNovo: order.status,
    criadoEm: new Date().toISOString()
  });

  return { ok: true, fileName, filePath, payload, order };
}

// Lê o retorno do SAP no modo JSON e atualiza o pedido correspondente.
export async function importSapReturn(fileName) {
  await mkdir(inboundDir, { recursive: true });
  const filePath = join(inboundDir, fileName);
  const content = await readFile(filePath, 'utf8');
  const [numeroInterno, resultado, numeroSap, ...messageParts] = content.trim().split('|');
  const order = orders.find((item) => item.numeroInterno === numeroInterno);

  if (!order) return { ok: false, error: 'Pedido do retorno nao encontrado' };

  const previousStatus = order.status;
  order.numeroSap = numeroSap || null;
  order.status = resultado === 'OK' ? 'IMPORTADO' : 'ERRO_SAP';
  order.erroMensagem = resultado === 'OK' ? null : messageParts.join('|') || 'Erro retornado pelo SAP';

  integrationLogs.push({
    id: integrationLogs.length + 1,
    pedidoId: order.id,
    usuarioId: null,
    direcao: 'RETORNO',
    tipo: 'RETORNO_SAP',
    arquivoNome: fileName,
    caminhoArquivo: filePath,
    respostaSap: content,
    numeroSap: order.numeroSap,
    resultado: resultado === 'OK' ? 'SUCESSO' : 'ERRO',
    statusAnterior: previousStatus,
    statusNovo: order.status,
    criadoEm: new Date().toISOString()
  });

  return { ok: true, order };
}
