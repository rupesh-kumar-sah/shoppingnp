// ===== APP INITIALIZATION =====

let currentParams = '';
let authMode = 'login';

function navigateTo(page, id = null) {
  store.currentPage = page;
  window.scrollTo(0, 0);
  closeUserMenu();

  switch (page) {
    case 'home': renderHomePage(); break;
    case 'products': renderProductsPage(currentParams); break;
    case 'product': renderProductDetail(id); break;
    case 'cart': renderCartPage(); break;
    case 'checkout': renderCheckoutPage(); break;
    case 'orders': renderOrdersPage(); break;
    case 'wishlist': renderWishlistPage(); break;
    case 'profile': renderProfilePage(); break;
    case 'seller': renderSellerDashboard(); break;
    default: renderHomePage();
  }
}

function searchProducts() {
  const query = document.getElementById('search-input').value.trim();
  if (query) {
    currentParams = `search=${encodeURIComponent(query)}&limit=12`;
    navigateTo('products');
  }
}

function loadByCategory(slug) {
  currentParams = slug ? `category=${slug}&limit=12` : 'limit=12';
  navigateTo('products');
}

function loadFeaturedProducts() {
  currentParams = 'featured=true&limit=12';
  navigateTo('products');
}

function loadProductsPage(page) {
  const params = new URLSearchParams(currentParams);
  params.set('page', page);
  currentParams = params.toString();
  renderProductsPage(currentParams);
}

function applySortFilter(sort) {
  const params = new URLSearchParams(currentParams);
  params.set('sort', sort);
  params.set('page', 1);
  currentParams = params.toString();
  renderProductsPage(currentParams);
}

function applyPriceFilter() {
  const min = document.getElementById('min-price')?.value;
  const max = document.getElementById('max-price')?.value;
  const params = new URLSearchParams(currentParams);
  if (min) params.set('min_price', min); else params.delete('min_price');
  if (max) params.set('max_price', max); else params.delete('max_price');
  params.set('page', 1);
  currentParams = params.toString();
  renderProductsPage(currentParams);
}

// ===== CART ACTIONS =====
async function addToCart(productId) {
  if (!isLoggedIn()) { openModal('login-modal'); return; }
  try {
    const data = await api.cart.add(productId, 1);
    store.cartCount = data.cartCount;
    updateCartBadge();
    showToast('Added to cart!', 'success');
  } catch (err) { showToast(err.message, 'error'); }
}

async function addToCartWithQty(productId) {
  if (!isLoggedIn()) { openModal('login-modal'); return; }
  const qty = parseInt(document.getElementById('product-qty')?.value || 1);
  try {
    const data = await api.cart.add(productId, qty);
    store.cartCount = data.cartCount;
    updateCartBadge();
    showToast(`Added ${qty} item(s) to cart!`, 'success');
  } catch (err) { showToast(err.message, 'error'); }
}

async function updateCartItem(id, quantity) {
  if (quantity < 1) { removeCartItem(id); return; }
  try {
    await api.cart.update(id, quantity);
    renderCartPage();
  } catch (err) { showToast(err.message, 'error'); }
}

async function removeCartItem(id) {
  try {
    await api.cart.remove(id);
    store.cartCount = Math.max(0, store.cartCount - 1);
    updateCartBadge();
    showToast('Item removed from cart', 'info');
    renderCartPage();
  } catch (err) { showToast(err.message, 'error'); }
}

// ===== WISHLIST =====
async function toggleWishlist(productId) {
  if (!isLoggedIn()) { openModal('login-modal'); return; }
  try {
    await api.wishlist.add(productId);
    showToast('Added to wishlist!', 'success');
  } catch (err) {
    if (err.message.includes('Already')) {
      await api.wishlist.remove(productId);
      showToast('Removed from wishlist', 'info');
    } else { showToast(err.message, 'error'); }
  }
}

async function removeFromWishlist(productId) {
  try {
    await api.wishlist.remove(productId);
    showToast('Removed from wishlist', 'info');
    renderWishlistPage();
  } catch (err) { showToast(err.message, 'error'); }
}

// ===== ORDER =====
async function placeOrder() {
  const shipName = document.getElementById('ship-name')?.value;
  const shipPhone = document.getElementById('ship-phone')?.value;
  const shipCity = document.getElementById('ship-city')?.value;
  const shipAddress = document.getElementById('ship-address')?.value;
  const notes = document.getElementById('ship-notes')?.value;
  const paymentMethod = document.querySelector('input[name="payment"]:checked')?.value;

  if (!shipName || !shipPhone || !shipCity || !shipAddress) {
    showToast('Please fill in all shipping details', 'error');
    return;
  }

  try {
    const data = await api.orders.create({
      shipping_name: shipName,
      shipping_phone: shipPhone,
      shipping_city: shipCity,
      shipping_address: shipAddress,
      notes,
      payment_method: paymentMethod || 'cod'
    });

    store.cartCount = 0;
    updateCartBadge();
    showToast('Order placed successfully! 🎉', 'success');
    navigateTo('orders');
  } catch (err) { showToast(err.message, 'error'); }
}

