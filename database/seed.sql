USE db_crm;

INSERT INTO usuarios (id, login, codigo_representante_sap, nome, email, senha_hash, perfil, ativo)
VALUES
  (1, 'b91_everton', 'B91/Q09', 'Everton Gonçalves', 'everton@empresa.com.br', '123456', 'VENDEDOR', 1),
  (2, 'admin', NULL, 'Maria Admin', 'admin@empresa.com.br', 'admin123', 'ADMIN', 1)
ON DUPLICATE KEY UPDATE
  codigo_representante_sap = VALUES(codigo_representante_sap),
  nome = VALUES(nome),
  email = VALUES(email),
  senha_hash = VALUES(senha_hash),
  perfil = VALUES(perfil),
  ativo = VALUES(ativo);

INSERT INTO tabelas_preco (id, nome, vigencia_inicio, vigencia_fim, ativa)
VALUES (1, 'Tabela Sul', '2026-01-01', '2026-12-31', 1)
ON DUPLICATE KEY UPDATE
  nome = VALUES(nome),
  vigencia_inicio = VALUES(vigencia_inicio),
  vigencia_fim = VALUES(vigencia_fim),
  ativa = VALUES(ativa);

INSERT INTO clientes (id, codigo_sap, razao_social, nome_fantasia, cnpj, cidade, uf, vendedor_id, tabela_preco_id, ativo, bloqueado)
VALUES
  (1, 'C0001', 'Distribuidora ABC Ltda', 'Distribuidora ABC', '12.345.678/0001-90', 'Curitiba', 'PR', 1, 1, 1, 0),
  (2, 'C0002', 'Comercial XYZ Ltda', 'Comercial XYZ', '98.765.432/0001-10', 'São Paulo', 'SP', 1, 1, 1, 0)
ON DUPLICATE KEY UPDATE
  razao_social = VALUES(razao_social),
  nome_fantasia = VALUES(nome_fantasia),
  cnpj = VALUES(cnpj),
  cidade = VALUES(cidade),
  uf = VALUES(uf),
  vendedor_id = VALUES(vendedor_id),
  tabela_preco_id = VALUES(tabela_preco_id),
  ativo = VALUES(ativo),
  bloqueado = VALUES(bloqueado);

INSERT INTO produtos (id, codigo_sap, descricao, unidade, categoria, estoque_atual, estoque_minimo, ativo)
VALUES
  (1, 'SKU001', 'Produto A', 'UN', 'ACESSORIOS', 120, 10, 1),
  (2, 'SKU002', 'Produto B', 'UN', 'CAFETEIRAS', 80, 5, 1),
  (3, 'LIQ001', 'Liquidificador Turbo 1200W 220V', 'UN', 'LIQUIDIFICADOR', 42, 6, 1),
  (4, 'LIQ002', 'Liquidificador Compact 700W 127V', 'UN', 'LIQUIDIFICADOR', 65, 8, 1),
  (5, 'LIQ003', 'Liquidificador Industrial 2L Inox', 'UN', 'LIQUIDIFICADOR', 18, 3, 1),
  (6, 'FOR001', 'Forno Elétrico 45L 220V', 'UN', 'FORNOS', 24, 4, 1),
  (7, 'FOG001', 'Fogão 4 Bocas Mesa Inox', 'UN', 'FOGOES', 31, 5, 1),
  (8, 'GRI001', 'Grill Antiaderente 1100W', 'UN', 'GRILL', 38, 6, 1),
  (9, 'CAF001', 'Cafeteira Elétrica 30 Xícaras', 'UN', 'CAFETEIRAS', 27, 4, 1),
  (10, 'ACE001', 'Kit Acessórios Cozinha Premium', 'UN', 'ACESSORIOS', 95, 12, 1)
ON DUPLICATE KEY UPDATE
  descricao = VALUES(descricao),
  unidade = VALUES(unidade),
  categoria = VALUES(categoria),
  estoque_atual = VALUES(estoque_atual),
  estoque_minimo = VALUES(estoque_minimo),
  ativo = VALUES(ativo);
INSERT INTO tabela_preco_itens (tabela_preco_id, produto_id, preco_base, desconto_max_pct)
VALUES
  (1, 1, 48.00, 10.00),
  (1, 2, 135.00, 10.00),
  (1, 3, 289.90, 8.00),
  (1, 4, 159.90, 10.00),
  (1, 5, 499.90, 6.00),
  (1, 6, 649.90, 7.00),
  (1, 7, 899.90, 5.00),
  (1, 8, 219.90, 9.00),
  (1, 9, 189.90, 10.00),
  (1, 10, 79.90, 12.00)
ON DUPLICATE KEY UPDATE
  preco_base = VALUES(preco_base),
  desconto_max_pct = VALUES(desconto_max_pct);


