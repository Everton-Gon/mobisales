export const users = [
  { id: 1, login: 'b91_everton', password: '123456', codigoRepresentanteSap: 'B91/Q09', nome: 'Everton Gonçalves', perfil: 'VENDEDOR', ativo: true },
  { id: 2, login: 'admin', password: 'admin123', codigoRepresentanteSap: null, nome: 'Maria Admin', perfil: 'ADMIN', ativo: true }
];

export const priceTables = [{ id: 1, nome: 'Tabela Sul', vigenciaFim: '2026-12-31', ativa: true }];
export const customers = [
  { id: 1, codigoSap: 'C0001', razaoSocial: 'Distribuidora ABC Ltda', cnpj: '12.345.678/0001-90', vendedorId: 1, tabelaPrecoId: 1, ativo: true },
  { id: 2, codigoSap: 'C0002', razaoSocial: 'Comercial XYZ Ltda', cnpj: '98.765.432/0001-10', vendedorId: 1, tabelaPrecoId: 1, ativo: true }
];
export const products = [
  { id: 1, codigoSap: 'SKU001', descricao: 'Produto A', unidade: 'UN', categoria: 'ACESSORIOS', estoqueAtual: 120, ativo: true },
  { id: 2, codigoSap: 'SKU002', descricao: 'Produto B', unidade: 'UN', categoria: 'CAFETEIRAS', estoqueAtual: 80, ativo: true },
  { id: 3, codigoSap: 'LIQ001', descricao: 'Liquidificador Turbo 1200W 220V', unidade: 'UN', categoria: 'LIQUIDIFICADOR', estoqueAtual: 42, ativo: true },
  { id: 4, codigoSap: 'LIQ002', descricao: 'Liquidificador Compact 700W 127V', unidade: 'UN', categoria: 'LIQUIDIFICADOR', estoqueAtual: 65, ativo: true },
  { id: 5, codigoSap: 'LIQ003', descricao: 'Liquidificador Industrial 2L Inox', unidade: 'UN', categoria: 'LIQUIDIFICADOR', estoqueAtual: 18, ativo: true },
  { id: 6, codigoSap: 'FOR001', descricao: 'Forno Elétrico 45L 220V', unidade: 'UN', categoria: 'FORNOS', estoqueAtual: 24, ativo: true },
  { id: 7, codigoSap: 'FOG001', descricao: 'Fogão 4 Bocas Mesa Inox', unidade: 'UN', categoria: 'FOGOES', estoqueAtual: 31, ativo: true },
  { id: 8, codigoSap: 'GRI001', descricao: 'Grill Antiaderente 1100W', unidade: 'UN', categoria: 'GRILL', estoqueAtual: 38, ativo: true },
  { id: 9, codigoSap: 'CAF001', descricao: 'Cafeteira Elétrica 30 Xícaras', unidade: 'UN', categoria: 'CAFETEIRAS', estoqueAtual: 27, ativo: true },
  { id: 10, codigoSap: 'ACE001', descricao: 'Kit Acessórios Cozinha Premium', unidade: 'UN', categoria: 'ACESSORIOS', estoqueAtual: 95, ativo: true }];
export const priceTableItems = [
  { tabelaPrecoId: 1, produtoId: 1, precoBase: 48, descontoMaxPct: 10 },
  { tabelaPrecoId: 1, produtoId: 2, precoBase: 135, descontoMaxPct: 10 },
  { tabelaPrecoId: 1, produtoId: 3, precoBase: 289.9, descontoMaxPct: 8 },
  { tabelaPrecoId: 1, produtoId: 4, precoBase: 159.9, descontoMaxPct: 10 },
  { tabelaPrecoId: 1, produtoId: 5, precoBase: 499.9, descontoMaxPct: 6 },
  { tabelaPrecoId: 1, produtoId: 6, precoBase: 649.9, descontoMaxPct: 7 },
  { tabelaPrecoId: 1, produtoId: 7, precoBase: 899.9, descontoMaxPct: 5 },
  { tabelaPrecoId: 1, produtoId: 8, precoBase: 219.9, descontoMaxPct: 9 },
  { tabelaPrecoId: 1, produtoId: 9, precoBase: 189.9, descontoMaxPct: 10 },
  { tabelaPrecoId: 1, produtoId: 10, precoBase: 79.9, descontoMaxPct: 12 }];
export const orders = [];
export const integrationLogs = [];




