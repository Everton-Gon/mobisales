import React from 'react';

export const statusLabels = {
  RASCUNHO: 'Rascunho',
  PENDENTE_TXT: 'Pendente',
  TXT_GERADO: 'Gerado',
  ENVIADO_SAP: 'Enviado SAP',
  IMPORTADO: 'Importado',
  ERRO_SAP: 'Erro SAP',
  CANCELADO: 'Cancelado'
};

export default function BadgeStatus({ status }) {
  const label = statusLabels[status] ?? status;
  return (
    <span className={`status status-${status.toLowerCase()}`}>
      {label}
    </span>
  );
}
