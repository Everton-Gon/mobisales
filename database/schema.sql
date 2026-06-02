CREATE DATABASE IF NOT EXISTS db_crm
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE db_crm;

SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  login VARCHAR(80) NOT NULL UNIQUE,
  codigo_representante_sap VARCHAR(30) NULL UNIQUE,
  nome VARCHAR(120) NOT NULL,
  email VARCHAR(160) NULL UNIQUE,
  senha_hash VARCHAR(255) NOT NULL,
  perfil ENUM('VENDEDOR', 'GERENTE', 'ADMIN') NOT NULL DEFAULT 'VENDEDOR',
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tabelas_preco (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  vigencia_inicio DATE NOT NULL,
  vigencia_fim DATE NULL,
  ativa TINYINT(1) NOT NULL DEFAULT 1,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS clientes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo_sap VARCHAR(40) NOT NULL UNIQUE,
  razao_social VARCHAR(160) NOT NULL,
  nome_fantasia VARCHAR(160) NULL,
  cnpj VARCHAR(20) NULL,
  endereco VARCHAR(255) NULL,
  cidade VARCHAR(120) NULL,
  uf CHAR(2) NULL,
  telefone VARCHAR(30) NULL,
  vendedor_id INT NULL,
  tabela_preco_id INT NULL,
  limite_credito DECIMAL(12,2) NULL,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  bloqueado TINYINT(1) NOT NULL DEFAULT 0,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_clientes_vendedor FOREIGN KEY (vendedor_id) REFERENCES usuarios(id),
  CONSTRAINT fk_clientes_tabela_preco FOREIGN KEY (tabela_preco_id) REFERENCES tabelas_preco(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS produtos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo_sap VARCHAR(40) NOT NULL UNIQUE,
  descricao VARCHAR(180) NOT NULL,
  unidade VARCHAR(10) NOT NULL DEFAULT 'UN',
  codigo_barras VARCHAR(80) NULL,
  categoria VARCHAR(100) NULL,
  imagem_url VARCHAR(255) NULL,
  estoque_atual DECIMAL(12,3) NOT NULL DEFAULT 0,
  estoque_minimo DECIMAL(12,3) NOT NULL DEFAULT 0,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tabela_preco_itens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tabela_preco_id INT NOT NULL,
  produto_id INT NOT NULL,
  preco_base DECIMAL(12,2) NOT NULL,
  desconto_max_pct DECIMAL(5,2) NOT NULL DEFAULT 0,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_tabela_produto (tabela_preco_id, produto_id),
  CONSTRAINT fk_tpi_tabela FOREIGN KEY (tabela_preco_id) REFERENCES tabelas_preco(id),
  CONSTRAINT fk_tpi_produto FOREIGN KEY (produto_id) REFERENCES produtos(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pedidos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  numero_interno VARCHAR(30) NOT NULL,
  numero_sap VARCHAR(40) NULL,
  cliente_id INT NOT NULL,
  vendedor_id INT NOT NULL,
  codigo_representante_sap VARCHAR(30) NULL,
  tabela_preco_id INT NOT NULL,
  status ENUM('RASCUNHO', 'PENDENTE_TXT', 'TXT_GERADO', 'ENVIADO_SAP', 'IMPORTADO', 'ERRO_SAP', 'CANCELADO') NOT NULL DEFAULT 'RASCUNHO',
  origem ENUM('WEB', 'OFFLINE', 'IMPORTADO') NOT NULL DEFAULT 'WEB',
  condicao_pagamento VARCHAR(80) NULL,
  data_entrega DATE NULL,
  observacao TEXT NULL,
  valor_total DECIMAL(12,2) NOT NULL DEFAULT 0,
  erro_mensagem TEXT NULL,
  enviado_sap_em TIMESTAMP NULL,
  processado_sap_em TIMESTAMP NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_pedidos_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id),
  CONSTRAINT fk_pedidos_vendedor FOREIGN KEY (vendedor_id) REFERENCES usuarios(id),
  CONSTRAINT fk_pedidos_tabela FOREIGN KEY (tabela_preco_id) REFERENCES tabelas_preco(id),
  UNIQUE KEY uk_pedidos_cliente_numero (cliente_id, numero_interno),
  INDEX idx_pedidos_vendedor (vendedor_id),
  INDEX idx_pedidos_status (status),
  INDEX idx_pedidos_data_entrega (data_entrega)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pedido_itens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id INT NOT NULL,
  produto_id INT NOT NULL,
  quantidade DECIMAL(12,3) NOT NULL,
  preco_tabela DECIMAL(12,2) NOT NULL,
  preco_unitario DECIMAL(12,2) NOT NULL,
  desconto_pct DECIMAL(5,2) NOT NULL DEFAULT 0,
  desconto_valor DECIMAL(12,2) NOT NULL DEFAULT 0,
  valor_total DECIMAL(12,2) NOT NULL,
  observacao_item VARCHAR(255) NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_pedido_itens_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
  CONSTRAINT fk_pedido_itens_produto FOREIGN KEY (produto_id) REFERENCES produtos(id),
  INDEX idx_pedido_itens_pedido (pedido_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS integracao_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id INT NULL,
  usuario_id INT NULL,
  direcao ENUM('ENVIO', 'RETORNO') NOT NULL,
  tipo ENUM('PEDIDO_TXT', 'RETORNO_SAP') NOT NULL,
  arquivo_nome VARCHAR(180) NULL,
  caminho_arquivo VARCHAR(255) NULL,
  payload_txt MEDIUMTEXT NULL,
  resposta_sap TEXT NULL,
  numero_sap VARCHAR(40) NULL,
  resultado ENUM('AGUARDANDO', 'SUCESSO', 'ERRO') NOT NULL DEFAULT 'AGUARDANDO',
  status_anterior VARCHAR(40) NULL,
  status_novo VARCHAR(40) NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_integracao_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE SET NULL,
  CONSTRAINT fk_integracao_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX idx_integracao_pedido (pedido_id),
  INDEX idx_integracao_criado_em (criado_em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

