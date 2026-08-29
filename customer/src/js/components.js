// Reusable UI Components

function renderStars(rating) {
  let html = '';
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  for (let i = 0; i < 5; i++) {
    if (i < full) html += '<i class="fas fa-star"></i>';
    else if (i === full && half) html += '<i class="fas fa-star-half-alt"></i>';
    else html += '<i class="far fa-star"></i>';
  }
  return html;
}

function renderProductCard(product) {
  const discount = product.compare_price ? Math.round((1 - product.price / product.compare_price) * 100) : 0;
  return `
    <div class="product-card" onclick="navigateTo('product', ${product.id})">
      ${discount > 0 ? `<span class="badge">-${discount}%</span>` : ''}
      <button class="wishlist-btn" onclick="event.stopPropagation(); toggleWishlist(${product.id})" title="Add to Wishlist">
        <i class="far fa-heart"></i>
      </button>
      <div class="product-image">
        <img src="${product.image || 'https://via.placeholder.com/300x300?text=Product'}" alt="${product.name}" loading="lazy"
             onerror="this.src='https://via.placeholder.com/300x300?text=Product'">
      </div>
      <div class="product-info">
        <div class="product-category">${product.category_name || 'General'}</div>
        <h3 class="product-name">${product.name}</h3>
        <div class="product-rating">
          <span class="stars">${renderStars(product.rating)}</span>
          <span class="count">(${product.num_reviews || 0})</span>
        </div>
        <div class="product-price">
          <span class="current">$${product.price.toFixed(2)}</span>
          ${product.compare_price ? `<span class="original">$${product.compare_price.toFixed(2)}</span>` : ''}
          ${discount > 0 ? `<span class="discount">${discount}% OFF</span>` : ''}
        </div>
        <div class="product-actions">
          <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); addToCart(${product.id})">
            <i class="fas fa-shopping-cart"></i> Add to Cart
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderPagination(pagination, callback) {
  if (pagination.pages <= 1) return '';
  let html = '<div class="pagination">';
  if (pagination.page > 1) html += `<button onclick="${callback}(${pagination.page - 1})"><i class="fas fa-chevron-left"></i></button>`;
  for (let i = 1; i <= pagination.pages; i++) {
    if (i === 1 || i === pagination.pages || (i >= pagination.page - 2 && i <= pagination.page + 2)) {
      html += `<button class="${i === pagination.page ? 'active' : ''}" onclick="${callback}(${i})">${i}</button>`;
    } else if (i === pagination.page - 3 || i === pagination.page + 3) {
      html += `<button disabled>...</button>`;
    }
  }
  if (pagination.page < pagination.pages) html += `<button onclick="${callback}(${pagination.page + 1})"><i class="fas fa-chevron-right"></i></button>`;
  html += '</div>';
  return html;
}

function renderLoading() {
  return '<div class="loading"><div class="spinner"></div></div>';
}

function renderEmptyState(icon, title, message, buttonText, buttonAction) {
  return `
    <div class="empty-state">
      <i class="fas fa-${icon}"></i>
      <h3>${title}</h3>
      <p>${message}</p>
      ${buttonText ? `<button class="btn btn-primary" onclick="${buttonAction}">${buttonText}</button>` : ''}
    </div>
  `;
}

function getStatusClass(status) {
  const classes = { pending: 'status-pending', confirmed: 'status-confirmed', processing: 'status-processing', shipped: 'status-shipped', delivered: 'status-delivered', cancelled: 'status-cancelled', paid: 'status-paid', unpaid: 'status-unpaid', refunded: 'status-cancelled' };
  return classes[status] || 'status-pending';
}
