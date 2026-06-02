import React from 'react';
import { ShoppingCart, LogOut } from 'lucide-react';

// Estrutura visual comum depois do login: topo fixo, marca, usuário e conteúdo da tela.
export default function LayoutBase({ children, user, onLogout }) {
  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <ShoppingCart size={18} />
          <span>Vendas SAP</span>
        </div>
        <div className="user-box">
          <span className="avatar">{user.nome.slice(0, 2).toUpperCase()}</span>
          <span>{user.nome}</span>
          <button className="icon-button" onClick={onLogout} title="Sair">
            <LogOut size={16} />
          </button>
        </div>
      </header>
      {children}
    </main>
  );
}
