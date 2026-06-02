import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ClipboardList, FileText, Shield, Package, Users, LayoutDashboard,
  Search, RefreshCw, Eye, FileDown, Plus, AlertTriangle, CheckCircle,
  AlertCircle, X, Trash2, Lock, Unlock, UserCheck, UserX, Edit3,
  Folder, Terminal, Zap, Filter, ChevronDown, ChevronUp, Download,
  BarChart2, TrendingUp, Activity, Settings, UserPlus, LogOut
} from 'lucide-react';
import { loadBootstrap, generateOrderTxt, importSapReturn } from '../services/api.js';
import MenuLateral from '../components/MenuLateral.jsx';
import BadgeStatus from '../components/BadgeStatus.jsx';
import PaginaCarga from './PaginaCarga.jsx';

const money = (v) => Number(v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (d) => d ? new Date(d).toLocaleString('pt-BR') : '-';

// ─── TOAST ───────────────────────────────────────────────────────────────────
function Toast({ toasts, remove }) {
  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 2000, display: 'grid', gap: '10px', minWidth: '300px' }}>
      {toasts.map((t) => (
        <div key={t.id} style={{
          display: 'flex', alignItems: 'center', gap: '10px', padding: '13px 16px',
          borderRadius: '8px', boxShadow: '0 8px 28px rgba(0,0,0,0.18)',
          background: t.type === 'success' ? '#e2f8ec' : t.type === 'error' ? '#ffe8eb' : '#e2efff',
          border: `1px solid ${t.type === 'success' ? '#b8eccf' : t.type === 'error' ? '#ffc3ca' : '#b8d4f8'}`,
          color: t.type === 'success' ? '#087447' : t.type === 'error' ? '#9e1d2e' : '#176ccb',
          fontWeight: '700', fontSize: '14px', animation: 'slideIn 0.2s ease'
        }}>
          {t.type === 'success' ? <CheckCircle size={16} /> : t.type === 'error' ? <AlertCircle size={16} /> : <Activity size={16} />}
          <span style={{ flex: 1 }}>{t.msg}</span>
          <button onClick={() => remove(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: '2px' }}><X size={14} /></button>
        </div>
      ))}
    </div>
  );
}

