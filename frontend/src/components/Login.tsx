import { useState } from 'react';
import type { FormEvent } from 'react';
import { loginApi, salvarSessao, isLembrarMarcado } from '../services/auth';
import './Login.css';

interface LoginProps {
  onLoginSuccess: (username: string) => void;
}

export function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [manterConectado, setManterConectado] = useState(isLembrarMarcado());
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErro('Por favor, preencha o usuário e a senha.');
      return;
    }

    try {
      setCarregando(true);
      setErro(null);

      const dados = await loginApi(username.trim(), password, manterConectado);
      salvarSessao(dados.access_token, dados.username, manterConectado);
      onLoginSuccess(dados.username);
    } catch (err: unknown) {
      console.error('Falha no login:', err);
      if (err && typeof err === 'object' && 'response' in err) {
        const axErr = err as { response?: { status?: number; data?: { detail?: string } } };
        if (axErr.response?.status === 401) {
          setErro(axErr.response.data?.detail || 'Usuário ou senha incorretos.');
        } else {
          setErro('Não foi possível conectar ao servidor. Tente novamente.');
        }
      } else {
        setErro('Erro inesperado ao realizar login.');
      }
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <img src="/logo.png" alt="Logo Arthi" className="login-logo" />
          <h1 className="login-title">Estoque TI</h1>
          <p className="login-subtitle">Acesso restrito à equipe</p>
        </div>

        {erro && (
          <div className="login-error" role="alert">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>{erro}</span>
          </div>
        )}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label htmlFor="login-username">Usuário</label>
            <div className="login-input-wrapper">
              <span className="login-input-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </span>
              <input
                id="login-username"
                type="text"
                className="login-input"
                placeholder="Digite seu usuário"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
                disabled={carregando}
              />
            </div>
          </div>

          <div className="login-field">
            <label htmlFor="login-password">Senha</label>
            <div className="login-input-wrapper">
              <span className="login-input-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
              </span>
              <input
                id="login-password"
                type={mostrarSenha ? 'text' : 'password'}
                className="login-input has-toggle"
                placeholder="Digite sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={carregando}
              />
              <button
                type="button"
                className="login-toggle-password"
                onClick={() => setMostrarSenha(!mostrarSenha)}
                title={mostrarSenha ? 'Ocultar senha' : 'Exibir senha'}
                aria-label={mostrarSenha ? 'Ocultar senha' : 'Exibir senha'}
                tabIndex={-1}
              >
                {mostrarSenha ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="login-options">
            <label className="login-checkbox-label">
              <input
                type="checkbox"
                className="login-checkbox"
                checked={manterConectado}
                onChange={(e) => setManterConectado(e.target.checked)}
                disabled={carregando}
              />
              <span>Manter-me conectado</span>
            </label>
          </div>

          <button
            type="submit"
            className="login-submit-btn"
            disabled={carregando}
          >
            {carregando ? (
              <>
                <span className="login-spinner"></span>
                <span>Entrando...</span>
              </>
            ) : (
              'Entrar'
            )}
          </button>
        </form>

        <div className="login-footer">
          Departamento de TI &bull; Arthi
        </div>
      </div>
    </div>
  );
}

