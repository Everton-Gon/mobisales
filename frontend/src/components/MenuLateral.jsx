import React from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';

// Menu usado pela visão do representante.
// No desktop ele pode ser recolhido; no celular ele abre como menu hambúrguer/off-canvas.
export default function MenuLateral({ active, items, onViewChange, collapsed = false, onToggleCollapsed, mobileOpen = false, onCloseMobile }) {
  return (
    <aside className={`${collapsed ? 'sidebar sidebar-collapsed' : 'sidebar'} ${mobileOpen ? 'sidebar-mobile-open' : ''}`}>
      {onToggleCollapsed && (
        <button
          className="sidebar-toggle"
          onClick={onToggleCollapsed}
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          type="button"
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          <span>Menu</span>
        </button>
      )}

      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            className={active === item.key ? 'nav-item active' : 'nav-item'}
            key={item.key}
            onClick={() => {
              onViewChange && onViewChange(item.key);
              onCloseMobile && onCloseMobile();
            }}
            title={collapsed ? item.label : undefined}
          >
            <Icon size={16} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </aside>
  );
}