function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((msg, type = 'success') => {
    const id = Date.now();
    setToasts((p) => [...p, { id, msg, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 4500);
  }, []);
  const remove = useCallback((id) => setToasts((p) => p.filter((t) => t.id !== id)), []);
  return { toasts, add, remove };
}

// ─── MODAL BASE ──────────────────────────────────────────────────────────────
function Modal({ title, onClose, children, width = '560px' }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(17,33,31,0.45)', display: 'grid', placeItems: 'center', zIndex: 1000, padding: '16px' }}
      onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: '10px', padding: '28px', width: `min(100%, ${width})`, boxShadow: '0 24px 60px rgba(0,0,0,0.22)', border: '1px solid #dce7e1', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
          <h3 style={{ margin: 0, color: '#12322d', fontSize: '18px' }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6a7c76', padding: '4px', display: 'flex' }}><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── CONFIRMAÇÃO DE EXCLUSÃO ─────────────────────────────────────────────────
function ModalConfirm({ title, message, onClose, onConfirm, danger = true }) {
  const [loading, setLoading] = useState(false);
  return (
    <Modal title={title} onClose={onClose} width="420px">
      <div style={{ display: 'grid', gap: '18px' }}>
        <div style={{ display: 'flex', gap: '12px', padding: '14px', background: danger ? '#fff3f3' : '#fff8e6', borderRadius: '8px', border: `1px solid ${danger ? '#ffc3ca' : '#f4c86a'}` }}>
          <AlertTriangle size={22} color={danger ? '#b72035' : '#c47a00'} style={{ flexShrink: 0, marginTop: '2px' }} />
          <p style={{ margin: 0, color: danger ? '#7a1226' : '#7a4e00', fontSize: '14px', lineHeight: '1.5' }}>{message}</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button className="secondary-button" onClick={onClose} disabled={loading}>Cancelar</button>
          <button disabled={loading} onClick={async () => { setLoading(true); await onConfirm(); setLoading(false); }}
            style={{ minHeight: '42px', padding: '0 18px', borderRadius: '8px', border: 'none', background: danger ? '#df4d5f' : '#f4a62a', color: '#fff', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Aguarde...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── MODAL NOVO / EDITAR USUÁRIO ─────────────────────────────────────────────
function ModalUsuario({ user: editUser, onClose, onSave }) {
  const isEdit = !!editUser;
  const [form, setForm] = useState({
    nome: editUser?.nome ?? '',
    login: editUser?.login ?? '',
    password: '',
    perfil: editUser?.perfil ?? 'VENDEDOR',
    codigoRepresentanteSap: editUser?.codigoRepresentanteSap ?? '',
    ativo: editUser?.ativo ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  async function handleSubmit() {
    if (!form.nome.trim() || !form.login.trim()) { setErr('Nome e login são obrigatórios.'); return; }
    if (!isEdit && !form.password.trim()) { setErr('Senha obrigatória para novo usuário.'); return; }
    setSaving(true); setErr('');
    try {
      await new Promise((r) => setTimeout(r, 500));
      onSave({ ...editUser, ...form, id: editUser?.id ?? Date.now() });
    } catch { setErr('Erro ao salvar usuário.'); } finally { setSaving(false); }
  }

  return (
    <Modal title={isEdit ? `Editar: ${editUser.nome}` : 'Novo Usuário'} onClose={onClose} width="500px">
      <div style={{ display: 'grid', gap: '14px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <label>Nome completo<input value={form.nome} onChange={(e) => set('nome', e.target.value)} style={{ marginTop: '6px' }} /></label>
          <label>Login<input value={form.login} onChange={(e) => set('login', e.target.value)} style={{ marginTop: '6px' }} /></label>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <label>
            Senha {isEdit && <span style={{ fontWeight: '400', color: '#8a9c98' }}>(deixe em branco para manter)</span>}
            <input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} placeholder={isEdit ? 'Nova senha...' : 'Obrigatório'} style={{ marginTop: '6px' }} />
          </label>
          <label>Perfil
            <select value={form.perfil} onChange={(e) => set('perfil', e.target.value)} style={{ marginTop: '6px' }}>
              <option value="VENDEDOR">Vendedor</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </label>
        </div>
        <label>Código Representante SAP
          <input value={form.codigoRepresentanteSap} onChange={(e) => set('codigoRepresentanteSap', e.target.value)} placeholder="Ex: REP.CE - FULANO" style={{ marginTop: '6px' }} />
        </label>
        <label style={{ flexDirection: 'row', alignItems: 'center', gap: '10px', display: 'flex', cursor: 'pointer' }}>
          <input type="checkbox" checked={form.ativo} onChange={(e) => set('ativo', e.target.checked)} style={{ width: '16px', height: '16px' }} />
          <span>Usuário ativo</span>
        </label>
        {err && <div className="alert"><AlertCircle size={15} />{err}</div>}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '4px' }}>
          <button className="secondary-button" onClick={onClose} disabled={saving}>Cancelar</button>
          <button className="primary-button" onClick={handleSubmit} disabled={saving}>
            <UserPlus size={15} />{saving ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar usuário'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── MODAL VER PEDIDO ─────────────────────────────────────────────────────────
function ModalVerPedido({ order, data, onClose }) {
  const customer = data.customers.find((c) => Number(c.id) === Number(order.clienteId));
  const seller = data.users.find((u) => Number(u.id) === Number(order.vendedorId));
  return (
    <Modal title={`Pedido #${order.numeroInterno}`} onClose={onClose} width="760px">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[['Cliente', customer?.razaoSocial ?? '-'], ['CNPJ', customer?.cnpj ?? '-'], ['Vendedor', seller?.nome ?? '-'],
          ['Entrega', order.dataEntrega], ['Cond. Pgto.', order.condicaoPagamento], ['N. SAP', order.numeroSap || '-']
        ].map(([l, v]) => (
          <div key={l} style={{ background: '#f6faf8', borderRadius: '6px', padding: '10px 14px', border: '1px solid #e4ece8' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#6a7c76', textTransform: 'uppercase', marginBottom: '4px' }}>{l}</div>
            <div style={{ fontWeight: '600', color: '#12322d', fontSize: '13px' }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h4 style={{ margin: 0, color: '#12322d' }}>Itens</h4>
        <BadgeStatus status={order.status} />
      </div>
      <table style={{ minWidth: '460px' }}>
        <thead><tr><th>Produto</th><th>Qtd</th><th>Preço Unit.</th><th>Desc.</th><th>Total</th></tr></thead>
        <tbody>
          {order.itens.map((item) => {
            const product = data.products.find((p) => Number(p.id) === Number(item.produtoId));
            return (
              <tr key={item.produtoId}>
                <td><strong style={{ fontSize: '13px' }}>{product?.descricao ?? '-'}</strong><div style={{ fontSize: '11px', color: '#6a7c76' }}>{product?.codigoSap}</div></td>
                <td>{item.quantidade}</td><td>{money(item.precoUnitario)}</td>
                <td>{item.descontoPct ?? 0}%</td><td><strong>{money(item.valorTotal)}</strong></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #e4ece8' }}>
        <span style={{ fontSize: '18px', fontWeight: '800', color: '#12322d' }}>Total: {money(order.valorTotal)}</span>
      </div>
    </Modal>
  );
}

// ─── MODAL FORÇAR CARGA ───────────────────────────────────────────────────────
function ModalForcaCarga({ data, onClose, onExecute }) {
  const [mode, setMode] = useState('all'); // 'all' | 'partial'
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState([]);

  const sellers = data.users.filter((u) => u.ativo && u.perfil === 'VENDEDOR');

  const toggleUser = (id) => setSelectedUsers((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  const targetUsers = mode === 'all' ? sellers : sellers.filter((u) => selectedUsers.includes(u.id));

  const pendingByUser = useMemo(() => {
    const map = {};
    sellers.forEach((u) => { map[u.id] = data.orders.filter((o) => Number(o.vendedorId) === Number(u.id) && (o.status === 'PENDENTE_TXT' || o.status === 'RASCUNHO')).length; });
    return map;
  }, [data, sellers]);

  const totalPending = targetUsers.reduce((s, u) => s + (pendingByUser[u.id] ?? 0), 0);

  async function handleRun() {
    setRunning(true);
    setLog([{ time: new Date().toLocaleTimeString('pt-BR'), msg: `Iniciando carga ${mode === 'all' ? 'geral' : 'parcial'} para ${targetUsers.length} vendedor(es)...`, type: 'info' }]);
    let ok = 0; let fail = 0;
    for (const u of targetUsers) {
      const orders = data.orders.filter((o) => Number(o.vendedorId) === Number(u.id) && (o.status === 'PENDENTE_TXT' || o.status === 'RASCUNHO'));
      for (const order of orders) {
        try {
          const result = await generateOrderTxt(order.id);
          if (result.ok) {
            ok++;
            setLog((p) => [...p, { time: new Date().toLocaleTimeString('pt-BR'), msg: `✓ Pedido #${order.numeroInterno} → ${result.fileName}`, type: 'success' }]);
          } else {
            fail++;
            setLog((p) => [...p, { time: new Date().toLocaleTimeString('pt-BR'), msg: `✗ Pedido #${order.numeroInterno}: ${result.error}`, type: 'error' }]);
          }
        } catch (err) {
          fail++;
          setLog((p) => [...p, { time: new Date().toLocaleTimeString('pt-BR'), msg: `✗ Pedido #${order.numeroInterno}: ${err.message}`, type: 'error' }]);
        }
      }
    }
    setLog((p) => [...p, { time: new Date().toLocaleTimeString('pt-BR'), msg: `Concluído: ${ok} arquivo(s) gerado(s), ${fail} erro(s).`, type: ok > 0 && fail === 0 ? 'success' : 'error' }]);
    setRunning(false);
    onExecute();
  }

  return (
    <Modal title="Forçar Geração de Carga" onClose={onClose} width="600px">
      <div style={{ display: 'grid', gap: '18px' }}>
        {/* Modo */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {[['all', 'Carga Geral', 'Todos os vendedores ativos', Zap],
            ['partial', 'Carga Parcial', 'Selecionar vendedores', Filter]
          ].map(([val, label, sub, Icon]) => (
            <button key={val} onClick={() => setMode(val)}
              style={{ padding: '14px', borderRadius: '8px', border: `2px solid ${mode === val ? '#1f7ae0' : '#dce7e1'}`, background: mode === val ? '#eef5ff' : '#fff', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                <Icon size={16} color={mode === val ? '#1f7ae0' : '#75908a'} />
                <strong style={{ color: mode === val ? '#1f7ae0' : '#12322d', fontSize: '14px' }}>{label}</strong>
              </div>
              <div style={{ fontSize: '12px', color: '#6a7c76' }}>{sub}</div>
            </button>
          ))}
        </div>

        {/* Seleção de vendedores */}
        {mode === 'partial' && (
          <div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#6a7c76', marginBottom: '8px' }}>Selecionar Vendedores</div>
            <div style={{ display: 'grid', gap: '8px', maxHeight: '200px', overflowY: 'auto', padding: '2px' }}>
              {sellers.map((u) => {
                const count = pendingByUser[u.id] ?? 0;
                const checked = selectedUsers.includes(u.id);
                return (
                  <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '6px', border: `1px solid ${checked ? '#b8d4f8' : '#e4ece8'}`, background: checked ? '#eef5ff' : '#f6faf8', cursor: 'pointer' }}>
                    <input type="checkbox" checked={checked} onChange={() => toggleUser(u.id)} style={{ width: '15px', height: '15px', cursor: 'pointer' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '700', fontSize: '13px', color: '#12322d' }}>{u.nome}</div>
                      <div style={{ fontSize: '11px', color: '#6a7c76' }}>{u.login}</div>
                    </div>
                    {count > 0
                      ? <span style={{ background: '#fff8e6', border: '1px solid #f4c86a', color: '#7a4e00', borderRadius: '6px', padding: '2px 8px', fontSize: '11px', fontWeight: '700' }}>{count} pendente{count > 1 ? 's' : ''}</span>
                      : <span style={{ background: '#e2f8ec', border: '1px solid #b8eccf', color: '#087447', borderRadius: '6px', padding: '2px 8px', fontSize: '11px', fontWeight: '700' }}>sem pendências</span>
                    }
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Resumo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#f6faf8', borderRadius: '8px', border: '1px solid #e4ece8' }}>
          <div style={{ fontSize: '13px', color: '#42534f' }}>
            <strong>{targetUsers.length}</strong> vendedor(es) selecionado(s) · <strong style={{ color: totalPending > 0 ? '#c47a00' : '#087447' }}>{totalPending}</strong> pedido(s) pendente(s)
          </div>
        </div>

        {/* Log de execução */}
        {log.length > 0 && (
          <div style={{ background: '#0f1c1a', borderRadius: '8px', padding: '14px', fontFamily: 'monospace', fontSize: '12px', maxHeight: '160px', overflowY: 'auto' }}>
            {log.map((l, i) => (
              <div key={i} style={{ color: l.type === 'success' ? '#4ade80' : l.type === 'error' ? '#f87171' : '#94a3b8', marginBottom: '3px' }}>
                <span style={{ color: '#475569', marginRight: '8px' }}>[{l.time}]</span>{l.msg}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button className="secondary-button" onClick={onClose} disabled={running}>Cancelar</button>
          <button className="primary-button" onClick={handleRun}
            disabled={running || totalPending === 0 || (mode === 'partial' && selectedUsers.length === 0)}>
            <Zap size={15} />{running ? 'Executando...' : 'Executar Carga'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── SEÇÃO: PEDIDOS ───────────────────────────────────────────────────────────
function SecaoPedidos({ data, toast, onGenerate }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sellerFilter, setSellerFilter] = useState('');
  const [viewOrder, setViewOrder] = useState(null);

  const filtered = useMemo(() => {
    return data.orders.filter((o) => {
      const customer = data.customers.find((c) => Number(c.id) === Number(o.clienteId));
      const seller = data.users.find((u) => Number(u.id) === Number(o.vendedorId));
      const q = search.toLowerCase();
      const matchSearch = !q || o.numeroInterno.includes(q) || (o.numeroSap && o.numeroSap.includes(q)) || customer?.razaoSocial.toLowerCase().includes(q);
      return matchSearch && (!statusFilter || o.status === statusFilter) && (!sellerFilter || String(o.vendedorId) === sellerFilter);
    });
  }, [data, search, statusFilter, sellerFilter]);

  return (
    <>
      <div className="toolbar" style={{ marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ maxWidth: '180px' }}>
          <option value="">Todos os status</option>
          {['RASCUNHO','PENDENTE_TXT','TXT_GERADO','ENVIADO_SAP','IMPORTADO','ERRO_SAP','CANCELADO'].map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <select value={sellerFilter} onChange={(e) => setSellerFilter(e.target.value)} style={{ maxWidth: '200px' }}>
          <option value="">Todos os vendedores</option>
          {data.users.filter((u) => u.perfil === 'VENDEDOR').map((u) => (
            <option key={u.id} value={u.id}>{u.nome}</option>
          ))}
        </select>
        <label className="search-box" style={{ flexGrow: 1 }}>
          <Search size={16} />
          <input type="text" placeholder="Buscar por número, cliente..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
      </div>

      <div className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <span style={{ fontSize: '13px', color: '#6a7c76', fontWeight: '600' }}>{filtered.length} pedido(s) encontrado(s)</span>
        </div>
        <table>
          <thead>
            <tr><th>Nº Int.</th><th>Nº SAP</th><th>Vendedor</th><th>Cliente</th><th>Entrega</th><th>Status</th><th>Valor</th><th>Ações</th></tr>
          </thead>
          <tbody>
            {filtered.map((order) => {
              const seller = data.users.find((u) => Number(u.id) === Number(order.vendedorId));
              const customer = data.customers.find((c) => Number(c.id) === Number(order.clienteId));
              return (
                <tr key={order.id}>
                  <td><strong>#{order.numeroInterno}</strong></td>
                  <td style={{ fontSize: '13px' }}>{order.numeroSap || '-'}</td>
                  <td style={{ fontSize: '13px' }}>{seller?.nome ?? '-'}</td>
                  <td>
                    <strong style={{ fontSize: '13px' }}>{customer?.razaoSocial ?? '-'}</strong>
                    <div style={{ fontSize: '11px', color: '#6a7c76' }}>{customer?.cnpj}</div>
                  </td>
                  <td style={{ fontSize: '13px' }}>{order.dataEntrega}</td>
                  <td><BadgeStatus status={order.status} /></td>
                  <td><strong style={{ fontSize: '13px' }}>{money(order.valorTotal)}</strong></td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button className="icon-button" onClick={() => setViewOrder(order)} title="Visualizar" style={{ width: '30px', height: '30px', color: '#1f7ae0', borderColor: '#c5d9f5' }}><Eye size={13} /></button>
                      <button className="small-button" onClick={() => onGenerate(order.id)} disabled={order.status === 'IMPORTADO'}
                        style={{ fontSize: '12px', height: '30px', padding: '0 10px', color: '#087447', borderColor: '#b8eccf' }}>
                        <FileDown size={13} />TXT
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {viewOrder && <ModalVerPedido order={viewOrder} data={data} onClose={() => setViewOrder(null)} />}
    </>
  );
}

// ─── SEÇÃO: USUÁRIOS ──────────────────────────────────────────────────────────
function SecaoUsuarios({ data, setData, toast }) {
  const [search, setSearch] = useState('');
  const [modalUser, setModalUser] = useState(null); // null | 'new' | userObj
  const [confirmAction, setConfirmAction] = useState(null); // { type, user }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return data.users.filter((u) => !q || u.nome.toLowerCase().includes(q) || u.login.toLowerCase().includes(q));
  }, [data.users, search]);

  const updateUser = (updated) => {
    setData((p) => ({ ...p, users: p.users.map((u) => u.id === updated.id ? updated : u) }));
  };

  const addUser = (newUser) => {
    setData((p) => ({ ...p, users: [...p.users, newUser] }));
  };

  const handleSave = (saved) => {
    if (modalUser === 'new') { addUser(saved); toast('Usuário criado com sucesso!'); }
    else { updateUser(saved); toast('Usuário atualizado!'); }
    setModalUser(null);
  };

  const handleToggleBlock = async (u) => {
    await new Promise((r) => setTimeout(r, 300));
    updateUser({ ...u, ativo: !u.ativo });
    toast(`${u.ativo ? 'Acesso bloqueado' : 'Acesso reativado'}: ${u.nome}`, u.ativo ? 'error' : 'success');
    setConfirmAction(null);
  };

  const handleToggleAdmin = async (u) => {
    await new Promise((r) => setTimeout(r, 300));
    const newPerfil = u.perfil === 'ADMIN' ? 'VENDEDOR' : 'ADMIN';
    updateUser({ ...u, perfil: newPerfil });
    toast(`${u.nome} agora é ${newPerfil}`);
    setConfirmAction(null);
  };

  const handleDelete = async (u) => {
    await new Promise((r) => setTimeout(r, 300));
    setData((p) => ({ ...p, users: p.users.filter((x) => x.id !== u.id) }));
    toast(`Usuário ${u.nome} removido.`, 'error');
    setConfirmAction(null);
  };

  return (
    <>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <label className="search-box" style={{ flexGrow: 1 }}>
          <Search size={16} />
          <input type="text" placeholder="Buscar por nome ou login..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <button className="primary-button" onClick={() => setModalUser('new')}>
          <UserPlus size={15} />Novo usuário
        </button>
      </div>

      <div className="panel">
        <table>
          <thead>
            <tr><th>Usuário</th><th>Login</th><th>Perfil</th><th>Repr. SAP</th><th>Status</th><th style={{ minWidth: '180px' }}>Permissões</th></tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: u.perfil === 'ADMIN' ? '#1f7ae0' : '#10a66a', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: '800', fontSize: '12px', flexShrink: 0 }}>
                      {u.nome.slice(0, 2).toUpperCase()}
                    </div>
                    <strong style={{ fontSize: '13px' }}>{u.nome}</strong>
                  </div>
                </td>
                <td style={{ fontSize: '13px', color: '#6a7c76' }}>{u.login}</td>
                <td>
                  <span className={`status ${u.perfil === 'ADMIN' ? 'status-pendente_txt' : 'status-importado'}`}>{u.perfil}</span>
                </td>
                <td style={{ fontSize: '13px' }}>{u.codigoRepresentanteSap || <span style={{ color: '#aab8b3' }}>N/A</span>}</td>
                <td>
                  <span className={`status ${u.ativo ? 'status-importado' : 'status-cancelado'}`}>{u.ativo ? 'Ativo' : 'Bloqueado'}</span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button className="icon-button" title="Editar usuário" onClick={() => setModalUser(u)}
                      style={{ width: '30px', height: '30px', color: '#c47a00', borderColor: '#f4d58a' }}><Edit3 size={13} /></button>
                    <button className="icon-button" title={u.perfil === 'ADMIN' ? 'Remover admin' : 'Tornar admin'} onClick={() => setConfirmAction({ type: 'role', user: u })}
                      style={{ width: '30px', height: '30px', color: u.perfil === 'ADMIN' ? '#df4d5f' : '#1f7ae0', borderColor: u.perfil === 'ADMIN' ? '#f4a0aa' : '#c5d9f5' }}>
                      {u.perfil === 'ADMIN' ? <UserX size={13} /> : <UserCheck size={13} />}
                    </button>
                    <button className="icon-button" title={u.ativo ? 'Bloquear acesso' : 'Desbloquear'} onClick={() => setConfirmAction({ type: 'block', user: u })}
                      style={{ width: '30px', height: '30px', color: u.ativo ? '#b72035' : '#087447', borderColor: u.ativo ? '#f4a0aa' : '#b8eccf' }}>
                      {u.ativo ? <Lock size={13} /> : <Unlock size={13} />}
                    </button>
                    <button className="icon-button" title="Excluir usuário" onClick={() => setConfirmAction({ type: 'delete', user: u })}
                      style={{ width: '30px', height: '30px', color: '#b72035', borderColor: '#f4a0aa' }}><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(modalUser === 'new' || (modalUser && typeof modalUser === 'object')) && (
        <ModalUsuario user={modalUser === 'new' ? null : modalUser} onClose={() => setModalUser(null)} onSave={handleSave} />
      )}

      {confirmAction?.type === 'role' && (
        <ModalConfirm
          title={confirmAction.user.perfil === 'ADMIN' ? 'Remover permissão Admin' : 'Conceder permissão Admin'}
          message={confirmAction.user.perfil === 'ADMIN'
            ? `${confirmAction.user.nome} perderá o acesso de administrador e voltará a ser Vendedor.`
            : `${confirmAction.user.nome} se tornará Administrador com acesso total ao sistema.`}
          danger={confirmAction.user.perfil !== 'ADMIN'}
          onClose={() => setConfirmAction(null)}
          onConfirm={() => handleToggleAdmin(confirmAction.user)}
        />
      )}
      {confirmAction?.type === 'block' && (
        <ModalConfirm
          title={confirmAction.user.ativo ? 'Bloquear acesso' : 'Reativar acesso'}
          message={confirmAction.user.ativo
            ? `${confirmAction.user.nome} não conseguirá mais fazer login no sistema.`
            : `${confirmAction.user.nome} voltará a ter acesso ao sistema.`}
          danger={confirmAction.user.ativo}
          onClose={() => setConfirmAction(null)}
          onConfirm={() => handleToggleBlock(confirmAction.user)}
        />
      )}
      {confirmAction?.type === 'delete' && (
        <ModalConfirm
          title="Excluir usuário permanentemente"
          message={`O usuário "${confirmAction.user.nome}" (${confirmAction.user.login}) será removido do sistema. Esta ação não pode ser desfeita.`}
          onClose={() => setConfirmAction(null)}
          onConfirm={() => handleDelete(confirmAction.user)}
        />
      )}
    </>
  );
}

// ─── SEÇÃO: ARQUIVOS TXT ──────────────────────────────────────────────────────
function SecaoArquivosTxt({ data }) {
  const [search, setSearch] = useState('');
  const [viewContent, setViewContent] = useState(null);

  const txtLogs = useMemo(() => {
    return data.integrationLogs.filter((l) => l.direcao === 'ENVIO' && l.arquivoNome?.endsWith('.txt'));
  }, [data]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return txtLogs.filter((l) => !q || l.arquivoNome.toLowerCase().includes(q) || (l.pedidoId && String(l.pedidoId).includes(q)));
  }, [txtLogs, search]);

  // Agrupar por "pasta" simulada baseada no prefixo do arquivo
  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach((l) => {
      const folder = l.caminhoArquivo?.split('/').slice(0, -1).join('/') || '/saida/carga';
      if (!map[folder]) map[folder] = [];
      map[folder].push(l);
    });
    return map;
  }, [filtered]);

  const [openFolders, setOpenFolders] = useState({});
  const toggleFolder = (f) => setOpenFolders((p) => ({ ...p, [f]: !p[f] }));

  return (
    <>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center' }}>
        <label className="search-box" style={{ flexGrow: 1 }}>
          <Search size={16} />
          <input type="text" placeholder="Buscar por nome do arquivo ou Nº pedido..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <div style={{ fontSize: '13px', color: '#6a7c76', whiteSpace: 'nowrap' }}>{txtLogs.length} arquivo(s)</div>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div className="panel" style={{ textAlign: 'center', padding: '48px', color: '#6a7c76' }}>
          <Folder size={40} style={{ marginBottom: '12px', opacity: 0.4 }} />
          <p style={{ margin: 0 }}>Nenhum arquivo TXT gerado ainda.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {Object.entries(grouped).map(([folder, files]) => {
            const isOpen = openFolders[folder] !== false;
            return (
              <div key={folder} className="panel" style={{ padding: '0', overflow: 'hidden' }}>
                <button onClick={() => toggleFolder(folder)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 18px', background: '#f6faf8', border: 'none', cursor: 'pointer', borderBottom: isOpen ? '1px solid #e4ece8' : 'none' }}>
                  <Folder size={16} color="#c47a00" />
                  <span style={{ fontWeight: '700', color: '#12322d', flex: 1, textAlign: 'left', fontSize: '14px' }}>{folder}</span>
                  <span style={{ fontSize: '12px', color: '#6a7c76' }}>{files.length} arquivo(s)</span>
                  {isOpen ? <ChevronUp size={14} color="#6a7c76" /> : <ChevronDown size={14} color="#6a7c76" />}
                </button>
                {isOpen && (
                  <table style={{ minWidth: '500px' }}>
                    <thead>
                      <tr><th>Arquivo</th><th>Pedido</th><th>Resultado</th><th>Data/Hora</th><th>Ações</th></tr>
                    </thead>
                    <tbody>
                      {files.slice().reverse().map((l) => (
                        <tr key={l.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <FileText size={14} color="#6a7c76" />
                              <strong style={{ fontSize: '13px' }}>{l.arquivoNome}</strong>
                            </div>
                          </td>
                          <td style={{ fontSize: '13px' }}>{l.pedidoId ? `#${l.pedidoId}` : '-'}</td>
                          <td><span className={`status ${l.resultado === 'SUCESSO' ? 'status-importado' : 'status-erro_sap'}`}>{l.resultado}</span></td>
                          <td style={{ fontSize: '12px', color: '#6a7c76' }}>{fmtDate(l.criadoEm)}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button className="icon-button" onClick={() => setViewContent(l)} title="Ver conteúdo"
                                style={{ width: '30px', height: '30px', color: '#1f7ae0', borderColor: '#c5d9f5' }}><Eye size={13} /></button>
                              <button className="icon-button" title="Download"
                                style={{ width: '30px', height: '30px', color: '#087447', borderColor: '#b8eccf' }}><Download size={13} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
        </div>
      )}

      {viewContent && (
        <Modal title={viewContent.arquivoNome} onClose={() => setViewContent(null)} width="640px">
          <div style={{ marginBottom: '10px', fontSize: '12px', color: '#6a7c76' }}>{viewContent.caminhoArquivo}</div>
          <pre style={{ background: '#0f1c1a', color: '#4ade80', padding: '16px', borderRadius: '8px', overflowX: 'auto', fontSize: '12px', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: '400px', overflowY: 'auto', margin: 0 }}>
            {viewContent.payloadTxt || '(Conteúdo não disponível)'}
          </pre>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px' }}>
            <button className="secondary-button"><Download size={14} />Baixar arquivo</button>
          </div>
        </Modal>
      )}
    </>
  );
}

// ─── SEÇÃO: LOG DE ERROS ──────────────────────────────────────────────────────
function SecaoLogErros({ data }) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [viewLog, setViewLog] = useState(null);

  const errorLogs = useMemo(() => {
    return data.integrationLogs.filter((l) => l.resultado === 'ERRO' || l.resultado === 'FALHA');
  }, [data]);

  const sapErrors = useMemo(() => data.orders.filter((o) => o.status === 'ERRO_SAP'), [data]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return errorLogs.filter((l) => {
      const match = !q || l.arquivoNome.toLowerCase().includes(q) || String(l.pedidoId ?? '').includes(q);
      return match && (!typeFilter || l.direcao === typeFilter);
    });
  }, [errorLogs, search, typeFilter]);

  return (
    <>
      {/* Cards de resumo de erro */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        <article className="metric" style={{ borderTopColor: '#df4d5f' }}>
          <span>Erros de Integração</span><strong>{errorLogs.length}</strong>
        </article>
        <article className="metric" style={{ borderTopColor: '#f4a62a' }}>
          <span>Pedidos com Erro SAP</span><strong>{sapErrors.length}</strong>
        </article>
        <article className="metric" style={{ borderTopColor: '#1f7ae0' }}>
          <span>Total de Logs</span><strong>{data.integrationLogs.length}</strong>
        </article>
      </div>

      {sapErrors.length > 0 && (
        <div style={{ marginBottom: '20px', padding: '14px 18px', background: '#ffe8eb', border: '1px solid #ffc3ca', borderRadius: '8px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
            <AlertTriangle size={16} color="#b72035" />
            <strong style={{ color: '#7a1226', fontSize: '14px' }}>Pedidos com status ERRO_SAP</strong>
          </div>
          <div style={{ display: 'grid', gap: '6px' }}>
            {sapErrors.map((o) => {
              const customer = data.customers.find((c) => Number(c.id) === Number(o.clienteId));
              return (
                <div key={o.id} style={{ display: 'flex', gap: '10px', fontSize: '13px', color: '#9e1d2e', background: '#fff3f3', padding: '8px 12px', borderRadius: '6px' }}>
                  <strong>#{o.numeroInterno}</strong>
                  <span>{customer?.razaoSocial ?? '-'}</span>
                  <span style={{ marginLeft: 'auto' }}>{money(o.valorTotal)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="toolbar" style={{ marginBottom: '14px' }}>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ maxWidth: '180px' }}>
          <option value="">Todos os tipos</option>
          <option value="ENVIO">Envio</option>
          <option value="RETORNO">Retorno</option>
        </select>
        <label className="search-box" style={{ flexGrow: 1 }}>
          <Search size={16} />
          <input type="text" placeholder="Buscar por arquivo ou pedido..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
      </div>

      <div className="panel">
        {filtered.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#087447' }}>
            <CheckCircle size={36} style={{ marginBottom: '10px' }} />
            <p style={{ margin: 0, fontWeight: '700' }}>Nenhum erro de integração encontrado.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr><th>Arquivo</th><th>Direção</th><th>Pedido</th><th>Erro</th><th>Data/Hora</th><th>Ações</th></tr>
            </thead>
            <tbody>
              {filtered.slice().reverse().map((l) => (
                <tr key={l.id}>
                  <td><strong style={{ fontSize: '13px' }}>{l.arquivoNome}</strong></td>
                  <td><span className={`status ${l.direcao === 'ENVIO' ? 'status-pendente_txt' : 'status-importado'}`}>{l.direcao}</span></td>
                  <td style={{ fontSize: '13px' }}>{l.pedidoId ? `#${l.pedidoId}` : '-'}</td>
                  <td><span className="status status-erro_sap">{l.resultado}</span></td>
                  <td style={{ fontSize: '12px', color: '#6a7c76' }}>{fmtDate(l.criadoEm)}</td>
                  <td>
                    <button className="small-button" onClick={() => setViewLog(l)} style={{ height: '30px', padding: '0 10px', fontSize: '12px' }}>
                      <Eye size={13} />Detalhe
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {viewLog && (
        <Modal title={`Detalhe do Erro — ${viewLog.arquivoNome}`} onClose={() => setViewLog(null)} width="620px">
          <div style={{ display: 'grid', gap: '12px' }}>
            {[['Direção', viewLog.direcao], ['Resultado', viewLog.resultado], ['Pedido', viewLog.pedidoId ? `#${viewLog.pedidoId}` : '-'], ['Data/Hora', fmtDate(viewLog.criadoEm)]].map(([l, v]) => (
              <div key={l} style={{ display: 'flex', gap: '12px', fontSize: '13px' }}>
                <span style={{ fontWeight: '700', color: '#6a7c76', minWidth: '90px' }}>{l}:</span>
                <span style={{ color: '#12322d' }}>{v}</span>
              </div>
            ))}
            {(viewLog.payloadTxt || viewLog.respostaSap) && (
              <>
                <div style={{ fontWeight: '700', fontSize: '13px', color: '#6a7c76', marginTop: '4px' }}>Conteúdo:</div>
                <pre style={{ background: '#0f1c1a', color: '#f87171', padding: '14px', borderRadius: '8px', fontSize: '12px', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: '300px', overflowY: 'auto', margin: 0 }}>
                  {viewLog.payloadTxt || viewLog.respostaSap}
                </pre>
              </>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}

// ─── SEÇÃO: INTEGRAÇÃO SAP ────────────────────────────────────────────────────
function SecaoIntegracao({ data, toast, onRefresh }) {
  const [search, setSearch] = useState('');
  const [dirFilter, setDirFilter] = useState('');
  const [selectedReturnFile, setSelectedReturnFile] = useState('00241_ok.txt');
  const [viewLog, setViewLog] = useState(null);
  const [importing, setImporting] = useState(false);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.toLowerCase();
    return data.integrationLogs.filter((l) => {
      const match = !q || l.arquivoNome.toLowerCase().includes(q) || String(l.pedidoId ?? '').includes(q);
      return match && (!dirFilter || l.direcao === dirFilter);
    });
  }, [data, search, dirFilter]);

  const handleImport = async () => {
    setImporting(true);
    try {
      const result = await importSapReturn(selectedReturnFile);
      if (result.ok) { toast(`Retorno importado: Pedido #${result.order?.numeroInterno} → ${result.order?.status}`); onRefresh(); }
      else toast(`Erro ao importar: ${result.error}`, 'error');
    } catch (err) { toast(`Erro: ${err.message}`, 'error'); }
    finally { setImporting(false); }
  };

  return (
    <>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', padding: '14px 18px', background: 'rgba(255,255,255,0.92)', border: '1px solid #dce7e1', borderRadius: '8px' }}>
        <FileText size={16} color="#6a7c76" />
        <span style={{ fontWeight: '700', fontSize: '13px', color: '#6a7c76' }}>Simular Retorno SAP:</span>
        <select value={selectedReturnFile} onChange={(e) => setSelectedReturnFile(e.target.value)} style={{ maxWidth: '220px', minHeight: '38px' }}>
          <option value="00241_ok.txt">00241_ok.txt — Sucesso</option>
          <option value="00241_erro.txt">00241_erro.txt — Erro</option>
        </select>
        <button className="secondary-button" onClick={handleImport} disabled={importing}>
          <RefreshCw size={15} />{importing ? 'Importando...' : 'Importar Retorno'}
        </button>
      </div>

      <div className="toolbar" style={{ marginBottom: '14px' }}>
        <select value={dirFilter} onChange={(e) => setDirFilter(e.target.value)} style={{ maxWidth: '180px' }}>
          <option value="">Todas as direções</option>
          <option value="ENVIO">Envio (Outbound)</option>
          <option value="RETORNO">Retorno (Inbound)</option>
        </select>
        <label className="search-box" style={{ flexGrow: 1 }}>
          <Search size={16} />
          <input type="text" placeholder="Buscar por arquivo ou Nº pedido..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
      </div>

      <div className="panel">
        {filtered.length === 0 ? (
          <p style={{ color: '#6a7c76', padding: '20px 0' }}>Nenhum log encontrado.</p>
        ) : (
          <table>
            <thead>
              <tr><th>Arquivo</th><th>Direção</th><th>Pedido</th><th>Resultado</th><th>Data/Hora</th><th>Ações</th></tr>
            </thead>
            <tbody>
              {filtered.slice().reverse().map((l) => (
                <tr key={l.id}>
                  <td>
                    <strong style={{ fontSize: '13px' }}>{l.arquivoNome}</strong>
                    <div style={{ fontSize: '11px', color: '#6a7c76', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '220px', whiteSpace: 'nowrap' }}>{l.caminhoArquivo}</div>
                  </td>
                  <td><span className={`status ${l.direcao === 'ENVIO' ? 'status-pendente_txt' : 'status-importado'}`}>{l.direcao}</span></td>
                  <td style={{ fontSize: '13px' }}>{l.pedidoId ? `#${l.pedidoId}` : '-'}</td>
                  <td><span className={`status ${l.resultado === 'SUCESSO' ? 'status-importado' : 'status-erro_sap'}`}>{l.resultado}</span></td>
                  <td style={{ fontSize: '12px', color: '#6a7c76' }}>{fmtDate(l.criadoEm)}</td>
                  <td>
                    <button className="small-button" onClick={() => setViewLog(l)} style={{ height: '30px', padding: '0 10px', fontSize: '12px' }}>
                      <Eye size={13} />Ver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {viewLog && (
        <Modal title={`Log — ${viewLog.arquivoNome}`} onClose={() => setViewLog(null)} width="620px">
          <pre style={{ background: '#0f1c1a', color: '#e2e8f0', padding: '16px', borderRadius: '8px', overflowX: 'auto', fontSize: '12px', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: '400px', overflowY: 'auto', margin: 0 }}>
            {viewLog.payloadTxt || viewLog.respostaSap || 'Sem conteúdo disponível.'}
          </pre>
        </Modal>
      )}
    </>
  );
}

// ─── SEÇÃO: RELATÓRIOS ────────────────────────────────────────────────────────
function SecaoRelatorios({ data }) {
  const totalRevenue = useMemo(() => data.orders.reduce((s, o) => s + o.valorTotal, 0), [data]);
  const totalItemsSold = useMemo(() => data.orders.reduce((s, o) => s + o.itens.reduce((ii, i) => ii + i.quantidade, 0), 0), [data]);

  const sellerSales = useMemo(() => {
    const map = {};
    data.users.filter((u) => u.perfil === 'VENDEDOR').forEach((u) => { map[u.id] = { name: u.nome, total: 0, count: 0 }; });
    data.orders.forEach((o) => { if (map[o.vendedorId]) { map[o.vendedorId].total += o.valorTotal; map[o.vendedorId].count++; } });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [data]);

  const topProducts = useMemo(() => {
    const map = {};
    data.products.forEach((p) => { map[p.id] = { desc: p.descricao, sku: p.codigoSap, qty: 0 }; });
    data.orders.forEach((o) => o.itens.forEach((i) => { if (map[i.produtoId]) map[i.produtoId].qty += i.quantidade; }));
    return Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, 6);
  }, [data]);

  const maxQty = topProducts[0]?.qty ?? 1;

  const statusCounts = useMemo(() => {
    const map = {};
    data.orders.forEach((o) => { map[o.status] = (map[o.status] ?? 0) + 1; });
    return map;
  }, [data]);

  const statusColors = { IMPORTADO: '#10a66a', PENDENTE_TXT: '#1f7ae0', TXT_GERADO: '#087447', ENVIADO_SAP: '#f4a62a', ERRO_SAP: '#df4d5f', RASCUNHO: '#8a9c98', CANCELADO: '#cdd5d2' };

  return (
    <div style={{ display: 'grid', gap: '22px' }}>
      <div className="metrics">
        <article className="metric"><span>Faturamento Geral</span><strong style={{ fontSize: '22px' }}>{money(totalRevenue)}</strong></article>
        <article className="metric"><span>Total de Pedidos</span><strong>{data.orders.length}</strong></article>
        <article className="metric"><span>Itens Vendidos</span><strong>{totalItemsSold}</strong></article>
        <article className="metric"><span>Erros SAP</span><strong>{data.orders.filter((o) => o.status === 'ERRO_SAP').length}</strong></article>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '18px' }}>
        {/* Vendas por vendedor */}
        <div className="panel">
          <h3 style={{ color: '#12322d', margin: '0 0 16px' }}>Vendas por Vendedor</h3>
          {sellerSales.map(({ name, total, count }) => {
            const pct = totalRevenue > 0 ? (total / totalRevenue) * 100 : 0;
            return (
              <div key={name} style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '5px' }}>
                  <span style={{ fontWeight: '700', color: '#12322d' }}>{name}</span>
                  <span style={{ color: '#6a7c76' }}>{count} pedido(s) · <strong style={{ color: '#12322d' }}>{money(total)}</strong></span>
                </div>
                <div style={{ background: '#e4ece8', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ background: '#10a66a', width: `${pct}%`, height: '100%', transition: 'width 0.6s ease' }} />
                </div>
                <div style={{ fontSize: '11px', color: '#8a9c98', marginTop: '2px' }}>{pct.toFixed(1)}% do total</div>
              </div>
            );
          })}
        </div>

        {/* Produtos mais vendidos */}
        <div className="panel">
          <h3 style={{ color: '#12322d', margin: '0 0 16px' }}>Produtos Mais Vendidos</h3>
          {topProducts.map(({ desc, sku, qty }) => {
            const pct = maxQty > 0 ? (qty / maxQty) * 100 : 0;
            return (
              <div key={sku} style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '5px' }}>
                  <span style={{ fontWeight: '700', color: '#12322d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{desc}</span>
                  <span style={{ color: '#6a7c76', whiteSpace: 'nowrap' }}>{qty} un.</span>
                </div>
                <div style={{ background: '#e4ece8', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ background: '#1f7ae0', width: `${pct}%`, height: '100%', transition: 'width 0.6s ease' }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Status dos pedidos */}
        <div className="panel">
          <h3 style={{ color: '#12322d', margin: '0 0 16px' }}>Distribuição por Status</h3>
          {Object.entries(statusCounts).map(([status, count]) => {
            const pct = data.orders.length > 0 ? (count / data.orders.length) * 100 : 0;
            return (
              <div key={status} style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '5px' }}>
                  <BadgeStatus status={status} />
                  <span style={{ color: '#6a7c76' }}>{count} · <strong>{pct.toFixed(0)}%</strong></span>
                </div>
                <div style={{ background: '#e4ece8', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ background: statusColors[status] ?? '#8a9c98', width: `${pct}%`, height: '100%' }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── DASHBOARD ADMIN (PRINCIPAL) ──────────────────────────────────────────────
export default function DashboardAdmin() {
  const [data, setData] = useState(null);
  const [view, setView] = useState('orders');
  const [showForcaCarga, setShowForcaCarga] = useState(false);
  const { toasts, add: toast, remove: removeToast } = useToast();

  const refreshData = useCallback(async () => {
    try { const d = await loadBootstrap(); setData(d); }
    catch (err) { console.error(err); }
  }, []);

  useEffect(() => { refreshData(); }, [refreshData]);

  const pendingCargaCount = useMemo(() => {
    if (!data) return 0;
    return data.orders.filter((o) => o.status === 'PENDENTE_TXT' || o.status === 'RASCUNHO').length;
  }, [data]);

  const errorCount = useMemo(() => {
    if (!data) return 0;
    return data.integrationLogs.filter((l) => l.resultado === 'ERRO' || l.resultado === 'FALHA').length;
  }, [data]);

  if (!data) return <div className="loading">Carregando painel do administrador...</div>;

  const handleGenerate = async (orderId) => {
    try {
      const result = await generateOrderTxt(orderId);
      if (result.ok) { toast(`Arquivo gerado: ${result.fileName}`); await refreshData(); }
      else toast(`Erro ao gerar TXT: ${result.error}`, 'error');
    } catch (err) { toast(`Erro: ${err.message}`, 'error'); }
  };

  const sidebarItems = [
    { key: 'orders', label: 'Pedidos', icon: ClipboardList },
    { key: 'carga', label: pendingCargaCount > 0 ? `Carga (${pendingCargaCount})` : 'Geração de Carga', icon: FileDown },
    { key: 'integration', label: 'Integração SAP', icon: FileText },
    { key: 'txt_files', label: 'Arquivos TXT', icon: Folder },
    { key: 'error_log', label: errorCount > 0 ? `Log de Erros (${errorCount})` : 'Log de Erros', icon: Terminal },
    { key: 'users', label: 'Usuários', icon: Shield },
    { key: 'products', label: 'Produtos', icon: Package },
    { key: 'customers', label: 'Clientes', icon: Users },
    { key: 'reports', label: 'Relatórios', icon: BarChart2 },
  ];

  const headingMap = {
    orders: 'Gerenciamento de Pedidos',
    carga: 'Geração de Carga',
    integration: 'Integração SAP',
    txt_files: 'Arquivos TXT Gerados',
    error_log: 'Log de Erros',
    users: 'Usuários do Sistema',
    products: 'Produtos Registrados',
    customers: 'Todos os Clientes',
    reports: 'Relatórios',
  };

  return (
    <div className="layout">
      <MenuLateral active={view} items={sidebarItems} onViewChange={setView} />

      <section className="content">
        {view !== 'carga' && (
          <div className="section-heading">
            <div>
              <p>Painel do Administrador</p>
              <h2>{headingMap[view]}</h2>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              {view === 'users' && null}
              <button className="secondary-button" onClick={() => setShowForcaCarga(true)}>
                <Zap size={15} />Forçar Carga
              </button>
              <button className="secondary-button" onClick={refreshData} title="Atualizar dados">
                <RefreshCw size={15} />Atualizar
              </button>
            </div>
          </div>
        )}

        {view === 'orders' && <SecaoPedidos data={data} toast={toast} onGenerate={handleGenerate} />}
        {view === 'carga' && <PaginaCarga isAdmin={true} />}
        {view === 'integration' && <SecaoIntegracao data={data} toast={toast} onRefresh={refreshData} />}
        {view === 'txt_files' && <SecaoArquivosTxt data={data} />}
        {view === 'error_log' && <SecaoLogErros data={data} />}
        {view === 'users' && <SecaoUsuarios data={data} setData={setData} toast={toast} />}

        {view === 'products' && (
          <div className="panel">
            <table>
              <thead><tr><th>Código SAP</th><th>Descrição</th><th>Unidade</th><th>Estoque</th><th>Status</th></tr></thead>
              <tbody>
                {data.products.map((p) => (
                  <tr key={p.id}>
                    <td>{p.codigoSap}</td><td><strong>{p.descricao}</strong></td>
                    <td>{p.unidade}</td><td>{p.estoqueAtual}</td>
                    <td><span className={`status ${p.ativo ? 'status-importado' : 'status-cancelado'}`}>{p.ativo ? 'Ativo' : 'Inativo'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {view === 'customers' && (
          <div className="panel">
            <table>
              <thead><tr><th>Cód. SAP</th><th>Razão Social / CNPJ</th><th>Cidade / UF</th><th>Vendedor</th><th>Tabela Preços</th><th>Status</th></tr></thead>
              <tbody>
                {data.customers.map((c) => {
                  const seller = data.users.find((u) => Number(u.id) === Number(c.vendedorId));
                  const table = data.priceTables.find((t) => Number(t.id) === Number(c.tabelaPrecoId));
                  return (
                    <tr key={c.id}>
                      <td>{c.codigoSap}</td>
                      <td><strong>{c.razaoSocial}</strong><div style={{ fontSize: '12px', color: '#6a7c76' }}>CNPJ: {c.cnpj}</div></td>
                      <td>{c.cidade} - {c.uf}</td>
                      <td style={{ fontSize: '13px' }}>{seller?.nome ?? '-'}</td>
                      <td style={{ fontSize: '13px' }}>{table?.nome ?? 'Nenhuma'}</td>
                      <td><span className={`status ${c.ativo ? 'status-importado' : 'status-cancelado'}`}>{c.ativo ? 'Ativo' : 'Inativo'}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {view === 'reports' && <SecaoRelatorios data={data} />}
      </section>

      {showForcaCarga && (
        <ModalForcaCarga
          data={data}
          onClose={() => setShowForcaCarga(false)}
          onExecute={async () => { await refreshData(); toast('Carga executada com sucesso!'); }}
        />
      )}

      <Toast toasts={toasts} remove={removeToast} />

      <style>{`
        @keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
      `}</style>
    </div>
  );
}