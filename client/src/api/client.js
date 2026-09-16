const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
const TOKEN_KEY = 'dcm_token';
const USER_KEY = 'dcm_user';

export function getToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function getStoredUser() {
  try {
    const raw = sessionStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSession(token, user) {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

export async function api(path, { method = 'GET', body, token } = {}) {
  const headers = { Accept: 'application/json' };
  const authToken = token ?? getToken();

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let data = null;
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (!response.ok) {
    const error = new Error(data?.message || 'Request failed.');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}
