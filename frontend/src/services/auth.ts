import axios from 'axios';

const TOKEN_KEY = 'estoque_ti_token';
const USER_KEY = 'estoque_ti_user';
const REMEMBER_KEY = 'estoque_ti_remember';

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in_days: number;
  username: string;
}

export interface UsuarioInfo {
  username: string;
  autenticado: boolean;
}

export function obterToken(): string | null {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}

export function obterUsuario(): string | null {
  return localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
}

export function salvarSessao(token: string, username: string, manterConectado: boolean) {
  // Limpa qualquer dado anterior
  limparSessao();

  if (manterConectado) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, username);
    localStorage.setItem(REMEMBER_KEY, 'true');
  } else {
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(USER_KEY, username);
    localStorage.removeItem(REMEMBER_KEY);
  }
}

export function limparSessao() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(REMEMBER_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

export function isLembrarMarcado(): boolean {
  return localStorage.getItem(REMEMBER_KEY) === 'true';
}

// Configura interceptors no axios para anexar token e capturar 401
let interceptorConfigurado = false;

export function configurarAuthInterceptor(onUnauthorized: () => void) {
  if (interceptorConfigurado) return;
  interceptorConfigurado = true;

  axios.interceptors.request.use(
    (config) => {
      const token = obterToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response && error.response.status === 401) {
        // Ignora 401 do próprio endpoint de login
        const url = error.config?.url || '';
        if (!url.includes('/api/auth/login')) {
          limparSessao();
          onUnauthorized();
        }
      }
      return Promise.reject(error);
    }
  );
}

export async function loginApi(username: string, password: string, manterConectado: boolean): Promise<LoginResponse> {
  const resposta = await axios.post<LoginResponse>('/api/auth/login', {
    username,
    password,
    manter_conectado: manterConectado,
  });

  return resposta.data;
}

export async function verificarSessaoApi(): Promise<UsuarioInfo> {
  const resposta = await axios.get<UsuarioInfo>('/api/auth/me');
  return resposta.data;
}

