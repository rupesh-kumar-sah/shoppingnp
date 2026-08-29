// Dynamic API Base URL detection for Local & Production Deployment (Vercel / Render / Netlify)
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000/api'
  : (window.API_URL || 'https://your-backend-api.onrender.com/api');

async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('accessToken');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        const refreshed = await refreshToken();
        if (refreshed) return apiRequest(endpoint, options);
        logout();
      }
      throw new Error(data.error || 'Request failed');
    }
    return data;
  } catch (error) {
    if (error.message === 'Failed to fetch') {
      throw new Error('Cannot connect to server. Please verify backend service.');
    }
    throw error;
  }
}

async function refreshToken() {
  const refreshTokenStr = localStorage.getItem('refreshToken');
  if (!refreshTokenStr) return false;

  try {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refreshTokenStr })
    });
    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('accessToken', data.accessToken);
      return true;
    }
  } catch {}
  return false;
}

const api = {
  auth: {
    login: (data) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    register: (data) => apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    profile: () => apiRequest('/auth/profile'),
    updateProfile: (data) => apiRequest('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),
    changePassword: (data) => apiRequest('/auth/change-password', { method: 'PUT', body: JSON.stringify(data) }),
  },
  products: {
    getAll: (params = '') => apiRequest(`/products?${params}`),
    getOne: (id) => apiRequest(`/products/${id}`),
    addReview: (id, data) => apiRequest(`/products/${id}/reviews`, { method: 'POST', body: JSON.stringify(data) }),
  },
  categories: {
    getAll: () => apiRequest('/categories'),
  },
  cart: {
    get: () => apiRequest('/cart'),
    add: (product_id, quantity = 1) => apiRequest('/cart', { method: 'POST', body: JSON.stringify({ product_id, quantity }) }),
    update: (id, quantity) => apiRequest(`/cart/${id}`, { method: 'PUT', body: JSON.stringify({ quantity }) }),
    remove: (id) => apiRequest(`/cart/${id}`, { method: 'DELETE' }),
    clear: () => apiRequest('/cart', { method: 'DELETE' }),
  },
  orders: {
    create: (data) => apiRequest('/orders', { method: 'POST', body: JSON.stringify(data) }),
    getAll: (params = '') => apiRequest(`/orders?${params}`),
    getOne: (id) => apiRequest(`/orders/${id}`),
    cancel: (id) => apiRequest(`/orders/${id}/cancel`, { method: 'PUT' }),
  },
  wishlist: {
    get: () => apiRequest('/wishlist'),
    add: (product_id) => apiRequest('/wishlist', { method: 'POST', body: JSON.stringify({ product_id }) }),
    remove: (product_id) => apiRequest(`/wishlist/${product_id}`, { method: 'DELETE' }),
  }
};
