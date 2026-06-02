import React, { useState, useMemo } from 'react';
import { AlertCircle } from 'lucide-react';
import { createOrder, loadBootstrap } from '../services/api.js';

const money = (value) => Number(value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const todayIso = () => new Date().toISOString().split('T')[0];
const formatDateTime = (date) => date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const SPECIAL_PRODUCT_GROUPS = [
  '<Itens Negociados>'
];
const DEFAULT_PRODUCT_FAMILIES = [
  'ACESSORIOS',
  'ADEGAS DE VINHO',
  'AQUECEDORES',
  'ARROZEIRAS',
  'ASPIRADORES',
  'BALANCAS',
  'BARBEADORES',
  'BATEDEIRAS',
  'BEBEDOUROS',
  'CAFETEIRAS',
  'CAPSULAS DE CAFÉ',
  'CENTROS DE PASSAR',
  'CLIMATIZ. / PURIF.AR',
  'COIFAS',
  'CORTADORES DE CABELO',
  'CUIDADO PESSOAL',
  'DEPILADORES',
  'ELETRONICA',
  'ELETRONICA 1',
  'ELETRONICA 2',
  'ESCOVAS DE DENTES',
  'ESPREMEDORES',
  'FERRAMENTAS',
  'FOGOES',
  'FORNOS',
  'FRITADEIRAS',
  'GRILL',
  'HIGIENIZADOR',
  'LIQUIDIFICADOR',
];

export default function FormPedido({ data, user, onCreated, onCancel }) {
  // Obter clientes vinculados a este vendedor (comparação segura de tipo)
  const sellerCustomers = useMemo(() => {
    if (!data || !data.customers || !user) return [];
    return data.customers.filter((c) => Number(c.vendedorId) === Number(user.id) && c.ativo);
  }, [data?.customers, user?.id]);

  const [orderNumber, setOrderNumber] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState(sellerCustomers[0]?.id ?? '');
  const [paymentTerm, setPaymentTerm] = useState('À VISTA');
  const [billingDate, setBillingDate] = useState(todayIso());
  const [orderType, setOrderType] = useState('1-Nac Normal');
  const [freightType, setFreightType] = useState('CIF');
  const [isBudget, setIsBudget] = useState(false);
  const [selectedProductGroup, setSelectedProductGroup] = useState('');
  const [productCodeSearch, setProductCodeSearch] = useState('');

  // Data de entrega padrão para 15 dias a partir de hoje
  const defaultDeliveryDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 15);
    return date.toISOString().split('T')[0];
  }, []);
  const [deliveryDate, setDeliveryDate] = useState(defaultDeliveryDate);


  // Cliente selecionado e tabela de preços associada
  const customer = useMemo(() => {
    return sellerCustomers.find((c) => Number(c.id) === Number(selectedCustomerId)) || sellerCustomers[0];
  }, [sellerCustomers, selectedCustomerId]);

  const priceTable = useMemo(() => {
    if (!customer || !data || !data.priceTables) return null;
    return data.priceTables.find((t) => Number(t.id) === Number(customer.tabelaPrecoId) && t.ativa);
  }, [data?.priceTables, customer]);

  const priceTableItems = useMemo(() => {
    if (!customer || !data || !data.priceTableItems) return [];
    return data.priceTableItems.filter((item) => Number(item.tabelaPrecoId) === Number(customer.tabelaPrecoId));
  }, [data?.priceTableItems, customer]);

  // Estados de quantidades e descontos: mapeando ID do produto -> valor
  const [quantities, setQuantities] = useState({});
  const [discounts, setDiscounts] = useState({});
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const productGroupOptions = useMemo(() => {
    const categories = (data?.products ?? [])
      .map((product) => product.categoria)
      .filter(Boolean);
    return [...new Set([...SPECIAL_PRODUCT_GROUPS, ...categories, ...DEFAULT_PRODUCT_FAMILIES])];
  }, [data?.products]);

  // Filtrar produtos ativos que possuem preço na tabela deste cliente e respeitam a família selecionada.
  const activeProducts = useMemo(() => {
    if (!data || !data.products) return [];
    if (!selectedProductGroup) return [];
    return data.products.filter((p) => {
      const hasPrice = p.ativo && priceTableItems.some((item) => Number(item.produtoId) === Number(p.id));
      const groupIsSpecial = SPECIAL_PRODUCT_GROUPS.includes(selectedProductGroup);
      const matchesGroup = groupIsSpecial || String(p.categoria ?? '').toUpperCase() === selectedProductGroup.toUpperCase();
      const matchesCode = productCodeSearch.trim() === '' || String(p.codigoSap ?? '').toLowerCase().includes(productCodeSearch.trim().toLowerCase());
      return hasPrice && matchesGroup && matchesCode;
    });
  }, [data?.products, priceTableItems, selectedProductGroup, productCodeSearch]);

  // Detalhes computados de cada item
  const computedItems = useMemo(() => {
    return activeProducts.map((product) => {
      const pItem = priceTableItems.find((item) => Number(item.produtoId) === Number(product.id));
      const priceBase = pItem ? pItem.precoBase : 0;
      const maxDisc = pItem ? pItem.descontoMaxPct : 0;

      const quantity = Number(quantities[product.id] ?? 0);
      const discountPct = Number(discounts[product.id] ?? 0);

      const unitPrice = priceBase * (1 - discountPct / 100);
      const itemTotal = quantity * unitPrice;
      const isInvalidDiscount = discountPct > maxDisc;

      return {
        produtoId: product.id,
        descricao: product.descricao,
        codigoSap: product.codigoSap,
        quantidade: quantity,
        precoTabela: priceBase,
        precoUnitario: unitPrice,
        // descontoPct: discountPct,
        // descontoMaxPct: maxDisc,
        valorTotal: itemTotal,
        isInvalidDiscount
      };
    });
  }, [activeProducts, priceTableItems, quantities, discounts]);

  // Cálculos consolidados do pedido
  const total = useMemo(() => {
    return computedItems.reduce((sum, item) => sum + item.valorTotal, 0);
  }, [computedItems]);

  const hasItems = useMemo(() => {
    return computedItems.some((item) => item.quantidade > 0);
  }, [computedItems]);

  const invalidDiscounts = useMemo(() => {
    return computedItems.filter((item) => item.quantidade > 0 && item.isInvalidDiscount);
  }, [computedItems]);

  const hasInvalidDiscounts = invalidDiscounts.length > 0;

  const handleQuantityChange = (productId, val) => {
    const num = Math.max(0, parseInt(val) || 0);
    setQuantities((prev) => ({ ...prev, [productId]: num }));
  };

  const handleDiscountChange = (productId, val) => {
    const num = Math.max(0, Math.min(100, parseFloat(val) || 0));
    setDiscounts((prev) => ({ ...prev, [productId]: num }));
  };

  async function handleSave() {
    if (!orderNumber.trim()) {
      setError('Informe o número do pedido');
      return;
    }
    if (data.orders.some((order) => order.numeroInterno === orderNumber.trim())) {
      setError('Já existe um pedido com esse número');
      return;
    }
    if (!customer) {
      setError('Cliente inválido');
      return;
    }
    if (!hasItems) {
      setError('Adicione pelo menos um produto com quantidade maior que zero');
      return;
    }
    if (hasInvalidDiscounts) {
      setError('Existe desconto acima do máximo permitido');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const orderItems = computedItems
        .filter((item) => item.quantidade > 0)
        .map((item) => ({
          produtoId: item.produtoId,
          quantidade: item.quantidade,
          precoTabela: item.precoTabela,
          precoUnitario: item.precoUnitario,
          // descontoPct: item.descontoPct,
          valorTotal: item.valorTotal
        }));

      await createOrder({
        numeroInterno: orderNumber.trim(),
        clienteId: customer.id,
        vendedorId: user.id,
        tabelaPrecoId: customer.tabelaPrecoId,
        condicaoPagamento: paymentTerm,
        dataEntrega: deliveryDate,
        observacao: [
          `Data de faturamento: ${billingDate}`,
          `Tipo do pedido: ${orderType}`,
          `Tipo de frete: ${freightType}`,
          isBudget ? 'Pedido de orçamento' : ''
        ].filter(Boolean).join('\n'),
        valorTotal: total,
        itens: orderItems
      });

      const freshData = await loadBootstrap();
      onCreated(freshData);
    } catch (err) {
      setError(err.message || 'Erro ao criar pedido');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!customer) {
    return (
      <div className="panel">
        <p>Não há clientes cadastrados ou vinculados para este vendedor.</p>
        <button className="secondary-button" onClick={onCancel} style={{ marginTop: '10px' }}>
          Voltar
        </button>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <label>
          Pedido
          <input value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} placeholder="Informe o número do pedido..." />
        </label>
        <label>
          Data do Pedido
          <input value={formatDateTime(new Date())} readOnly style={{ background: '#f5f7f6', cursor: 'default' }} />
        </label>
        <label>
          Condição de pagamento
          <select value={paymentTerm} onChange={(e) => setPaymentTerm(e.target.value)}>
            <option>À VISTA</option>
            <option>30/60/90 dias</option>
            <option>BOLETO 14 dias</option>
            <option>BOLETO 28 dias</option>
            <option>PIX</option>
          </select>
        </label>
        <label>
          Data de Faturamento
          <input type="date" value={billingDate} onChange={(e) => setBillingDate(e.target.value)} />
        </label>
        {/* <label>
          Data de entrega
          <input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
        </label> */}
        <label>
          Vendedor
          <input value={`${user.codigoRepresentanteSap ?? ''} - ${user.nome}`} readOnly style={{ background: '#f5f7f6', cursor: 'default' }} />
        </label>
        <label>
          Tipo do Pedido
          <select value={orderType} onChange={(e) => setOrderType(e.target.value)}>
            <option>1-Nac Normal</option>
            <option>2-Manaus Fab</option>
            <option>3-Manaus Imp</option>
            <option>4-VPC</option>
            <option>5-Ped Mostruário</option>
          </select>
        </label>
        <label>
          Tipo de Frete
          <select value={freightType} onChange={(e) => setFreightType(e.target.value)}>
            <option>CIF</option>
            <option>FOB</option>
          </select>
        </label>
        <label>
          Cliente
          <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)}>
            {sellerCustomers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.razaoSocial} - {c.cnpj}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tabela de Preço
          <input value={priceTable ? `${priceTable.nome} - vigente até ${priceTable.vigenciaFim}` : 'Tabela de preços inválida'} readOnly style={{ background: '#f5f7f6', cursor: 'default' }} />
        </label>
        <label className="checkbox-field">
          <span>Pedido de Orçamento</span>
          <input type="checkbox" checked={isBudget} onChange={(e) => setIsBudget(e.target.checked)} />
        </label>
      </div>

      <div className="panel-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '24px 0 12px' }}>
        <h3>Itens do pedido</h3>
      </div>

      <div className="product-filter-bar">
        <label>
          Grupo
          <select value={selectedProductGroup} onChange={(e) => setSelectedProductGroup(e.target.value)}>
            <option value="">Selecione um grupo...</option>
            {productGroupOptions.map((group) => (
              <option key={group} value={group}>{group}</option>
            ))}
          </select>
        </label>
        <button type="button" className="small-button" title="Aplicar grupo selecionado">&gt;&gt;</button>
        <label className="product-code-search">
          Código
          <input
            value={productCodeSearch}
            onChange={(e) => setProductCodeSearch(e.target.value)}
            placeholder="Buscar código SAP..."
          />
        </label>
      </div>

      <table>
        <thead>
          <tr>
            <th>Produto</th>
            <th style={{ width: '100px' }}>Qtd</th>
            <th style={{ width: '140px' }}>Preço tabela</th>
            {/* <th style={{ width: '120px' }}>Desc. (%)</th> */}
            <th style={{ width: '140px' }}>Preço unit.</th>
            <th style={{ width: '140px' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {computedItems.length === 0 && (
            <tr>
              <td colSpan={5} style={{ color: '#667872' }}>
                {selectedProductGroup ? 'Nenhum produto encontrado para o grupo selecionado.' : 'Selecione um grupo para listar os produtos.'}
              </td>
            </tr>
          )}
          {computedItems.map((item) => (
            <tr key={item.produtoId}>
              <td>
                <strong>{item.descricao}</strong>
                <div style={{ fontSize: '12px', color: '#667872' }}>SAP: {item.codigoSap}</div>
              </td>
              <td>
                <input
                  type="number"
                  min="0"
                  value={quantities[item.produtoId] ?? ''}
                  onChange={(e) => handleQuantityChange(item.produtoId, e.target.value)}
                  placeholder="0"
                  style={{ minHeight: '34px', padding: '0 8px' }}
                />
              </td>
              <td>{money(item.precoTabela)}</td>
              {/* <td>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={discounts[item.produtoId] ?? ''}
                  onChange={(e) => handleDiscountChange(item.produtoId, e.target.value)}
                  placeholder="0%"
                  style={{
                    minHeight: '34px',
                    padding: '0 8px',
                    borderColor: item.isInvalidDiscount && item.quantidade > 0 ? '#ffc3ca' : ''
                  }}
                />
                <div style={{ fontSize: '11px', color: item.isInvalidDiscount && item.quantidade > 0 ? '#9e1d2e' : '#667872', marginTop: '2px' }}>
                  Máx: {item.descontoMaxPct}%
                </div>
              </td> */}
              <td>{money(item.precoUnitario)}</td>
              <td>{money(item.valorTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {error && (
        <div className="alert">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="order-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px' }}>
        <button className="secondary-button" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </button>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          <strong style={{ fontSize: '18px', color: '#12322d' }}>Subtotal: {money(total)}</strong>
          <button
            className="primary-button"
            disabled={hasInvalidDiscounts || !hasItems || isSubmitting}
            onClick={handleSave}
          >
            {isSubmitting ? 'Salvando...' : 'Confirmar pedido'}
          </button>
        </div>
      </div>
    </div>
  );
}







