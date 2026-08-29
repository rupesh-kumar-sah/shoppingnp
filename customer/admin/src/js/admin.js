// Dynamic API Base URL detection for Local & Production Deployment (Netlify / Vercel / Render)
const API = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.location.port !== ''
  ? `http://${window.location.hostname}:5000/api`
  : '/api';

let adminToken = localStorage.getItem('adminToken');
let adminUser = JSON.parse(localStorage.getItem('adminUser') || 'null');

// ===== API =====
async function adminApi(endpoint, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (adminToken) headers['Authorization'] = `Bearer ${adminToken}`;
  const res = await fetch(`${API}${endpoint}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function showToast(msg, type = 'success') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 3000);
}

// ===== AUTH =====
async function adminLogin(e) {
  e.preventDefault();
  try {
    const data = await adminApi('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: document.getElementById('login-email').value,
        password: document.getElementById('login-password').value
      })
    });
    if (data.user.role !== 'admin') { showToast('Admin access only!', 'error'); return; }
    adminToken = data.accessToken;
    adminUser = data.user;
    localStorage.setItem('adminToken', adminToken);
    localStorage.setItem('adminUser', JSON.stringify(adminUser));
    showAdminPanel();
    showToast('Welcome, Admin!');
  } catch (err) { showToast(err.message, 'error'); }
}

function adminLogout() {
  adminToken = null; adminUser = null;
  localStorage.removeItem('adminToken');
  localStorage.removeItem('adminUser');
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('admin-layout').style.display = 'none';
}

function showAdminPanel() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('admin-layout').style.display = 'flex';
  document.getElementById('admin-name').textContent = adminUser?.name || 'Admin';
  document.getElementById('admin-avatar').textContent = (adminUser?.name || 'A').charAt(0);
  loadAdminPage('dashboard');
}

function toggleSidebar() { document.querySelector('.sidebar').classList.toggle('open'); }

// ===== NAVIGATION =====
function loadAdminPage(page) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navItem = document.querySelector(`[data-page="${page}"]`);
  if (navItem) navItem.classList.add('active');
  document.getElementById('page-title').textContent = page.charAt(0).toUpperCase() + page.slice(1);

  switch (page) {
    case 'dashboard': loadDashboard(); break;
    case 'products': loadProducts(); break;
    case 'orders': loadOrders(); break;
    case 'users': loadUsers(); break;
    case 'categories': loadCategories(); break;
    case 'coupons': loadCoupons(); break;
    case 'reviews': loadReviews(); break;
  }
}

// ===== DASHBOARD =====
async function loadDashboard() {
  const area = document.getElementById('content-area');
  area.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';

  try {
    const data = await adminApi('/admin/dashboard');
    const s = data.stats;

    const maxRevenue = Math.max(...data.monthlySales.map(m => m.revenue), 1);

    area.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon blue"><i class="fas fa-box"></i></div>
          <div><div class="stat-value">${s.totalProducts}</div><div class="stat-label">Total Products</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green"><i class="fas fa-shopping-bag"></i></div>
          <div><div class="stat-value">${s.totalOrders}</div><div class="stat-label">Total Orders</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon purple"><i class="fas fa-users"></i></div>
          <div><div class="stat-value">${s.totalUsers}</div><div class="stat-label">Customers</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon orange"><i class="fas fa-dollar-sign"></i></div>
          <div><div class="stat-value">$${s.totalRevenue.toFixed(0)}</div><div class="stat-label">Total Revenue</div></div>
        </div>
      </div>

      <div class="dashboard-grid">
        <div class="card">
          <div class="card-header"><h3><i class="fas fa-chart-bar" style="color:var(--primary);margin-right:8px"></i>Sales Overview</h3></div>
          <div class="card-body">
            <div class="mini-chart">
              ${data.monthlySales.map(m => `
                <div class="bar" style="height:${Math.max(10, (m.revenue / maxRevenue) * 100)}%" title="${m.month}: $${m.revenue.toFixed(0)} (${m.orders} orders)">
                </div>
              `).join('')}
              ${data.monthlySales.length === 0 ? '<div style="text-align:center;width:100%;color:var(--gray)">No data yet</div>' : ''}
            </div>
            <div style="display:flex;justify-content:space-between;font-size:0.75rem;color:var(--gray);margin-top:8px">
              ${data.monthlySales.map(m => `<span>${m.month.split('-')[1]}</span>`).join('')}
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><h3><i class="fas fa-info-circle" style="color:var(--info);margin-right:8px"></i>Order Status</h3></div>
          <div class="card-body">
            <div style="display:flex;flex-direction:column;gap:12px">
              <div style="display:flex;justify-content:space-between;align-items:center">
                <span><i class="fas fa-clock" style="color:var(--warning)"></i> Pending</span>
                <span class="badge badge-pending">${s.pendingOrders}</span>
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center">
                <span><i class="fas fa-cog" style="color:var(--info)"></i> Processing</span>
                <span class="badge badge-processing">${s.processingOrders}</span>
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center">
                <span><i class="fas fa-check-circle" style="color:var(--success)"></i> Delivered</span>
                <span class="badge badge-delivered">${s.deliveredOrders}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="card" style="margin-top:20px">
        <div class="card-header"><h3><i class="fas fa-clock" style="color:var(--primary);margin-right:8px"></i>Recent Orders</h3></div>
        <div style="overflow-x:auto">
          <table class="data-table">
            <thead><tr><th>Order ID</th><th>Customer</th><th>Amount</th><th>Status</th><th>Payment</th><th>Date</th></tr></thead>
            <tbody>
              ${data.recentOrders.map(o => `
                <tr>
                  <td><strong>#${o.id}</strong></td>
                  <td>${o.customer_name}</td>
                  <td><strong>$${o.total_amount.toFixed(2)}</strong></td>
                  <td><span class="badge badge-${o.status}">${o.status}</span></td>
                  <td><span class="badge badge-${o.payment_status}">${o.payment_status}</span></td>
                  <td>${new Date(o.created_at).toLocaleDateString()}</td>
                </tr>
              `).join('')}
              ${data.recentOrders.length === 0 ? '<tr><td colspan="6" style="text-align:center;color:var(--gray)">No orders yet</td></tr>' : ''}
            </tbody>
          </table>
        </div>
      </div>

      <div class="card" style="margin-top:20px">
        <div class="card-header"><h3><i class="fas fa-trophy" style="color:var(--warning);margin-right:8px"></i>Top Products</h3></div>
        <div style="overflow-x:auto">
          <table class="data-table">
            <thead><tr><th>Product</th><th>Price</th><th>Sold</th><th>Revenue</th></tr></thead>
            <tbody>
              ${data.topProducts.map(p => `
                <tr>
                  <td style="display:flex;align-items:center;gap:10px">
                    <img src="${p.image || 'https://via.placeholder.com/40'}" onerror="this.src='https://via.placeholder.com/40'">
                    <span>${p.name}</span>
                  </td>
                  <td>$${p.price.toFixed(2)}</td>
                  <td>${p.total_sold}</td>
                  <td><strong>$${p.total_revenue.toFixed(2)}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (err) { area.innerHTML = `<div class="loading" style="color:var(--danger)">${err.message}</div>`; }
}

// ===== PRODUCTS =====
async function loadProducts() {
  const area = document.getElementById('content-area');
  area.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
  try {
    const data = await adminApi('/admin/products?limit=50');
    area.innerHTML = `
      <div style="display:flex;justify-content:space-between;margin-bottom:20px">
        <input type="text" placeholder="Search products..." style="padding:10px 16px;border:1px solid var(--gray-lighter);border-radius:var(--radius);width:300px" onkeyup="if(event.key==='Enter')searchAdminProducts(this.value)">
        <button class="btn btn-primary" onclick="showProductModal()"><i class="fas fa-plus"></i> Add Product</button>
      </div>
      <div class="card">
        <div style="overflow-x:auto">
          <table class="data-table">
            <thead><tr><th>Image</th><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Rating</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              ${data.products.map(p => `
                <tr>
                  <td><img src="${p.image || 'https://via.placeholder.com/40'}" onerror="this.src='https://via.placeholder.com/40'"></td>
                  <td><strong>${p.name}</strong><br><small style="color:var(--gray)">${p.brand || ''}</small></td>
                  <td>${p.category_name || '-'}</td>
                  <td>$${p.price.toFixed(2)}</td>
                  <td><span style="color:${p.stock > 0 ? 'var(--success)' : 'var(--danger)'}">${p.stock}</span></td>
                  <td>⭐ ${p.rating}</td>
                  <td><span class="badge ${p.is_active ? 'badge-active' : 'badge-inactive'}">${p.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td>
                    <button class="btn btn-sm btn-outline" onclick="editProduct(${p.id})"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-danger" onclick="deleteProduct(${p.id})"><i class="fas fa-trash"></i></button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (err) { area.innerHTML = `<div class="loading" style="color:var(--danger)">${err.message}</div>`; }
}

async function searchAdminProducts(q) {
  const area = document.getElementById('content-area');
  try {
    const data = await adminApi(`/admin/products?search=${encodeURIComponent(q)}&limit=50`);
    const table = area.querySelector('tbody');
    if (table) {
      table.innerHTML = data.products.map(p => `
        <tr>
          <td><img src="${p.image || 'https://via.placeholder.com/40'}" onerror="this.src='https://via.placeholder.com/40'"></td>
          <td><strong>${p.name}</strong></td>
          <td>${p.category_name || '-'}</td>
          <td>$${p.price.toFixed(2)}</td>
          <td>${p.stock}</td>
          <td>⭐ ${p.rating}</td>
          <td><span class="badge ${p.is_active ? 'badge-active' : 'badge-inactive'}">${p.is_active ? 'Active' : 'Inactive'}</span></td>
          <td>
            <button class="btn btn-sm btn-outline" onclick="editProduct(${p.id})"><i class="fas fa-edit"></i></button>
            <button class="btn btn-sm btn-danger" onclick="deleteProduct(${p.id})"><i class="fas fa-trash"></i></button>
          </td>
        </tr>
      `).join('');
    }
  } catch {}
}

function showProductModal(product = null) {
  const existing = document.querySelector('.modal-overlay');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.className = 'modal-overlay active';
  modal.innerHTML = `
    <div class="modal">
      <h2>${product ? 'Edit Product' : 'Add New Product'}</h2>
      <form onsubmit="saveProduct(event, ${product ? product.id : 'null'})">
        <div class="form-group"><label>Name *</label><input type="text" id="m-name" value="${product?.name || ''}" required></div>
        <div class="form-row">
          <div class="form-group"><label>Price *</label><input type="number" step="0.01" id="m-price" value="${product?.price || ''}" required></div>
          <div class="form-group"><label>Compare Price</label><input type="number" step="0.01" id="m-compare" value="${product?.compare_price || ''}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Stock</label><input type="number" id="m-stock" value="${product?.stock || 0}"></div>
          <div class="form-group"><label>Brand</label><input type="text" id="m-brand" value="${product?.brand || ''}"></div>
        </div>
        <div class="form-group"><label>Category ID</label><input type="number" id="m-cat" value="${product?.category_id || ''}"></div>
        <div class="form-group"><label>Image URL</label><input type="url" id="m-image" value="${product?.image || ''}"></div>
        <div class="form-group"><label>Description</label><textarea id="m-desc" rows="3" style="width:100%;padding:10px;border:2px solid var(--gray-lightest);border-radius:var(--radius)">${product?.description || ''}</textarea></div>
        <div class="form-group"><label><input type="checkbox" id="m-featured" ${product?.is_featured ? 'checked' : ''}> Featured Product</label></div>
        <div style="display:flex;gap:10px;justify-content:flex-end">
          <button type="button" class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
          <button type="submit" class="btn btn-primary">${product ? 'Update' : 'Create'} Product</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

async function saveProduct(e, id) {
  e.preventDefault();
  const data = {
    name: document.getElementById('m-name').value,
    price: parseFloat(document.getElementById('m-price').value),
    compare_price: parseFloat(document.getElementById('m-compare').value) || null,
    stock: parseInt(document.getElementById('m-stock').value) || 0,
    brand: document.getElementById('m-brand').value || null,
    category_id: parseInt(document.getElementById('m-cat').value) || null,
    image: document.getElementById('m-image').value || null,
    description: document.getElementById('m-desc').value || '',
    is_featured: document.getElementById('m-featured').checked
  };

  try {
    if (id) {
      await adminApi(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) });
      showToast('Product updated!');
    } else {
      await adminApi('/products', { method: 'POST', body: JSON.stringify(data) });
      showToast('Product created!');
    }
    document.querySelector('.modal-overlay')?.remove();
    loadProducts();
  } catch (err) { showToast(err.message, 'error'); }
}

async function editProduct(id) {
  try {
    const data = await adminApi(`/products/${id}`);
    showProductModal(data.product);
  } catch (err) { showToast(err.message, 'error'); }
}

async function deleteProduct(id) {
  if (!confirm('Delete this product?')) return;
  try {
    await adminApi(`/products/${id}`, { method: 'DELETE' });
    showToast('Product deleted');
    loadProducts();
  } catch (err) { showToast(err.message, 'error'); }
}

// ===== ORDERS =====
async function loadOrders() {
  const area = document.getElementById('content-area');
  area.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
  try {
    const data = await adminApi('/admin/orders?limit=50');
    area.innerHTML = `
      <div class="card">
        <div style="overflow-x:auto">
          <table class="data-table">
            <thead><tr><th>ID</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Payment</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody>
              ${data.orders.map(o => `
                <tr>
                  <td><strong>#${o.id}</strong></td>
                  <td>${o.customer_name}<br><small style="color:var(--gray)">${o.customer_email}</small></td>
                  <td>${(o.items || []).length} items</td>
                  <td><strong>$${o.total_amount.toFixed(2)}</strong></td>
                  <td>
                    <select class="badge" style="border:none;cursor:pointer" onchange="updateOrderStatus(${o.id}, this.value)">
                      ${['pending','confirmed','processing','shipped','delivered','cancelled'].map(s => `<option value="${s}" ${o.status===s?'selected':''}>${s}</option>`).join('')}
                    </select>
                  </td>
                  <td>
                    <select class="badge" style="border:none;cursor:pointer" onchange="updatePaymentStatus(${o.id}, this.value)">
                      ${['unpaid','paid','refunded','failed'].map(s => `<option value="${s}" ${o.payment_status===s?'selected':''}>${s}</option>`).join('')}
                    </select>
                  </td>
                  <td>${new Date(o.created_at).toLocaleDateString()}</td>
                  <td><button class="btn btn-sm btn-outline" onclick="viewOrder(${o.id})"><i class="fas fa-eye"></i></button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (err) { area.innerHTML = `<div class="loading" style="color:var(--danger)">${err.message}</div>`; }
}

async function updateOrderStatus(id, status) {
  try {
    await adminApi(`/admin/orders/${id}`, { method: 'PUT', body: JSON.stringify({ status }) });
    showToast('Order status updated');
  } catch (err) { showToast(err.message, 'error'); }
}

async function updatePaymentStatus(id, payment_status) {
  try {
    await adminApi(`/admin/orders/${id}`, { method: 'PUT', body: JSON.stringify({ payment_status }) });
    showToast('Payment status updated');
  } catch (err) { showToast(err.message, 'error'); }
}

async function viewOrder(id) {
  try {
    const data = await adminApi(`/orders/${id}`);
    const o = data.order;
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.innerHTML = `
      <div class="modal">
        <h2>Order #${o.id}</h2>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
          <div><strong>Customer:</strong> ${o.customer_name || 'N/A'}</div>
          <div><strong>Email:</strong> ${o.customer_email || 'N/A'}</div>
          <div><strong>Status:</strong> <span class="badge badge-${o.status}">${o.status}</span></div>
          <div><strong>Payment:</strong> <span class="badge badge-${o.payment_status}">${o.payment_status}</span></div>
          <div><strong>Method:</strong> ${o.payment_method || 'N/A'}</div>
          <div><strong>Date:</strong> ${new Date(o.created_at).toLocaleString()}</div>
        </div>
        <h4 style="margin:12px 0">Shipping</h4>
        <p>${o.shipping_name}, ${o.shipping_address}, ${o.shipping_city} — ${o.shipping_phone}</p>
        <h4 style="margin:12px 0">Items</h4>
        ${(o.items||[]).map(i => `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--gray-lightest)">
          <img src="${i.image}" style="width:40px;height:40px;border-radius:6px;object-fit:cover" onerror="this.src='https://via.placeholder.com/40'">
          <div style="flex:1">${i.name}</div><div>×${i.quantity}</div><div><strong>$${i.total.toFixed(2)}</strong></div>
        </div>`).join('')}
        <div style="text-align:right;margin-top:12px;font-size:1.2rem;font-weight:700">Total: $${o.total_amount.toFixed(2)}</div>
        <button class="btn btn-outline btn-full" style="margin-top:16px" onclick="this.closest('.modal-overlay').remove()">Close</button>
      </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  } catch (err) { showToast(err.message, 'error'); }
}

// ===== USERS =====
async function loadUsers() {
  const area = document.getElementById('content-area');
  area.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
  try {
    const data = await adminApi('/admin/users?limit=50');
    area.innerHTML = `
      <div class="card">
        <div style="overflow-x:auto">
          <table class="data-table">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
            <tbody>
              ${data.users.map(u => `
                <tr>
                  <td><strong>${u.name}</strong></td>
                  <td>${u.email}</td>
                  <td><span class="badge ${u.role === 'admin' ? 'badge-processing' : u.role === 'seller' ? 'badge-confirmed' : 'badge-active'}">${u.role}</span></td>
                  <td><span class="badge ${u.is_active ? 'badge-active' : 'badge-inactive'}">${u.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td>${new Date(u.created_at).toLocaleDateString()}</td>
                  <td>
                    <select style="padding:4px 8px;border:1px solid var(--gray-lighter);border-radius:6px;font-size:0.8rem" onchange="updateUser(${u.id}, 'role', this.value)">
                      ${['customer','seller','admin'].map(r => `<option value="${r}" ${u.role===r?'selected':''}>${r}</option>`).join('')}
                    </select>
                    <button class="btn btn-sm ${u.is_active ? 'btn-danger' : 'btn-success'}" onclick="toggleUserStatus(${u.id}, ${!u.is_active})">${u.is_active ? 'Deactivate' : 'Activate'}</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (err) { area.innerHTML = `<div class="loading" style="color:var(--danger)">${err.message}</div>`; }
}

async function updateUser(id, field, value) {
  try {
    await adminApi(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify({ [field]: value }) });
    showToast('User updated');
  } catch (err) { showToast(err.message, 'error'); }
}

async function toggleUserStatus(id, active) {
  try {
    await adminApi(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify({ is_active: active }) });
    showToast('User status updated');
    loadUsers();
  } catch (err) { showToast(err.message, 'error'); }
}

// ===== CATEGORIES =====
async function loadCategories() {
  const area = document.getElementById('content-area');
  area.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
  try {
    const data = await adminApi('/categories');
    area.innerHTML = `
      <div style="margin-bottom:20px">
        <button class="btn btn-primary" onclick="showCategoryModal()"><i class="fas fa-plus"></i> Add Category</button>
      </div>
      <div class="card">
        <div style="overflow-x:auto">
          <table class="data-table">
            <thead><tr><th>Image</th><th>Name</th><th>Slug</th><th>Products</th><th>Actions</th></tr></thead>
            <tbody>
              ${data.categories.map(c => `
                <tr>
                  <td><img src="${c.image || 'https://via.placeholder.com/40'}" onerror="this.src='https://via.placeholder.com/40'"></td>
                  <td><strong>${c.name}</strong></td>
                  <td>${c.slug}</td>
                  <td>${c.product_count}</td>
                  <td>
                    <button class="btn btn-sm btn-outline" onclick="showCategoryModal(${JSON.stringify(c).replace(/"/g, '&quot;')})"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-danger" onclick="deleteCategory(${c.id})"><i class="fas fa-trash"></i></button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (err) { area.innerHTML = `<div class="loading" style="color:var(--danger)">${err.message}</div>`; }
}

function showCategoryModal(cat = null) {
  const existing = document.querySelector('.modal-overlay');
  if (existing) existing.remove();
  const modal = document.createElement('div');
  modal.className = 'modal-overlay active';
  modal.innerHTML = `
    <div class="modal">
      <h2>${cat ? 'Edit' : 'Add'} Category</h2>
      <form onsubmit="saveCategory(event, ${cat ? cat.id : 'null'})">
        <div class="form-group"><label>Name</label><input type="text" id="mc-name" value="${cat?.name || ''}" required></div>
        <div class="form-group"><label>Description</label><input type="text" id="mc-desc" value="${cat?.description || ''}"></div>
        <div class="form-group"><label>Image URL</label><input type="url" id="mc-image" value="${cat?.image || ''}"></div>
        <div style="display:flex;gap:10px;justify-content:flex-end">
          <button type="button" class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

async function saveCategory(e, id) {
  e.preventDefault();
  const data = { name: document.getElementById('mc-name').value, description: document.getElementById('mc-desc').value, image: document.getElementById('mc-image').value };
  try {
    if (id) { await adminApi(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
    else { await adminApi('/categories', { method: 'POST', body: JSON.stringify(data) }); }
    showToast('Category saved!');
    document.querySelector('.modal-overlay')?.remove();
    loadCategories();
  } catch (err) { showToast(err.message, 'error'); }
}

async function deleteCategory(id) {
  if (!confirm('Delete this category?')) return;
  try { await adminApi(`/categories/${id}`, { method: 'DELETE' }); showToast('Category deleted'); loadCategories(); }
  catch (err) { showToast(err.message, 'error'); }
}

// ===== COUPONS =====
async function loadCoupons() {
  const area = document.getElementById('content-area');
  area.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
  try {
    const data = await adminApi('/admin/coupons');
    area.innerHTML = `
      <div style="margin-bottom:20px">
        <button class="btn btn-primary" onclick="showCouponModal()"><i class="fas fa-plus"></i> Add Coupon</button>
      </div>
      <div class="card">
        <div style="overflow-x:auto">
          <table class="data-table">
            <thead><tr><th>Code</th><th>Description</th><th>Discount</th><th>Min Order</th><th>Used</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              ${data.coupons.map(c => `
                <tr>
                  <td><strong style="color:var(--primary)">${c.code}</strong></td>
                  <td>${c.description}</td>
                  <td>${c.discount_type === 'percentage' ? c.discount_value + '%' : '$' + c.discount_value}</td>
                  <td>$${c.min_order_amount}</td>
                  <td>${c.used_count}${c.max_uses ? '/' + c.max_uses : ''}</td>
                  <td><span class="badge ${c.is_active ? 'badge-active' : 'badge-inactive'}">${c.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td><button class="btn btn-sm btn-danger" onclick="deleteCoupon(${c.id})"><i class="fas fa-trash"></i></button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (err) { area.innerHTML = `<div class="loading" style="color:var(--danger)">${err.message}</div>`; }
}

function showCouponModal() {
  const existing = document.querySelector('.modal-overlay');
  if (existing) existing.remove();
  const modal = document.createElement('div');
  modal.className = 'modal-overlay active';
  modal.innerHTML = `
    <div class="modal">
      <h2>Add Coupon</h2>
      <form onsubmit="saveCoupon(event)">
        <div class="form-group"><label>Code</label><input type="text" id="mco-code" required placeholder="e.g. SUMMER25"></div>
        <div class="form-group"><label>Description</label><input type="text" id="mco-desc"></div>
        <div class="form-row">
          <div class="form-group"><label>Type</label><select id="mco-type"><option value="percentage">Percentage</option><option value="fixed">Fixed</option></select></div>
          <div class="form-group"><label>Value</label><input type="number" id="mco-value" required></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Min Order</label><input type="number" id="mco-min" value="0"></div>
          <div class="form-group"><label>Max Uses</label><input type="number" id="mco-max" placeholder="Unlimited"></div>
        </div>
        <div style="display:flex;gap:10px;justify-content:flex-end">
          <button type="button" class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
          <button type="submit" class="btn btn-primary">Create</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

async function saveCoupon(e) {
  e.preventDefault();
  try {
    await adminApi('/admin/coupons', { method: 'POST', body: JSON.stringify({
      code: document.getElementById('mco-code').value,
      description: document.getElementById('mco-desc').value,
      discount_type: document.getElementById('mco-type').value,
      discount_value: parseFloat(document.getElementById('mco-value').value),
      min_order_amount: parseFloat(document.getElementById('mco-min').value) || 0,
      max_uses: parseInt(document.getElementById('mco-max').value) || null,
    })});
    showToast('Coupon created!');
    document.querySelector('.modal-overlay')?.remove();
    loadCoupons();
  } catch (err) { showToast(err.message, 'error'); }
}

async function deleteCoupon(id) {
  if (!confirm('Delete this coupon?')) return;
  try { await adminApi(`/admin/coupons/${id}`, { method: 'DELETE' }); showToast('Coupon deleted'); loadCoupons(); }
  catch (err) { showToast(err.message, 'error'); }
}

// ===== REVIEWS =====
async function loadReviews() {
  const area = document.getElementById('content-area');
  area.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
  try {
    const data = await adminApi('/admin/reviews');
    area.innerHTML = `
      <div class="card">
        <div style="overflow-x:auto">
          <table class="data-table">
            <thead><tr><th>Product</th><th>User</th><th>Rating</th><th>Comment</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              ${data.reviews.map(r => `
                <tr>
                  <td>${r.product_name}</td>
                  <td>${r.user_name}</td>
                  <td>${'⭐'.repeat(r.rating)}</td>
                  <td style="max-width:300px">${r.title ? '<strong>' + r.title + '</strong><br>' : ''}${r.comment || '-'}</td>
                  <td><span class="badge ${r.is_approved ? 'badge-active' : 'badge-pending'}">${r.is_approved ? 'Approved' : 'Pending'}</span></td>
                  <td>
                    <button class="btn btn-sm ${r.is_approved ? 'btn-warning' : 'btn-success'}" onclick="toggleReview(${r.id}, ${!r.is_approved})">
                      ${r.is_approved ? 'Reject' : 'Approve'}
                    </button>
                  </td>
                </tr>
              `).join('')}
              ${data.reviews.length === 0 ? '<tr><td colspan="6" style="text-align:center;color:var(--gray)">No reviews</td></tr>' : ''}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (err) { area.innerHTML = `<div class="loading" style="color:var(--danger)">${err.message}</div>`; }
}

async function toggleReview(id, approved) {
  try { await adminApi(`/admin/reviews/${id}`, { method: 'PUT', body: JSON.stringify({ is_approved: approved }) }); showToast('Review updated'); loadReviews(); }
  catch (err) { showToast(err.message, 'error'); }
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  if (adminToken && adminUser) { showAdminPanel(); }
  else { document.getElementById('login-screen').style.display = 'flex'; }
});
