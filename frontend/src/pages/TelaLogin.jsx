import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { login } from '../services/api.js';

export default function TelaLogin({ onLogin }) {
  const [loginValue, setLoginValue] = useState('b91_everton');
  const [password, setPassword] = useState('123456');
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    try {
      const result = await login({ login: loginValue, password });
      onLogin(result.user);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <div>
          <h1>Portal de Vendas</h1>
          <p>Pedidos, clientes e integração SAP em um só lugar.</p>
        </div>
        <label>
          Usuário
          <input
            value={loginValue}
            onChange={(event) => setLoginValue(event.target.value)}
          />
        </label>
        <label>
          Senha
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {error && (
          <div className="alert">
            <AlertCircle size={16} />
            {error}
          </div>
        )}
        <button className="primary-button" type="submit">
          Entrar
        </button>
        <div className="login-hint">
          <span>Vendedor: b91_everton / 123456</span>
          <span>Admin: admin / admin123</span>
        </div>
      </form>
    </main>
  );
}