async function cancelOrder(orderId) {
  if (!confirm('Are you sure you want to cancel this order?')) return;
  try {
    await api.orders.cancel(orderId);
    showToast('Order cancelled', 'info');
    renderOrdersPage();
  } catch (err) { showToast(err.message, 'error'); }
}

// ===== REVIEW =====
async function submitReview(productId) {
  const rating = parseInt(document.getElementById('review-rating')?.value);
  const title = document.getElementById('review-title')?.value;
  const comment = document.getElementById('review-comment')?.value;

  try {
    await api.products.addReview(productId, { rating, title, comment });
    showToast('Review submitted!', 'success');
    renderProductDetail(productId);
  } catch (err) { showToast(err.message, 'error'); }
}

// ===== PROFILE =====
async function updateProfile(e) {
  e.preventDefault();
  try {
    const data = await api.auth.updateProfile({
      name: document.getElementById('p-name').value,
      phone: document.getElementById('p-phone').value,
      city: document.getElementById('p-city').value,
      address: document.getElementById('p-address').value,
    });
    setUser({ ...store.user, ...data.user }, null, null);
    showToast('Profile updated!', 'success');
  } catch (err) { showToast(err.message, 'error'); }
}

async function changePassword(e) {
  e.preventDefault();
  try {
    await api.auth.changePassword({
      currentPassword: document.getElementById('cp-current').value,
      newPassword: document.getElementById('cp-new').value,
    });
    showToast('Password changed!', 'success');
    document.getElementById('cp-current').value = '';
    document.getElementById('cp-new').value = '';
  } catch (err) { showToast(err.message, 'error'); }
}

// ===== AUTH MODAL =====
function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

function openRegisterModal() {
  authMode = 'register';
  document.getElementById('auth-modal-title').textContent = 'Create Account';
  document.getElementById('auth-modal-subtitle').textContent = 'Join YourStore today';
  document.getElementById('name-field').style.display = 'block';
  document.getElementById('phone-field').style.display = 'block';
  document.getElementById('auth-submit-btn').textContent = 'Create Account';
  document.getElementById('auth-switch-text').textContent = 'Already have an account?';
  document.getElementById('auth-switch-link').textContent = 'Sign In';
  openModal('login-modal');
}

function toggleAuthMode(e) {
  e.preventDefault();
  if (authMode === 'login') {
    openRegisterModal();
  } else {
    authMode = 'login';
    document.getElementById('auth-modal-title').textContent = 'Welcome Back';
    document.getElementById('auth-modal-subtitle').textContent = 'Sign in to your account';
    document.getElementById('name-field').style.display = 'none';
    document.getElementById('phone-field').style.display = 'none';
    document.getElementById('auth-submit-btn').textContent = 'Sign In';
    document.getElementById('auth-switch-text').textContent = "Don't have an account?";
    document.getElementById('auth-switch-link').textContent = 'Create Account';
  }
}

async function handleAuth(e) {
  e.preventDefault();
  const email = document.getElementById('auth-email').value;
  const password = document.getElementById('auth-password').value;

  try {
    let data;
    if (authMode === 'register') {
      const name = document.getElementById('auth-name').value;
      const phone = document.getElementById('auth-phone').value;
      if (!name) { showToast('Please enter your name', 'error'); return; }
      data = await api.auth.register({ name, email, password, phone });
    } else {
      data = await api.auth.login({ email, password });
    }

    setUser(data.user, data.accessToken, data.refreshToken);
    closeModal('login-modal');
    showToast(`Welcome, ${data.user.name}!`, 'success');
    loadCartCount();

    if (store.currentPage === 'home') renderHomePage();
  } catch (err) { showToast(err.message, 'error'); }
}

function togglePassword() {
  const input = document.getElementById('auth-password');
  input.type = input.type === 'password' ? 'text' : 'password';
}

function toggleUserMenu() {
  document.getElementById('user-dropdown').classList.toggle('active');
}

function closeUserMenu() {
  document.getElementById('user-dropdown').classList.remove('active');
}

function changeQty(delta) {
  const input = document.getElementById('product-qty');
  const newVal = Math.max(1, parseInt(input.value || 1) + delta);
  input.value = Math.min(newVal, parseInt(input.max));
}

function applyCoupon() {
  const code = document.getElementById('coupon-code')?.value;
  if (code) showToast('Coupon will be applied at checkout', 'info');
  else showToast('Please enter a coupon code', 'error');
}

// Close dropdown on outside click
document.addEventListener('click', (e) => {
  if (!e.target.closest('#user-menu-btn') && !e.target.closest('#user-dropdown')) {
    closeUserMenu();
  }
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('active');
  }
});

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  updateAuthUI();
  loadCartCount();
  navigateTo('home');
});

function handleNewsletterSubmit(e) {
  e.preventDefault();
  const input = document.getElementById('newsletter-email');
  if (input && input.value) {
    showToast(`Thank you! ${input.value} subscribed for exclusive deals.`, 'success');
    input.value = '';
  }
}

function handleSearchKeyUp(e) {
  if (e.key === 'Enter') {
    searchProducts();
  }
}

window.handleNewsletterSubmit = handleNewsletterSubmit;
window.handleSearchKeyUp = handleSearchKeyUp;

