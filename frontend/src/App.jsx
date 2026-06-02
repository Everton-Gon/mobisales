import React, { useState } from 'react';
import TelaLogin from './pages/TelaLogin.jsx';
import LayoutBase from './components/LayoutBase.jsx';
import DashboardVendedor from './pages/DashboardVendedor.jsx';
import DashboardAdmin from './pages/DashboardAdmin.jsx';

function App() {
  const [user, setUser] = useState(null);

  // Enquanto não existe usuário autenticado, a única tela disponível é o login.
  if (!user) {
    return <TelaLogin onLogin={setUser} />;
  }

  // Depois do login, o perfil define qual visão será carregada.
  // A visão admin existe, mas as evoluções recentes estão focadas no representante.
  return (
    <LayoutBase user={user} onLogout={() => setUser(null)}>
      {user.perfil === 'admin' ? (
        <DashboardAdmin />
      ) : (
        <DashboardVendedor user={user} />
      )}
    </LayoutBase>
  );
}

export default App;
