import React, { useState, useEffect, useMemo } from 'react';
import {
  Eye, Pencil, Trash2, FileDown, AlertTriangle, CheckCircle,
  X, AlertCircle, ChevronDown, ChevronUp
} from 'lucide-react';
import { loadBootstrap, generateOrderTxt, updateOrder } from '../services/api.js';
import BadgeStatus from '../components/BadgeStatus.jsx';

const money = (value) => Number(value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Modal simples usado para visualizar, editar e confirmar ações na geração de carga.
function Modal({ title, onClose, children, width = '680px' }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
        display: 'grid', placeItems: 'center', zIndex: 999
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff', borderRadius: '10px', padding: '28px',
          width: `min(95%, ${width})`, boxShadow: '0 20px 50px rgba(0,0,0,0.18)',
          border: '1px solid #dce7e1', maxHeight: '90vh', overflowY: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, color: '#12322d' }}>{title}</h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6a7c76', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ModalVisualizarPedido({ order, data, onClose }) {
  const customers = data?.customers ?? [];
  const users = data?.users ?? [];
  const products = data?.products ?? [];
  const customer = customers.find((c) => Number(c.id) === Number(order.clienteId));
  const seller = users.find((u) => Number(u.id) === Number(order.vendedorId));

  return (
    <Modal title={`Pedido #${order.numeroInterno}`} onClose={onClose} width="780px">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
        {[
          ['Cliente', customer?.razaoSocial ?? '-'],
          ['CNPJ', customer?.cnpj ?? '-'],
          ['Vendedor', seller?.nome ?? '-'],
          ['Status', null],
          ['Data de entrega', order.dataEntrega],
          ['Condição de pgto.', order.condicaoPagamento],
          ['N. SAP', order.numeroSap || '-'],
          ['Valor total', money(order.valorTotal)],
        ].map(([label, val]) => (
          <div key={label} style={{ background: '#f6faf8', borderRadius: '6px', padding: '10px 14px', border: '1px solid #e4ece8' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#6a7c76', textTransform: 'uppercase', marginBottom: '4px' }}>{label}</div>
            {label === 'Status'
              ? <BadgeStatus status={order.status} />
              : <div style={{ fontWeight: '600', color: '#12322d' }}>{val}</div>
            }
          </div>
        ))}
      </div>

      <h4 style={{ color: '#12322d', margin: '0 0 10px' }}>Itens do Pedido</h4>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ minWidth: '500px' }}>
          <thead>
            <tr>
              <th>Produto</th>
              <th style={{ width: '80px' }}>Qtd</th>
              <th style={{ width: '120px' }}>Preço Unit.</th>
              <th style={{ width: '80px' }}>Desc.</th>
              <th style={{ width: '130px' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {(order.itens ?? []).map((item) => {
              const product = products.find((p) => Number(p.id) === Number(item.produtoId));
              return (
                <tr key={item.id ?? item.produtoId}>
                  <td>
                    <strong>{product?.descricao ?? '-'}</strong>
                    <div style={{ fontSize: '11px', color: '#6a7c76' }}>SAP: {product?.codigoSap}</div>
                  </td>
                  <td>{item.quantidade}</td>
                  <td>{money(item.precoUnitario)}</td>
                  <td>{item.descontoPct ?? 0}%</td>
                  <td><strong>{money(item.valorTotal)}</strong></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e4ece8' }}>
        <span style={{ fontSize: '18px', fontWeight: '800', color: '#12322d' }}>Total: {money(order.valorTotal)}</span>
      </div>
    </Modal>
  );
}

function parseOrderMeta(observacao = '') {
  const lines = String(observacao ?? '').split('\n');
  const findValue = (label) => {
    const line = lines.find((entry) => entry.toLowerCase().startsWith(label.toLowerCase()));
    return line ? line.split(':').slice(1).join(':').trim() : '';
  };
  return {
    billingDate: findValue('Data de faturamento'),
    orderType: findValue('Tipo do pedido') || '1-Nac Normal',
    freightType: findValue('Tipo de frete') || 'CIF',
    isBudget: lines.some((entry) => entry.toLowerCase().includes('pedido de orçamento'))
  };
}

function buildOrderObservation({ billingDate, orderType, freightType, isBudget, freeText }) {
  return [
    billingDate ? `Data de faturamento: ${billingDate}` : '',
    orderType ? `Tipo do pedido: ${orderType}` : '',
    freightType ? `Tipo de frete: ${freightType}` : '',
    isBudget ? 'Pedido de orçamento' : '',
    freeText?.trim() ? `Observação: ${freeText.trim()}` : ''
  ].filter(Boolean).join('\n');
}

function ModalEditarPedido({ order, data, onClose, onSaved }) {
  const meta = parseOrderMeta(order.observacao);
  const customers = data?.customers ?? [];
  const products = data?.products ?? [];
  const [numeroInterno, setNumeroInterno] = useState(order.numeroInterno ?? '');
  const [selectedCustomerId, setSelectedCustomerId] = useState(order.clienteId ?? '');
  const [paymentTerm, setPaymentTerm] = useState(order.condicaoPagamento ?? 'À VISTA');
  const [deliveryDate, setDeliveryDate] = useState(order.dataEntrega ?? '');
  const [billingDate, setBillingDate] = useState(meta.billingDate || '');
  const [orderType, setOrderType] = useState(meta.orderType);
  const [freightType, setFreightType] = useState(meta.freightType);
  const [isBudget, setIsBudget] = useState(meta.isBudget);
  const [freeText, setFreeText] = useState(String(order.observacao ?? '').split('\n').find((line) => line.startsWith('Observação:'))?.replace('Observação:', '').trim() ?? '');
  const [itemDrafts, setItemDrafts] = useState(() => (order.itens ?? []).map((item) => ({ ...item })));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const selectedCustomer = customers.find((customer) => Number(customer.id) === Number(selectedCustomerId));
  const editedItems = useMemo(() => {
    return itemDrafts.map((item) => {
      const quantidade = Number(item.quantidade ?? 0);
      const precoUnitario = Number(item.precoUnitario ?? 0);
      const descontoPct = Number(item.descontoPct ?? 0);
      return {
        ...item,
        quantidade,
        precoUnitario,
        descontoPct,
        valorTotal: quantidade * precoUnitario
      };
    });
  }, [itemDrafts]);
  const total = useMemo(() => editedItems.reduce((sum, item) => sum + Number(item.valorTotal ?? 0), 0), [editedItems]);

  const updateItem = (produtoId, field, value) => {
    setItemDrafts((current) => current.map((item) => (
      Number(item.produtoId) === Number(produtoId) ? { ...item, [field]: value } : item
    )));
  };

  async function handleSave() {
    if (!numeroInterno.trim()) {
      setError('Informe o número do pedido.');
      return;
    }
    if ((data?.orders ?? []).some((item) => item.numeroInterno === numeroInterno.trim() && Number(item.id) !== Number(order.id))) {
      setError('Já existe um pedido com esse número.');
      return;
    }
    if (!selectedCustomer) {
      setError('Cliente inválido.');
      return;
    }
    if (!editedItems.some((item) => item.quantidade > 0)) {
      setError('O pedido precisa ter ao menos um item com quantidade maior que zero.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const result = await updateOrder(order.id, {
        numeroInterno: numeroInterno.trim(),
        clienteId: Number(selectedCustomer.id),
        vendedorId: order.vendedorId,
        tabelaPrecoId: selectedCustomer.tabelaPrecoId ?? order.tabelaPrecoId,
        status: order.status,
        condicaoPagamento: paymentTerm,
        dataEntrega: deliveryDate || null,
        observacao: buildOrderObservation({ billingDate, orderType, freightType, isBudget, freeText }),
        valorTotal: total,
        itens: editedItems.map((item) => ({
          produtoId: item.produtoId,
          quantidade: item.quantidade,
          precoTabela: item.precoTabela,
          precoUnitario: item.precoUnitario,
          descontoPct: item.descontoPct ?? 0,
          valorTotal: item.valorTotal
        }))
      });
      onSaved(result.order);
    } catch (err) {
      setError(err.message || 'Erro ao salvar alterações.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Editar Pedido #${order.numeroInterno}`} onClose={onClose} width="920px">
      <div style={{ display: 'grid', gap: '18px' }}>
        <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '14px' }}>
          <label>
            Pedido
            <input value={numeroInterno} onChange={(e) => setNumeroInterno(e.target.value)} />
          </label>
          <label>
            Cliente
            <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)}>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>{customer.razaoSocial}</option>
              ))}
            </select>
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
            Data de faturamento
            <input type="date" value={billingDate} onChange={(e) => setBillingDate(e.target.value)} />
          </label>
          <label>
            Data de entrega
            <input type="date" value={deliveryDate ?? ''} onChange={(e) => setDeliveryDate(e.target.value)} />
          </label>
          <label>
            Tipo do pedido
            <select value={orderType} onChange={(e) => setOrderType(e.target.value)}>
              <option>1-Nac Normal</option>
              <option>2-Manaus Fab</option>
              <option>3-Manaus Imp</option>
              <option>4-VPC</option>
              <option>5-Ped Mostruário</option>
            </select>
          </label>
          <label>
            Tipo de frete
            <select value={freightType} onChange={(e) => setFreightType(e.target.value)}>
              <option>CIF</option>
              <option>FOB</option>
            </select>
          </label>
          <label className="checkbox-field">
            <span>Pedido de Orçamento</span>
            <input type="checkbox" checked={isBudget} onChange={(e) => setIsBudget(e.target.checked)} />
          </label>
        </div>

        <label>
          Observação livre
          <textarea value={freeText} onChange={(e) => setFreeText(e.target.value)} style={{ minHeight: '86px', padding: '10px', resize: 'vertical' }} />
        </label>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ minWidth: '620px' }}>
            <thead>
              <tr>
                <th>Produto</th>
                <th style={{ width: '100px' }}>Qtd</th>
                <th style={{ width: '140px' }}>Preço unit.</th>
                <th style={{ width: '140px' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {editedItems.map((item) => {
                const product = products.find((p) => Number(p.id) === Number(item.produtoId));
                return (
                  <tr key={item.id ?? item.produtoId}>
                    <td>
                      <strong>{product?.descricao ?? '-'}</strong>
                      <div style={{ fontSize: '11px', color: '#6a7c76' }}>SAP: {product?.codigoSap}</div>
                    </td>
                    <td>
                      <input type="number" min="0" value={item.quantidade} onChange={(e) => updateItem(item.produtoId, 'quantidade', e.target.value)} />
                    </td>
                    <td>{money(item.precoUnitario)}</td>
                    <td><strong>{money(item.valorTotal)}</strong></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {error && (
          <div className="alert">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', flexWrap: 'wrap' }}>
          <strong style={{ color: '#12322d', fontSize: '18px' }}>Total: {money(total)}</strong>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="secondary-button" onClick={onClose} disabled={saving}>Cancelar</button>
            <button className="primary-button" onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
function ModalConfirmarExclusao({ order, onClose, onConfirm }) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    await new Promise((r) => setTimeout(r, 400));
    onConfirm(order.id);
    setDeleting(false);
  }

  return (
    <Modal title="Confirmar Exclusao" onClose={onClose} width="420px">
      <div style={{ display: 'grid', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px', background: '#fff3f3', borderRadius: '8px', border: '1px solid #ffc3ca' }}>
          <AlertTriangle size={22} color="#b72035" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontWeight: '700', color: '#7a1226', marginBottom: '4px' }}>Atencao: essa ação não pode ser desfeita</div>
            <div style={{ color: '#9e3344', fontSize: '14px' }}>
              O pedido <strong>#{order.numeroInterno}</strong> será excluído permanentemente do sistema.
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button className="secondary-button" onClick={onClose} disabled={deleting}>Cancelar</button>
          <button
            disabled={deleting}
            onClick={handleDelete}
            style={{
              minHeight: '42px', padding: '0 18px', borderRadius: '8px', border: '1px solid #f4a0aa',
              background: '#df4d5f', color: '#fff', fontWeight: '700', cursor: deleting ? 'not-allowed' : 'pointer',
              opacity: deleting ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '8px'
            }}
          >
            <Trash2 size={15} />
            {deleting ? 'Excluindo...' : 'Excluir pedido'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// Tela de geração de carga TXT. Quando embedded=true, ela aparece dentro do dashboard do representante.
export default function PaginaCarga({ user, isAdmin = false, embedded = false, onDataChanged }) {
  const [data, setData] = useState(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [generating, setGenerating] = useState(null);
  const [viewOrder, setViewOrder] = useState(null);
  const [editOrder, setEditOrder] = useState(null);
  const [deleteOrder, setDeleteOrder] = useState(null);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [deletedIds, setDeletedIds] = useState([]);

  const refreshData = async () => {
    try {
      const d = await loadBootstrap();
      setData(d);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { refreshData(); }, []);

  const orders = data?.orders ?? [];
  const customers = data?.customers ?? [];
  const users = data?.users ?? [];
  const products = data?.products ?? [];

  // Representante enxerga apenas os próprios pedidos pendentes; admin poderia enxergar todos.
  const pendingOrders = useMemo(() => {
    if (!data) return [];
    let filtered = orders.filter(
      (o) => (o.status === 'PENDENTE_TXT' || o.status === 'RASCUNHO') && !deletedIds.includes(o.id)
    );
    if (!isAdmin && user) {
      filtered = filtered.filter((o) => Number(o.vendedorId) === Number(user.id));
    }
    return filtered;
  }, [orders, deletedIds, isAdmin, user]);

  const totalValue = useMemo(() => pendingOrders.reduce((s, o) => s + o.valorTotal, 0), [pendingOrders]);

  const showMessage = (msg, type = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  // Gera um TXT individual e recarrega os dados para refletir o novo status.
  const handleGenerateTxt = async (orderId) => {
    setGenerating(orderId);
    try {
      const result = await generateOrderTxt(orderId);
      if (result.ok) {
        showMessage(`Arquivo gerado com sucesso: ${result.fileName}`);
        await refreshData();
      } else {
        showMessage(`Erro ao gerar TXT: ${result.error}`, 'error');
      }
    } catch (err) {
      showMessage(`Erro: ${err.message}`, 'error');
    } finally {
      setGenerating(null);
    }
  };

  // Gera a carga completa dos pedidos pendentes filtrados para o usuário atual.
  const handleGenerateAll = async () => {
    setGenerating('all');
    let success = 0;
    let fail = 0;
    for (const order of pendingOrders) {
      try {
        const result = await generateOrderTxt(order.id);
        if (result.ok) success++;
        else fail++;
      } catch {
        fail++;
      }
    }
    await refreshData();
    setGenerating(null);
    showMessage(
      `Carga gerada: ${success} arquivo(s) criado(s)${fail > 0 ? `, ${fail} com erro` : ''}.`,
      fail > 0 ? 'error' : 'success'
    );
  };

  const handleEditSaved = (updatedOrder) => {
    setData((prev) => {
      const nextData = {
        ...prev,
        orders: (prev?.orders ?? []).map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
      };
      onDataChanged && onDataChanged(nextData);
      return nextData;
    });
    setEditOrder(null);
    showMessage(`Pedido #${updatedOrder.numeroInterno} atualizado.`);
  };

  const handleDeleteConfirm = (orderId) => {
    setDeletedIds((prev) => [...prev, orderId]);
    setDeleteOrder(null);
    showMessage('Pedido excluido com sucesso.');
  };

  if (!data) return <div className="loading">Carregando dados...</div>;

  return (
    <div>
      {!embedded && (
        <div className="section-heading">
          <div>
            <p>{isAdmin ? 'Painel do Administrador' : 'Visao do Vendedor'}</p>
            <h2>Geracao de Carga</h2>
          </div>
          {pendingOrders.length > 0 && (
            <button
              className="primary-button"
              onClick={handleGenerateAll}
              disabled={generating === 'all'}
              style={{ background: '#1f7ae0' }}
            >
              <FileDown size={16} />
              {generating === 'all' ? 'Gerando...' : `Gerar Carga Completa (${pendingOrders.length})`}
            </button>
          )}
        </div>
      )}

      {embedded && pendingOrders.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '14px' }}>
          <button
            className="primary-button"
            onClick={handleGenerateAll}
            disabled={generating === 'all'}
            style={{ background: '#1f7ae0' }}
          >
            <FileDown size={16} />
            {generating === 'all' ? 'Gerando...' : `Gerar Carga Completa (${pendingOrders.length})`}
          </button>
        </div>
      )}

      {message && (
        <div
          className={messageType === 'success' ? 'notice' : 'alert'}
          style={{ marginBottom: '18px', display: 'flex', justifyContent: 'space-between' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {messageType === 'success'
              ? <CheckCircle size={16} />
              : <AlertCircle size={16} />}
            {message}
          </div>
          <button onClick={() => setMessage('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', color: 'inherit' }}>
            Fechar
          </button>
        </div>
      )}

      <div className="metrics" style={{ gridTemplateColumns: 'repeat(3, minmax(140px, 1fr))', marginBottom: '22px' }}>
        <article className="metric">
          <span>Pedidos Pendentes</span>
          <strong>{pendingOrders.length}</strong>
        </article>
        <article className="metric">
          <span>Valor Total da Carga</span>
          <strong style={{ fontSize: '20px', paddingTop: '4px' }}>{money(totalValue)}</strong>
        </article>
        <article className="metric">
          <span>Total de Itens</span>
          <strong>{pendingOrders.reduce((s, o) => s + (o.itens?.length ?? 0), 0)}</strong>
        </article>
      </div>

      {pendingOrders.length === 0 ? (
        <div className="panel" style={{ textAlign: 'center', padding: '48px 20px' }}>
          <CheckCircle size={40} color="#10a66a" style={{ marginBottom: '14px' }} />
          <h3 style={{ margin: '0 0 8px', color: '#12322d' }}>Nenhum pedido pendente</h3>
          <p style={{ color: '#6a7c76', margin: 0 }}>Todos os pedidos ja foram processados ou estao atualizados.</p>
        </div>
      ) : (
        <div className="panel">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, color: '#12322d' }}>
              Pedidos aguardando geracao de TXT
            </h3>
            <span style={{ fontSize: '13px', color: '#6a7c76', fontWeight: '600' }}>
              Revise antes de gerar a carga
            </span>
          </div>

          <table>
            <thead>
              <tr>
                <th style={{ width: '40px' }}></th>
                <th>No Interno</th>
                <th>Cliente</th>
                <th>Vendedor</th>
                <th>Entrega</th>
                <th>Cond. Pgto.</th>
                <th>Status</th>
                <th>Valor Total</th>
                <th style={{ minWidth: '160px' }}>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {pendingOrders.map((order) => {
                const customer = customers.find((c) => Number(c.id) === Number(order.clienteId));
                const seller = users.find((u) => Number(u.id) === Number(order.vendedorId));
                const isExpanded = expandedOrder === order.id;
                const isGenerating = generating === order.id;

                return (
                  <React.Fragment key={order.id}>
                    <tr>
                      <td>
                        <button
                          className="icon-button"
                          onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                          title={isExpanded ? 'Recolher itens' : 'Expandir itens'}
                          style={{ width: '28px', height: '28px' }}
                        >
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </td>
                      <td><strong>#{order.numeroInterno}</strong></td>
                      <td>
                        <strong style={{ fontSize: '13px' }}>{customer?.razaoSocial ?? '-'}</strong>
                        <div style={{ fontSize: '11px', color: '#6a7c76' }}>{customer?.cnpj}</div>
                      </td>
                      <td style={{ fontSize: '13px' }}>{seller?.nome ?? '-'}</td>
                      <td style={{ fontSize: '13px' }}>{order.dataEntrega}</td>
                      <td style={{ fontSize: '13px' }}>{order.condicaoPagamento}</td>
                      <td><BadgeStatus status={order.status} /></td>
                      <td><strong>{money(order.valorTotal)}</strong></td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          <button
                            className="icon-button"
                            onClick={() => setViewOrder(order)}
                            title="Visualizar pedido"
                            style={{ width: '30px', height: '30px', color: '#1f7ae0', borderColor: '#c5d9f5' }}
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            className="icon-button"
                            onClick={() => setEditOrder(order)}
                            title="Editar pedido"
                            style={{ width: '30px', height: '30px', color: '#c47a00', borderColor: '#f4d58a' }}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            className="icon-button"
                            onClick={() => setDeleteOrder(order)}
                            title="Excluir pedido"
                            style={{ width: '30px', height: '30px', color: '#b72035', borderColor: '#f4a0aa' }}
                          >
                            <Trash2 size={14} />
                          </button>
                          <button
                            className="small-button"
                            onClick={() => handleGenerateTxt(order.id)}
                            disabled={isGenerating || generating === 'all'}
                            style={{ fontSize: '12px', height: '30px', padding: '0 10px', color: '#087447', borderColor: '#b8eccf' }}
                          >
                            <FileDown size={13} />
                            {isGenerating ? 'Gerando...' : 'Gerar Carga'}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr>
                        <td colSpan={9} style={{ padding: '0 12px 16px 52px', background: '#f6faf8' }}>
                          <div style={{ borderLeft: '3px solid #10a66a', paddingLeft: '16px', paddingTop: '12px' }}>
                            <div style={{ fontSize: '12px', fontWeight: '700', color: '#6a7c76', textTransform: 'uppercase', marginBottom: '8px' }}>
                              Itens do Pedido
                            </div>
                            <table style={{ minWidth: '400px' }}>
                              <thead>
                                <tr>
                                  <th style={{ background: '#edf5f1' }}>Produto</th>
                                  <th style={{ background: '#edf5f1', width: '70px' }}>Qtd</th>
                                  <th style={{ background: '#edf5f1', width: '110px' }}>Preco Unit.</th>
                                  <th style={{ background: '#edf5f1', width: '70px' }}>Desc.</th>
                                  <th style={{ background: '#edf5f1', width: '120px' }}>Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(order.itens ?? []).map((item) => {
                                  const product = products.find((p) => Number(p.id) === Number(item.produtoId));
                                  return (
                                    <tr key={item.id ?? item.produtoId}>
                                      <td>
                                        <strong style={{ fontSize: '13px' }}>{product?.descricao ?? '-'}</strong>
                                        <div style={{ fontSize: '11px', color: '#6a7c76' }}>SAP: {product?.codigoSap}</div>
                                      </td>
                                      <td style={{ fontSize: '13px' }}>{item.quantidade}</td>
                                      <td style={{ fontSize: '13px' }}>{money(item.precoUnitario)}</td>
                                      <td style={{ fontSize: '13px' }}>{item.descontoPct ?? 0}%</td>
                                      <td style={{ fontSize: '13px' }}><strong>{money(item.valorTotal)}</strong></td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {viewOrder && (
        <ModalVisualizarPedido order={viewOrder} data={data} onClose={() => setViewOrder(null)} />
      )}
      {editOrder && (
        <ModalEditarPedido order={editOrder} data={data} onClose={() => setEditOrder(null)} onSaved={handleEditSaved} />
      )}
      {deleteOrder && (
        <ModalConfirmarExclusao order={deleteOrder} onClose={() => setDeleteOrder(null)} onConfirm={handleDeleteConfirm} />
      )}
    </div>
  );
}




