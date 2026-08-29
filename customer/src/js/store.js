// Simple state management
const store = {
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  cartCount: 0,
  currentPage: 'home',
  categories: [],
};

function setUser(user, accessToken, refreshToken) {
  store.user = user;
  if (user) {
    localStorage.setItem('user', JSON.stringify(user));
    if (accessToken) localStorage.setItem('accessToken', accessToken);
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
  } else {
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }
  updateAuthUI();
}

function isLoggedIn() { return !!store.user; }
function isAdmin() { return store.user?.role === 'admin'; }

function logout() {
  setUser(null);
  store.cartCount = 0;
  updateCartBadge();
  showToast('Logged out successfully', 'info');
  navigateTo('home');
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icons = { success: 'check-circle', error: 'exclamation-circle', info: 'info-circle' };
  toast.innerHTML = `<i class="fas fa-${icons[type] || 'info-circle'}"></i> ${message}`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(100%)'; setTimeout(() => toast.remove(), 300); }, 3000);
}

function updateCartBadge() {
  document.getElementById('cart-badge').textContent = store.cartCount;
}

function updateAuthUI() {
  const authLinks = document.getElementById('auth-links');
  const userNameDisplay = document.getElementById('user-name-display');
  const dropdown = document.getElementById('user-dropdown');

  if (store.user) {
    authLinks.innerHTML = `<span>Hi, ${store.user.name.split(' ')[0]}!</span>`;
    userNameDisplay.textContent = store.user.name.split(' ')[0];
    dropdown.innerHTML = `
      <a href="#" onclick="navigateTo('profile')"><i class="fas fa-user"></i> My Profile</a>
      <a href="#" onclick="navigateTo('orders')"><i class="fas fa-box"></i> My Orders</a>
      <a href="#" onclick="navigateTo('wishlist')"><i class="fas fa-heart"></i> Wishlist</a>
      ${['seller', 'admin'].includes(store.user.role) ? '<a href="#" onclick="navigateTo(\'seller\')"><i class="fas fa-store"></i> Seller Portal</a>' : ''}
      ${store.user.role === 'admin' ? '<a href="admin/index.html" target="_blank"><i class="fas fa-cog"></i> Admin Panel</a>' : ''}
      <button onclick="logout()"><i class="fas fa-sign-out-alt"></i> Logout</button>
    `;
  } else {
    authLinks.innerHTML = `<a href="#" onclick="openModal('login-modal')">Login</a>`;
    userNameDisplay.textContent = 'Account';
    dropdown.innerHTML = `
      <a href="#" onclick="openModal('login-modal')"><i class="fas fa-sign-in-alt"></i> Sign In</a>
      <a href="#" onclick="openRegisterModal()"><i class="fas fa-user-plus"></i> Create Account</a>
    `;
  }
}

async function loadCartCount() {
  if (!isLoggedIn()) { store.cartCount = 0; updateCartBadge(); return; }
  try {
    const data = await api.cart.get();
    store.cartCount = data.count;
    updateCartBadge();
  } catch {}
}
