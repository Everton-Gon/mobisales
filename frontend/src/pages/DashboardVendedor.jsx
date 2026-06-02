import React, { useState, useEffect, useMemo } from 'react';
import { Users, Package, Plus, ClipboardList, Search, TrendingUp, AlertTriangle, FileDown, Download, Printer, PieChart, Menu } from 'lucide-react';
import { loadBootstrap } from '../services/api.js';
import MenuLateral from '../components/MenuLateral.jsx';
import BadgeStatus from '../components/BadgeStatus.jsx';
import FormPedido from './FormPedido.jsx';
import PaginaCarga from './PaginaCarga.jsx';

const money = (value) => Number(value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Tela principal do representante: concentra indicadores, pedidos, clientes, produtos, relatórios e carga TXT.
export default function DashboardVendedor({ user }) {
  const [data, setData] = useState(null);
  const [view, setView] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedPriceTableId, setSelectedPriceTableId] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Recarrega dados do backend para manter dashboard, pedidos e relatórios sincronizados com o banco.
  const refreshData = async () => {
    try {
      const bootstrapData = await loadBootstrap();
      setData(bootstrapData);
      if (bootstrapData.priceTables && bootstrapData.priceTables.length > 0) {
        setSelectedPriceTableId(bootstrapData.priceTables[0].id.toString());
      }
    } catch (err) {
      console.error('Erro ao buscar dados:', err);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  useEffect(() => {
    if (view === 'orders' || view === 'carga' || view === 'dashboard') {
      refreshData();
    }
  }, [view]);

  // A visão do representante sempre filtra pedidos pelo usuário logado.
  const sellerOrders = useMemo(() => {
    if (!data) return [];
    return data.orders.filter((order) => Number(order.vendedorId) === Number(user.id));
  }, [data, user.id]);

  const sellerCustomers = useMemo(() => {
    if (!data) return [];
    return data.customers.filter((c) => Number(c.vendedorId) === Number(user.id));
  }, [data, user.id]);

  // Pedidos pendentes de gerar TXT (alerta de carga)
  const pendingTxtOrders = useMemo(() => {
    return sellerOrders.filter((o) => o.status === 'PENDENTE_TXT' || o.status === 'RASCUNHO');
  }, [sellerOrders]);

  const totalRevenue = useMemo(() => sellerOrders.reduce((s, o) => s + o.valorTotal, 0), [sellerOrders]);
  const importedOrders = useMemo(() => sellerOrders.filter((o) => o.status === 'IMPORTADO'), [sellerOrders]);
  const errorOrders = useMemo(() => sellerOrders.filter((o) => o.status === 'ERRO_SAP'), [sellerOrders]);

  const filteredOrders = useMemo(() => {
    if (!data) return [];
    return sellerOrders.filter((order) => {
      const customer = data.customers.find((c) => Number(c.id) === Number(order.clienteId));
      const matchesSearch =
        order.numeroInterno.includes(searchQuery) ||
        (order.numeroSap && order.numeroSap.includes(searchQuery)) ||
        (customer && customer.razaoSocial.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = statusFilter === '' || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [sellerOrders, data, searchQuery, statusFilter]);

  const pendingCargaCount = useMemo(() => {
    return sellerOrders.filter((o) => o.status === 'PENDENTE_TXT' || o.status === 'RASCUNHO').length;
  }, [sellerOrders]);

  const monthLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  // Série usada no gráfico de vendas por mês no dashboard e nos relatórios.
  const monthlySales = useMemo(() => {
    const values = Array(12).fill(0);
    sellerOrders.forEach((order) => {
      const date = new Date(order.dataEntrega);
      if (!Number.isNaN(date.getTime())) values[date.getMonth()] += Number(order.valorTotal ?? 0);
    });
    return values;
  }, [sellerOrders]);

  const chartMax = useMemo(() => Math.max(...monthlySales, 1) * 1.15, [monthlySales]);

  const salesLinePoints = useMemo(() => {
    const width = 720;
    const height = 230;
    return monthlySales.map((value, index) => {
      const x = (index / (monthLabels.length - 1)) * width;
      const y = height - (value / chartMax) * height;
      return `${x},${y}`;
    }).join(' ');
  }, [monthlySales, chartMax]);

  const statusSegments = useMemo(() => {
    const palette = {
      PENDENTE_TXT: '#e0931fff',
      TXT_GERADO: '#10a66a',
      ENVIADO_SAP: '#2a88f4ff',
      IMPORTADO: '#087447',
      ERRO_SAP: '#df4d5f',
      RASCUNHO: '#94a3b8'
    };
    const labels = {
      PENDENTE_TXT: 'Pendente',
      TXT_GERADO: 'TXT gerado',
      ENVIADO_SAP: 'Enviado SAP',
      IMPORTADO: 'Importado',
      ERRO_SAP: 'Erro SAP',
      RASCUNHO: 'Rascunho'
    };
    const grouped = sellerOrders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] ?? 0) + 1;
      return acc;
    }, {});
    const segments = Object.entries(grouped).map(([status, value]) => ({
      label: labels[status] ?? status,
      value,
      color: palette[status] ?? '#64748b'
    }));
    return segments.length > 0 ? segments : [{ label: 'Sem pedidos', value: 1, color: '#cbd5e1' }];
  }, [sellerOrders]);

  const statusPieGradient = useMemo(() => {
    const total = statusSegments.reduce((sum, item) => sum + item.value, 0) || 1;
    let current = 0;
    return statusSegments.map((item) => {
      const start = (current / total) * 100;
      current += item.value;
      const end = (current / total) * 100;
      return `${item.color} ${start}% ${end}%`;
    }).join(', ');
  }, [statusSegments]);

  // Downloads locais dos relatórios do representante, sem depender de tela admin.
  const triggerDownload = (content, fileName, contentType) => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const toCsv = (rows) => {
    if (!rows.length) return '';
    const headers = Object.keys(rows[0]);
    const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    return `${headers.join(';')}\n${rows.map((row) => headers.map((h) => escape(row[h])).join(';')).join('\n')}`;
  };

  const downloadMyOrdersCsv = () => {
    const rows = sellerOrders.map((order) => {
      const customer = data.customers.find((c) => Number(c.id) === Number(order.clienteId));
      return {
        numeroInterno: order.numeroInterno,
        numeroSap: order.numeroSap ?? '',
        cliente: customer?.razaoSocial ?? '',
        cnpj: customer?.cnpj ?? '',
        status: order.status,
        dataEntrega: order.dataEntrega,
        condicaoPagamento: order.condicaoPagamento,
        valorTotal: Number(order.valorTotal ?? 0).toFixed(2)
      };
    });
    triggerDownload(toCsv(rows), `meus-pedidos-${user.login}.csv`, 'text/csv;charset=utf-8;');
  };

  const downloadMyCustomersCsv = () => {
    const rows = sellerCustomers.map((customer) => ({
      codigoSap: customer.codigoSap,
      razaoSocial: customer.razaoSocial,
      cnpj: customer.cnpj,
      cidade: customer.cidade,
      uf: customer.uf,
      status: customer.ativo ? 'Ativo' : 'Inativo'
    }));
    triggerDownload(toCsv(rows), `meus-clientes-${user.login}.csv`, 'text/csv;charset=utf-8;');
  };

  const downloadMySummaryJson = () => {
    const summary = {
      representante: user.nome,
      login: user.login,
      geradoEm: new Date().toISOString(),
      totalPedidos: sellerOrders.length,
      faturamentoTotal: totalRevenue,
      pedidosImportados: importedOrders.length,
      pedidosComErro: errorOrders.length,
      clientesAtendidos: sellerCustomers.length
    };
    triggerDownload(JSON.stringify(summary, null, 2), `resumo-${user.login}.json`, 'application/json;charset=utf-8;');
  };

  if (!data) return <div className="loading">Carregando dados...</div>;

  const sidebarItems = [
    { key: 'dashboard', label: 'Dashboard', icon: TrendingUp },
    { key: 'customers', label: 'Clientes', icon: Users },
    { key: 'products', label: 'Produtos', icon: Package },
    { key: 'new', label: 'Novo pedido', icon: Plus },
    { key: 'orders', label: 'Meus pedidos', icon: ClipboardList },
    { key: 'reports', label: 'Relatórios', icon: PieChart },
    { key: 'carga', label: `Gerar Carga${pendingCargaCount > 0 ? ` (${pendingCargaCount})` : ''}`, icon: FileDown }
  ];

  const headingMap = {
    dashboard: 'Meu Painel',
    customers: 'Clientes',
    products: 'Produtos',
    new: 'Novo pedido',
    orders: 'Meus pedidos',
    reports: 'Relatórios',
    carga: 'Geração de Carga'
  };

  return (
    <>
      <button className="mobile-menu-button" onClick={() => setMobileSidebarOpen(true)} title="Abrir menu" type="button">
        <Menu size={22} />
      </button>
      {mobileSidebarOpen && <button className="mobile-sidebar-backdrop" onClick={() => setMobileSidebarOpen(false)} aria-label="Fechar menu" type="button" />}
      <div className={sidebarCollapsed ? "layout layout-sidebar-collapsed" : "layout"}>
        <MenuLateral active={view} items={sidebarItems} onViewChange={setView} collapsed={sidebarCollapsed} onToggleCollapsed={() => setSidebarCollapsed((current) => !current)} mobileOpen={mobileSidebarOpen} onCloseMobile={() => setMobileSidebarOpen(false)} />

      <section className="content">
        <div className="section-heading">
          <div>
            <p>Visão do Representante</p>
            <h2>{headingMap[view]}</h2>
          </div>
          {view !== 'new' && view !== 'carga' && (
            <button className="primary-button" onClick={() => setView('new')}>
              <Plus size={16} />
              Novo pedido
            </button>
          )}
        </div>

        {/* Alerta de pedidos aguardando geração de carga */}
        {pendingTxtOrders.length > 0 && view !== 'new' && view !== 'carga' && (
          <div
            style={{
              marginBottom: '20px',
              padding: '14px 18px',
              background: '#fff8e6',
              border: '1px solid #f4c86a',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertTriangle size={18} color="#c47a00" />
              <span style={{ fontWeight: '700', color: '#7a4e00' }}>
                {pendingTxtOrders.length} pedido{pendingTxtOrders.length > 1 ? 's' : ''} aguardando geração de carga
              </span>
            </div>
            <button
              className="small-button"
              style={{ color: '#c47a00', borderColor: '#f4c86a', background: '#fff3cc' }}
              onClick={() => setView('carga')}
            >
              Ver pedidos pendentes
            </button>
          </div>
        )}

        {/* Dashboard */}
        {view === 'dashboard' && (
          <>
            <div className="metrics">
              {/* <article className="metric">
                <span>Faturamento Total</span>
                <strong style={{ fontSize: '22px' }}>{money(totalRevenue)}</strong>
              </article> */}
              <article className="metric">
                <span>Total de Pedidos</span>
                <strong>{sellerOrders.length}</strong>
              </article>
              <article className="metric">
                <span>Pedidos Importados</span>
                <strong>{importedOrders.length}</strong>
              </article>
              {/* <article className="metric">
                <span>Erros SAP</span>
                <strong>{errorOrders.length}</strong>
              </article> */}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(360px, 2fr) minmax(260px, 1fr)', gap: '20px', marginBottom: '20px' }}>
              <div className="panel">
                <div className="panel-title">
                  <div>
                    <h3>Vendas por mês</h3>
                    <p style={{ margin: '4px 0 0', color: '#6a7c76', fontSize: '13px' }}>Evolução dos seus pedidos por data de entrega</p>
                  </div>
                </div>
                <div style={{ width: '100%', overflowX: 'auto' }}>
                  <svg viewBox="0 0 740 280" width="100%" height="280" role="img" aria-label="Gráfico de vendas mensais do representante">
                    {[0, 1, 2, 3].map((n) => {
                      const y = 24 + n * 58;
                      return <line key={n} x1="0" y1={y} x2="720" y2={y} stroke="#e6ecea" strokeWidth="1" />;
                    })}
                    <polyline fill="none" stroke="#1f7ae0" strokeWidth="4" points={salesLinePoints} transform="translate(0,24)" />
                    {monthlySales.map((value, index) => {
                      const x = (index / (monthLabels.length - 1)) * 720;
                      const y = 24 + (230 - (value / chartMax) * 230);
                      return <circle key={monthLabels[index]} cx={x} cy={y} r="4" fill="#10a66a" />;
                    })}
                    {monthLabels.map((month, index) => (
                      <text key={month} x={(index / (monthLabels.length - 1)) * 720} y="272" fontSize="11" fill="#6a7c76" textAnchor="middle">{month}</text>
                    ))}
                  </svg>
                </div>
              </div>

              <div className="panel">
                <h3>Status dos pedidos</h3>
                <p style={{ margin: '4px 0 0', color: '#6a7c76', fontSize: '13px' }}>Distribuição da sua carteira</p>
                <div style={{ display: 'grid', placeItems: 'center', padding: '18px 0' }}>
                  <div style={{ width: '170px', height: '170px', borderRadius: '999px', background: `conic-gradient(${statusPieGradient})`, position: 'relative' }}>
                    <div style={{ position: 'absolute', inset: '26px', borderRadius: '999px', background: '#fff' }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {statusSegments.map((segment) => (
                    <div key={segment.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '999px', background: segment.color }} />
                        {segment.label}
                      </span>
                      <strong>{segment.value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
              {/* Últimos pedidos */}
              <div className="panel">
                <div className="panel-title">
                  <h3>Últimos Pedidos</h3>
                  <button className="small-button" onClick={() => setView('orders')}>Ver todos</button>
                </div>
                {sellerOrders.length === 0 ? (
                  <p style={{ color: '#6a7c76', marginTop: '12px' }}>Nenhum pedido ainda.</p>
                ) : (
                  <table style={{ minWidth: 'unset' }}>
                    <thead>
                      <tr>
                        <th>Nº</th>
                        <th>Cliente</th>
                        <th>Status</th>
                        <th>Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sellerOrders.slice(-5).reverse().map((order) => {
                        const customer = data.customers.find((c) => Number(c.id) === Number(order.clienteId));
                        return (
                          <tr key={order.id}>
                            <td>#{order.numeroInterno}</td>
                            <td style={{ maxWidth: '130px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {customer?.razaoSocial ?? '-'}
                            </td>
                            <td><BadgeStatus status={order.status} /></td>
                            <td>{money(order.valorTotal)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Meus clientes */}
              <div className="panel">
                <div className="panel-title">
                  <h3>Meus Clientes</h3>
                  <button className="small-button" onClick={() => setView('customers')}>Ver todos</button>
                </div>
                {sellerCustomers.length === 0 ? (
                  <p style={{ color: '#6a7c76', marginTop: '12px' }}>Sem clientes vinculados.</p>
                ) : (
                  <div style={{ display: 'grid', gap: '10px', marginTop: '12px' }}>
                    {sellerCustomers.slice(0, 5).map((c) => (
                      <div
                        key={c.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 12px',
                          background: '#f6faf8',
                          borderRadius: '6px',
                          border: '1px solid #e4ece8'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: '700', fontSize: '14px', color: '#12322d' }}>{c.razaoSocial}</div>
                          <div style={{ fontSize: '12px', color: '#6a7c76' }}>{c.cidade} - {c.uf}</div>
                        </div>
                        <span className={`status ${c.ativo ? 'status-importado' : 'status-cancelado'}`}>
                          {c.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Status dos pedidos */}
              <div className="panel">
                <h3>Status dos Pedidos</h3>
                <div style={{ display: 'grid', gap: '12px', marginTop: '14px' }}>
                  {[
                    { label: 'Pendente', key: 'PENDENTE_TXT', color: '#f4b42aff' },
                    { label: 'Gerado', key: 'TXT_GERADO', color: '#10a66a' },
                    { label: 'Enviado SAP', key: 'ENVIADO_SAP', color: '#1f89e0ff' },
                    { label: 'Importado', key: 'IMPORTADO', color: '#087447' },
                    // { label: 'Erro SAP', key: 'ERRO_SAP', color: '#df4d5f' },
                  ].map(({ label, key, color }) => {
                    const count = sellerOrders.filter((o) => o.status === key).length;
                    const pct = sellerOrders.length > 0 ? (count / sellerOrders.length) * 100 : 0;
                    return (
                      <div key={key}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                          <span>{label}</span>
                          <strong>{count} pedido{count !== 1 ? 's' : ''}</strong>
                        </div>
                        <div style={{ background: '#e4ece8', height: '6px', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ background: color, width: `${pct}%`, height: '100%', transition: 'width 0.5s ease' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Clientes */}
        {view === 'customers' && (
          <div className="panel">
            <table>
              <thead>
                <tr>
                  <th>Cód. SAP</th>
                  <th>Razão Social / CNPJ</th>
                  <th>Cidade / UF</th>
                  <th>Tabela Preço</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sellerCustomers.map((customer) => {
                  const table = data.priceTables.find((t) => Number(t.id) === Number(customer.tabelaPrecoId));
                  return (
                    <tr key={customer.id}>
                      <td>{customer.codigoSap}</td>
                      <td>
                        <strong>{customer.razaoSocial}</strong>
                        <div style={{ fontSize: '12px', color: '#6a7c76' }}>CNPJ: {customer.cnpj}</div>
                      </td>
                      <td>{customer.cidade} - {customer.uf}</td>
                      <td>{table?.nome ?? 'Sem Tabela'}</td>
                      <td>
                        <span className={`status ${customer.ativo ? 'status-importado' : 'status-cancelado'}`}>
                          {customer.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Produtos */}
        {view === 'products' && (
          <>
            <div className="toolbar" style={{ marginBottom: '20px' }}>
              <label style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontWeight: 'bold', minWidth: '150px' }}>Tabela de Preços:</span>
                <select
                  value={selectedPriceTableId}
                  onChange={(e) => setSelectedPriceTableId(e.target.value)}
                  style={{ maxWidth: '250px' }}
                >
                  {data.priceTables.map((table) => (
                    <option key={table.id} value={table.id}>
                      {table.nome} {table.ativa ? '(Ativa)' : '(Inativa)'}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="panel">
              <table>
                <thead>
                  <tr>
                    <th>Cód. SAP</th>
                    <th>Descrição</th>
                    <th>Unidade</th>
                    <th>Estoque</th>
                    <th>Preço Base</th>
                    <th>Desconto Máx.</th>
                  </tr>
                </thead>
                <tbody>
                  {data.products.map((product) => {
                    const priceItem = data.priceTableItems.find(
                      (item) =>
                        Number(item.produtoId) === Number(product.id) &&
                        Number(item.tabelaPrecoId) === Number(selectedPriceTableId)
                    );
                    return (
                      <tr key={product.id}>
                        <td>{product.codigoSap}</td>
                        <td><strong>{product.descricao}</strong></td>
                        <td>{product.unidade}</td>
                        <td>{product.estoqueAtual}</td>
                        <td>{priceItem ? money(priceItem.precoBase) : 'Sem preço'}</td>
                        <td>{priceItem ? `${priceItem.descontoMaxPct}%` : '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Novo pedido */}
        {view === 'new' && (
          <FormPedido
            data={data}
            user={user}
            onCreated={(newData) => {
              setData(newData);
              setView('orders');
            }}
            onCancel={() => setView('dashboard')}
          />
        )}

        {/* Meus pedidos */}
        {view === 'orders' && (
          <>
            <div className="toolbar" style={{ marginBottom: '20px' }}>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ maxWidth: '200px' }}
              >
                <option value="">Todos os status</option>
                <option value="PENDENTE_TXT">Pendente</option>
                <option value="TXT_GERADO">Gerado</option>
                <option value="IMPORTADO">Importado</option>
                <option value="ERRO_SAP">Erro SAP</option>
              </select>
              <label className="search-box" style={{ flexGrow: 1 }}>
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Buscar por número do pedido ou cliente..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </label>
            </div>
            <div className="panel">
              {filteredOrders.length === 0 ? (
                <p style={{ color: '#6a7c76' }}>Nenhum pedido corresponde aos filtros.</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>N. Interno</th>
                      <th>N. SAP</th>
                      <th>Cliente</th>
                      <th>Entrega</th>
                      <th>Condição Pgto.</th>
                      <th>Status</th>
                      <th>Valor Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => {
                      const customer = data.customers.find((c) => Number(c.id) === Number(order.clienteId));
                      return (
                        <tr key={order.id}>
                          <td>#{order.numeroInterno}</td>
                          <td>{order.numeroSap || '-'}</td>
                          <td>
                            <strong>{customer?.razaoSocial ?? 'Cliente Desconhecido'}</strong>
                            <div style={{ fontSize: '12px', color: '#6a7c76' }}>CNPJ: {customer?.cnpj}</div>
                          </td>
                          <td>{order.dataEntrega}</td>
                          <td>{order.condicaoPagamento}</td>
                          <td><BadgeStatus status={order.status} /></td>
                          <td><strong>{money(order.valorTotal)}</strong></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
        {/* Relatórios */}
        {view === 'reports' && (
          <div style={{ display: 'grid', gap: '22px' }}>
            <div className="panel" style={{ display: 'grid', gap: '16px' }}>
              <div>
                <p style={{ margin: 0, color: '#6a7c76', fontSize: '12px', textTransform: 'uppercase', fontWeight: 700 }}>Relatórios do Representante</p>
                <h3 style={{ margin: '4px 0 6px', color: '#12322d', fontSize: '28px' }}>Downloads e indicadores</h3>
                <p style={{ margin: 0, color: '#6a7c76' }}>Arquivos filtrados apenas com seus clientes e seus pedidos.</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                <button className="secondary-button" onClick={downloadMyOrdersCsv}><Download size={16} />Baixar meus pedidos CSV</button>
                <button className="secondary-button" onClick={downloadMyCustomersCsv}><Download size={16} />Baixar meus clientes CSV</button>
                <button className="secondary-button" onClick={downloadMySummaryJson}><Download size={16} />Baixar resumo JSON</button>
                <button className="primary-button" onClick={() => window.print()}><Printer size={16} />Salvar como PDF</button>
              </div>
            </div>

            <div className="metrics" style={{ marginBottom: 0 }}>
              <article className="metric"><span>Faturamento</span><strong style={{ fontSize: '22px' }}>{money(totalRevenue)}</strong></article>
              <article className="metric" style={{ borderTopColor: '#1f7ae0' }}><span>Pedidos</span><strong>{sellerOrders.length}</strong></article>
              <article className="metric" style={{ borderTopColor: '#f4a62a' }}><span>Clientes</span><strong>{sellerCustomers.length}</strong></article>
              {/* <article className="metric" style={{ borderTopColor: '#df4d5f' }}><span>Erros SAP</span><strong>{errorOrders.length}</strong></article> */}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(360px, 2fr) minmax(260px, 1fr)', gap: '20px' }}>
              <div className="panel">
                <h3>Vendas por mês</h3>
                <div style={{ width: '100%', overflowX: 'auto', marginTop: '12px' }}>
                  <svg viewBox="0 0 740 280" width="100%" height="280" role="img" aria-label="Gráfico de vendas mensais para download">
                    {[0, 1, 2, 3].map((n) => <line key={n} x1="0" y1={24 + n * 58} x2="720" y2={24 + n * 58} stroke="#e6ecea" strokeWidth="1" />)}
                    <polyline fill="none" stroke="#1f7ae0" strokeWidth="4" points={salesLinePoints} transform="translate(0,24)" />
                    {monthLabels.map((month, index) => <text key={month} x={(index / (monthLabels.length - 1)) * 720} y="272" fontSize="11" fill="#6a7c76" textAnchor="middle">{month}</text>)}
                  </svg>
                </div>
              </div>

              <div className="panel">
                <h3>Pedidos por status</h3>
                <div style={{ display: 'grid', placeItems: 'center', padding: '18px 0' }}>
                  <div style={{ width: '170px', height: '170px', borderRadius: '999px', background: `conic-gradient(${statusPieGradient})`, position: 'relative' }}>
                    <div style={{ position: 'absolute', inset: '26px', borderRadius: '999px', background: '#fff' }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {statusSegments.map((segment) => (
                    <div key={segment.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span>{segment.label}</span>
                      <strong>{segment.value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Geração de Carga */}
        {view === 'carga' && <PaginaCarga user={user} isAdmin={false} embedded onDataChanged={setData} />}

      </section>
      </div>
    </>
  );
}






