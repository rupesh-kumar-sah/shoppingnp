// ===== PAGE RENDERERS =====

async function renderHomePage() {
  const main = document.getElementById('main-content');
  main.innerHTML = renderLoading();

  try {
    const [productsData, categoriesData, featuredData] = await Promise.all([
      api.products.getAll('limit=8&sort=newest'),
      api.categories.getAll(),
      api.products.getAll('featured=true&limit=8')
    ]);

    store.categories = categoriesData.categories;

    main.innerHTML = `
      <!-- Hero -->
      <section class="hero">
        <div class="container">
          <div class="hero-content">
            <div class="hero-text">
              <span class="hero-badge">🔥 Up to 50% Off This Season</span>
              <h1>Best Quality<br><span>Best Price</span></h1>
              <p>Discover premium products at unbeatable prices. From electronics to fashion, we've got everything you need.</p>
              <div class="hero-actions">
                <button class="btn btn-accent" onclick="navigateTo('products')"><i class="fas fa-shopping-bag"></i> Shop Now</button>
                <button class="btn btn-secondary" onclick="loadFeaturedProducts()" style="border-color:rgba(255,255,255,0.3);color:white"><i class="fas fa-fire"></i> Hot Deals</button>
              </div>
              <div class="hero-stats">
                <div class="hero-stat"><div class="num">10K+</div><div class="label">Products</div></div>
                <div class="hero-stat"><div class="num">50K+</div><div class="label">Customers</div></div>
                <div class="hero-stat"><div class="num">100+</div><div class="label">Brands</div></div>
              </div>
            </div>
            <div class="hero-image">
              <img src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=450&h=450&fit=crop" alt="Featured Product">
            </div>
          </div>
        </div>
      </section>

      <!-- Features -->
      <section class="features-bar">
        <div class="container">
          <div class="features-grid">
            <div class="feature-item">
              <div class="feature-icon"><i class="fas fa-truck"></i></div>
              <div><h4>Free Shipping</h4><p>On orders over $50</p></div>
            </div>
            <div class="feature-item">
              <div class="feature-icon"><i class="fas fa-shield-alt"></i></div>
              <div><h4>Secure Payment</h4><p>100% protected</p></div>
            </div>
            <div class="feature-item">
              <div class="feature-icon"><i class="fas fa-undo"></i></div>
              <div><h4>Easy Returns</h4><p>30-day returns</p></div>
            </div>
            <div class="feature-item">
              <div class="feature-icon"><i class="fas fa-headset"></i></div>
              <div><h4>24/7 Support</h4><p>Dedicated help</p></div>
            </div>
          </div>
        </div>
      </section>

      <!-- Categories -->
      <section class="section">
        <div class="container">
          <div class="section-header">
            <h2><i class="fas fa-th-large" style="color:var(--primary);margin-right:8px"></i> Popular Categories</h2>
          </div>
          <div class="categories-grid">
            ${categoriesData.categories.map(cat => `
              <div class="category-card" onclick="loadByCategory('${cat.slug}')">
                <img src="${cat.image || 'https://via.placeholder.com/80'}" alt="${cat.name}"
                     onerror="this.src='https://via.placeholder.com/80?text=${cat.name}'">
                <h4>${cat.name}</h4>
                <div class="count">${cat.product_count} products</div>
              </div>
            `).join('')}
          </div>
        </div>
      </section>

      <!-- Featured Products -->
      ${featuredData.products.length > 0 ? `
      <section class="section" style="background:var(--primary-bg)">
        <div class="container">
          <div class="section-header">
            <h2><i class="fas fa-fire" style="color:var(--danger);margin-right:8px"></i> Hot Deals & Featured</h2>
            <a href="#" onclick="loadFeaturedProducts()">View All <i class="fas fa-arrow-right"></i></a>
          </div>
          <div class="products-grid">
            ${featuredData.products.map(p => renderProductCard(p)).join('')}
          </div>
        </div>
      </section>
      ` : ''}

      <!-- Latest Products -->
      <section class="section">
        <div class="container">
          <div class="section-header">
            <h2><i class="fas fa-clock" style="color:var(--info);margin-right:8px"></i> Latest Arrivals</h2>
            <a href="#" onclick="navigateTo('products')">View All <i class="fas fa-arrow-right"></i></a>
          </div>
          <div class="products-grid">
            ${productsData.products.map(p => renderProductCard(p)).join('')}
          </div>
        </div>
      </section>

      <!-- CTA Banner -->
      <section class="section" style="background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%); padding: 60px 0;">
        <div class="container" style="text-align:center; color:white;">
          <h2 style="font-size:2rem; margin-bottom:12px;">Ready to Start Shopping?</h2>
          <p style="opacity:0.8; margin-bottom:24px; font-size:1.1rem;">Join thousands of happy customers today.</p>
          <button class="btn btn-accent" onclick="navigateTo('products')"><i class="fas fa-shopping-bag"></i> Browse Products</button>
        </div>
      </section>
    `;
  } catch (err) {
    main.innerHTML = `<div class="container section"><div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Unable to Load</h3><p>${err.message}</p><button class="btn btn-primary" onclick="renderHomePage()">Try Again</button></div></div>`;
  }
}

async function renderProductsPage(params = '') {
  const main = document.getElementById('main-content');
  main.innerHTML = renderLoading();

  try {
    const [productsData, categoriesData] = await Promise.all([
      api.products.getAll(params || 'limit=12'),
      api.categories.getAll()
    ]);

    const urlParams = new URLSearchParams(params);
    const currentCategory = urlParams.get('category');
    const currentSort = urlParams.get('sort') || '';
    const currentSearch = urlParams.get('search') || '';

    main.innerHTML = `
      <div class="products-page">
        <div class="container">
          <div class="breadcrumb">
            <a href="#" onclick="navigateTo('home')">Home</a>
            <span>/</span>
            <span>${currentCategory ? categoriesData.categories.find(c => c.slug === currentCategory)?.name || 'Products' : currentSearch ? `Search: "${currentSearch}"` : 'All Products'}</span>
          </div>
          <div class="products-layout">
            <aside class="filters-sidebar">
              <h3 style="margin-bottom:20px">Filters</h3>
              <div class="filter-group">
                <h4>Categories</h4>
                <label onclick="loadByCategory('')" style="cursor:pointer"><input type="radio" name="cat" ${!currentCategory ? 'checked' : ''}> All Categories</label>
                ${categoriesData.categories.map(c => `
                  <label onclick="loadByCategory('${c.slug}')" style="cursor:pointer"><input type="radio" name="cat" ${currentCategory === c.slug ? 'checked' : ''}> ${c.name} (${c.product_count})</label>
                `).join('')}
              </div>
              <div class="filter-group">
                <h4>Price Range</h4>
                <div class="price-range">
                  <input type="number" id="min-price" placeholder="Min" value="${urlParams.get('min_price') || ''}">
                  <span>—</span>
                  <input type="number" id="max-price" placeholder="Max" value="${urlParams.get('max_price') || ''}">
                </div>
                <button class="btn btn-sm btn-outline" style="margin-top:10px;width:100%" onclick="applyPriceFilter()">Apply</button>
              </div>
            </aside>
            <div>
              <div class="products-header">
                <h2>${productsData.pagination.total} Products Found</h2>
                <select class="sort-select" onchange="applySortFilter(this.value)">
                  <option value="newest" ${currentSort === 'newest' ? 'selected' : ''}>Newest First</option>
                  <option value="price_asc" ${currentSort === 'price_asc' ? 'selected' : ''}>Price: Low to High</option>
                  <option value="price_desc" ${currentSort === 'price_desc' ? 'selected' : ''}>Price: High to Low</option>
                  <option value="rating" ${currentSort === 'rating' ? 'selected' : ''}>Top Rated</option>
                  <option value="popular" ${currentSort === 'popular' ? 'selected' : ''}>Most Popular</option>
                  <option value="name" ${currentSort === 'name' ? 'selected' : ''}>Name: A-Z</option>
                </select>
              </div>
              ${productsData.products.length > 0 ?
                `<div class="products-grid">${productsData.products.map(p => renderProductCard(p)).join('')}</div>
                 ${renderPagination(productsData.pagination, 'loadProductsPage')}` :
                renderEmptyState('search', 'No Products Found', 'Try adjusting your filters or search terms.', 'View All Products', "navigateTo('products')")
              }
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    main.innerHTML = `<div class="container section">${renderEmptyState('exclamation-triangle', 'Error', err.message, 'Try Again', "navigateTo('products')")}</div>`;
  }
}

async function renderProductDetail(productId) {
  const main = document.getElementById('main-content');
  main.innerHTML = renderLoading();

  try {
    const data = await api.products.getOne(productId);
    const { product, reviews, related } = data;
    const discount = product.compare_price ? Math.round((1 - product.price / product.compare_price) * 100) : 0;

    main.innerHTML = `
      <div class="product-detail">
        <div class="container">
          <div class="breadcrumb">
            <a href="#" onclick="navigateTo('home')">Home</a><span>/</span>
            <a href="#" onclick="loadByCategory('${product.category_slug}')">${product.category_name || 'Products'}</a><span>/</span>
            <span>${product.name}</span>
          </div>
          <div class="product-detail-grid">
            <div class="product-gallery">
              <img class="main-image" src="${product.image || 'https://via.placeholder.com/500'}" alt="${product.name}"
                   onerror="this.src='https://via.placeholder.com/500?text=Product'">
            </div>
            <div class="product-detail-info">
              <div class="product-category" style="margin-bottom:8px">${product.category_name || 'General'}</div>
              <h1>${product.name}</h1>
              <div class="detail-rating">
                <span class="stars" style="color:var(--accent)">${renderStars(product.rating)}</span>
                <span style="color:var(--gray)">${product.rating} (${product.num_reviews} reviews)</span>
              </div>
              ${product.brand ? `<p style="color:var(--gray)">Brand: <strong>${product.brand}</strong></p>` : ''}
              <div class="detail-price">
                <span class="current">$${product.price.toFixed(2)}</span>
                ${product.compare_price ? `<span class="original">$${product.compare_price.toFixed(2)}</span>` : ''}
                ${discount > 0 ? `<span class="save">Save ${discount}%</span>` : ''}
              </div>
              <div class="detail-meta">
                <div class="detail-meta-row"><span class="label">Availability</span><span class="value" style="color:${product.stock > 0 ? 'var(--success)' : 'var(--danger)'}">${product.stock > 0 ? `In Stock (${product.stock})` : 'Out of Stock'}</span></div>
                ${product.sku ? `<div class="detail-meta-row"><span class="label">SKU</span><span class="value">${product.sku}</span></div>` : ''}
              </div>
              ${product.stock > 0 ? `
                <div class="quantity-selector">
                  <button onclick="changeQty(-1)">−</button>
                  <input type="number" id="product-qty" value="1" min="1" max="${product.stock}">
                  <button onclick="changeQty(1)">+</button>
                </div>
                <div class="detail-actions">
                  <button class="btn btn-primary" onclick="addToCartWithQty(${product.id})"><i class="fas fa-shopping-cart"></i> Add to Cart</button>
                  <button class="btn btn-outline" onclick="toggleWishlist(${product.id})"><i class="far fa-heart"></i> Wishlist</button>
                </div>
              ` : `<p style="color:var(--danger);font-weight:600;margin-top:20px"><i class="fas fa-times-circle"></i> Currently Out of Stock</p>`}
              <div class="detail-description">
                <h3>Description</h3>
                <p>${product.description || 'No description available.'}</p>
              </div>
            </div>
          </div>

          <!-- Reviews -->
          <div class="reviews-section">
            <h2 style="margin-bottom:20px"><i class="fas fa-star" style="color:var(--accent)"></i> Customer Reviews (${reviews.length})</h2>
            ${isLoggedIn() ? `
              <div style="background:var(--light);padding:20px;border-radius:var(--radius-lg);margin-bottom:24px">
                <h4 style="margin-bottom:12px">Write a Review</h4>
                <div class="form-group">
                  <label>Rating</label>
                  <select id="review-rating" style="padding:8px 12px;border:1px solid var(--gray-lighter);border-radius:var(--radius-sm)">
                    <option value="5">⭐⭐⭐⭐⭐ Excellent</option>
                    <option value="4">⭐⭐⭐⭐ Good</option>
                    <option value="3">⭐⭐⭐ Average</option>
                    <option value="2">⭐⭐ Poor</option>
                    <option value="1">⭐ Terrible</option>
                  </select>
                </div>
                <div class="form-group"><label>Title</label><input type="text" id="review-title" placeholder="Review title"></div>
                <div class="form-group"><label>Comment</label><textarea id="review-comment" rows="3" placeholder="Share your experience..." style="width:100%;padding:10px;border:1px solid var(--gray-lighter);border-radius:var(--radius-sm);resize:vertical"></textarea></div>
                <button class="btn btn-primary btn-sm" onclick="submitReview(${product.id})">Submit Review</button>
              </div>
            ` : '<p style="margin-bottom:20px;color:var(--gray)"><a href="#" onclick="openModal(\'login-modal\')" style="color:var(--primary);font-weight:600">Sign in</a> to write a review.</p>'}
            ${reviews.length > 0 ? reviews.map(r => `
              <div class="review-card">
                <div class="review-header">
                  <span class="review-author"><i class="fas fa-user-circle" style="color:var(--gray-light);margin-right:6px"></i> ${r.user_name}</span>
                  <span class="review-date">${new Date(r.created_at).toLocaleDateString()}</span>
                </div>
                <div class="stars" style="color:var(--accent)">${renderStars(r.rating)}</div>
                ${r.title ? `<div class="review-title">${r.title}</div>` : ''}
                <p class="review-text">${r.comment}</p>
              </div>
            `).join('') : '<p style="color:var(--gray)">No reviews yet. Be the first to review!</p>'}
          </div>

          <!-- Related -->
          ${related.length > 0 ? `
            <div class="section">
              <div class="section-header"><h2>Related Products</h2></div>
              <div class="products-grid">${related.map(p => renderProductCard(p)).join('')}</div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  } catch (err) {
    main.innerHTML = `<div class="container section">${renderEmptyState('exclamation-triangle', 'Product Not Found', err.message, 'Browse Products', "navigateTo('products')")}</div>`;
  }
}

async function renderCartPage() {
  const main = document.getElementById('main-content');
  if (!isLoggedIn()) { openModal('login-modal'); navigateTo('home'); return; }
  main.innerHTML = renderLoading();

  try {
    const data = await api.cart.get();
    if (data.items.length === 0) {
      main.innerHTML = `<div class="cart-page"><div class="container">${renderEmptyState('shopping-cart', 'Your Cart is Empty', 'Add some products to your cart.', 'Continue Shopping', "navigateTo('products')")}</div></div>`;
      return;
    }

    const subtotal = data.total;
    const shipping = subtotal > 50 ? 0 : 5.99;
    const tax = Math.round(subtotal * 0.1 * 100) / 100;
    const total = Math.round((subtotal + shipping + tax) * 100) / 100;

    main.innerHTML = `
      <div class="cart-page">
        <div class="container">
          <h1 style="margin-bottom:24px"><i class="fas fa-shopping-cart" style="color:var(--primary)"></i> Shopping Cart (${data.count})</h1>
          <div class="cart-grid">
            <div class="cart-items">
              ${data.items.map(item => `
                <div class="cart-item">
                  <div class="cart-item-image" onclick="navigateTo('product', ${item.product_id})" style="cursor:pointer">
                    <img src="${item.image || 'https://via.placeholder.com/120'}" alt="${item.name}"
                         onerror="this.src='https://via.placeholder.com/120?text=Product'">
                  </div>
                  <div class="cart-item-info">
                    <h3 onclick="navigateTo('product', ${item.product_id})" style="cursor:pointer">${item.name}</h3>
                    <div class="category">${item.category_name || ''}</div>
                    <div class="price">$${item.price.toFixed(2)}</div>
                    <div class="cart-item-actions">
                      <div class="quantity-selector">
                        <button onclick="updateCartItem(${item.id}, ${item.quantity - 1})">−</button>
                        <input type="number" value="${item.quantity}" min="1" max="${item.stock}" onchange="updateCartItem(${item.id}, parseInt(this.value))">
                        <button onclick="updateCartItem(${item.id}, ${item.quantity + 1})">+</button>
                      </div>
                      <span style="font-weight:700;color:var(--dark)">$${(item.price * item.quantity).toFixed(2)}</span>
                      <button class="btn btn-sm btn-outline" style="color:var(--danger);border-color:var(--danger)" onclick="removeCartItem(${item.id})"><i class="fas fa-trash"></i></button>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
            <div class="cart-summary">
              <h3>Order Summary</h3>
              <div class="summary-row"><span>Subtotal</span><span>$${subtotal.toFixed(2)}</span></div>
              <div class="summary-row"><span>Shipping</span><span>${shipping === 0 ? '<span style="color:var(--success)">FREE</span>' : '$' + shipping.toFixed(2)}</span></div>
              <div class="summary-row"><span>Tax (10%)</span><span>$${tax.toFixed(2)}</span></div>
              <div class="coupon-input">
                <input type="text" id="coupon-code" placeholder="Coupon code">
                <button class="btn btn-sm btn-outline" onclick="applyCoupon()">Apply</button>
              </div>
              <div class="summary-row total"><span>Total</span><span>$${total.toFixed(2)}</span></div>
              <button class="btn btn-primary btn-full" style="margin-top:16px" onclick="navigateTo('checkout')"><i class="fas fa-lock"></i> Proceed to Checkout</button>
              <button class="btn btn-outline btn-full" style="margin-top:8px" onclick="navigateTo('products')">Continue Shopping</button>
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    main.innerHTML = `<div class="container section">${renderEmptyState('exclamation-triangle', 'Error', err.message, 'Try Again', "renderCartPage()")}</div>`;
  }
}

async function renderCheckoutPage() {
  const main = document.getElementById('main-content');
  if (!isLoggedIn()) { openModal('login-modal'); return; }
  main.innerHTML = renderLoading();

  try {
    const cartData = await api.cart.get();
    if (cartData.items.length === 0) { navigateTo('cart'); return; }

    const subtotal = cartData.total;
    const shipping = subtotal > 50 ? 0 : 5.99;
    const tax = Math.round(subtotal * 0.1 * 100) / 100;
    const total = Math.round((subtotal + shipping + tax) * 100) / 100;

    main.innerHTML = `
      <div class="checkout-page">
        <div class="container">
          <h1 style="margin-bottom:24px"><i class="fas fa-lock" style="color:var(--primary)"></i> Checkout</h1>
          <div class="checkout-grid">
            <div class="checkout-form">
              <h3 style="margin-bottom:20px">Shipping Information</h3>
              <div class="form-group"><label>Full Name *</label><input type="text" id="ship-name" value="${store.user?.name || ''}" required></div>
              <div class="form-row">
                <div class="form-group"><label>Phone Number *</label><input type="tel" id="ship-phone" placeholder="Enter phone" required></div>
                <div class="form-group"><label>City *</label><input type="text" id="ship-city" placeholder="City" required></div>
              </div>
              <div class="form-group"><label>Full Address *</label><textarea id="ship-address" rows="3" placeholder="Street, Area, Landmark..." style="width:100%;padding:10px;border:2px solid var(--gray-lightest);border-radius:var(--radius-sm);resize:vertical" required></textarea></div>
              <div class="form-group"><label>Order Notes (Optional)</label><input type="text" id="ship-notes" placeholder="Any special instructions?"></div>

              <h3 style="margin:24px 0 16px">Payment Method</h3>
              <div style="display:flex;flex-direction:column;gap:10px">
                <label style="display:flex;align-items:center;gap:10px;padding:14px;border:2px solid var(--gray-lightest);border-radius:var(--radius);cursor:pointer;transition:var(--transition)">
                  <input type="radio" name="payment" value="cod" checked style="accent-color:var(--primary)">
                  <i class="fas fa-money-bill-wave" style="color:var(--success);font-size:1.2rem"></i>
                  <div><strong>Cash on Delivery</strong><br><small style="color:var(--gray)">Pay when you receive your order</small></div>
                </label>
                <label style="display:flex;align-items:center;gap:10px;padding:14px;border:2px solid var(--gray-lightest);border-radius:var(--radius);cursor:pointer;transition:var(--transition)">
                  <input type="radio" name="payment" value="esewa" style="accent-color:var(--primary)">
                  <i class="fas fa-wallet" style="color:var(--success);font-size:1.2rem"></i>
                  <div><strong>eSewa</strong><br><small style="color:var(--gray)">Pay via eSewa digital wallet</small></div>
                </label>
                <label style="display:flex;align-items:center;gap:10px;padding:14px;border:2px solid var(--gray-lightest);border-radius:var(--radius);cursor:pointer;transition:var(--transition)">
                  <input type="radio" name="payment" value="khalti" style="accent-color:var(--primary)">
                  <i class="fas fa-credit-card" style="color:var(--secondary);font-size:1.2rem"></i>
                  <div><strong>Khalti</strong><br><small style="color:var(--gray)">Pay via Khalti digital wallet</small></div>
                </label>
              </div>

              <button class="btn btn-primary btn-full" style="margin-top:24px;padding:14px" onclick="placeOrder()">
                <i class="fas fa-check-circle"></i> Place Order — $${total.toFixed(2)}
              </button>
            </div>
            <div class="cart-summary">
              <h3>Order Summary (${cartData.count} items)</h3>
              ${cartData.items.map(item => `
                <div style="display:flex;gap:10px;padding:10px 0;border-bottom:1px solid var(--gray-lightest)">
                  <img src="${item.image}" style="width:50px;height:50px;border-radius:var(--radius-sm);object-fit:cover" onerror="this.src='https://via.placeholder.com/50'">
                  <div style="flex:1"><div style="font-size:0.85rem;font-weight:600">${item.name}</div><div style="font-size:0.8rem;color:var(--gray)">Qty: ${item.quantity}</div></div>
                  <span style="font-weight:600">$${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              `).join('')}
              <div class="summary-row" style="margin-top:12px"><span>Subtotal</span><span>$${subtotal.toFixed(2)}</span></div>
              <div class="summary-row"><span>Shipping</span><span>${shipping === 0 ? 'FREE' : '$' + shipping.toFixed(2)}</span></div>
              <div class="summary-row"><span>Tax</span><span>$${tax.toFixed(2)}</span></div>
              <div class="summary-row total"><span>Total</span><span>$${total.toFixed(2)}</span></div>
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    main.innerHTML = `<div class="container section">${renderEmptyState('exclamation-triangle', 'Error', err.message, 'Go to Cart', "navigateTo('cart')")}</div>`;
  }
}

async function renderOrdersPage() {
  const main = document.getElementById('main-content');
  if (!isLoggedIn()) { openModal('login-modal'); navigateTo('home'); return; }
  main.innerHTML = renderLoading();

  try {
    const data = await api.orders.getAll();

    if (data.orders.length === 0) {
      main.innerHTML = `<div class="orders-page"><div class="container">${renderEmptyState('box', 'No Orders Yet', 'Start shopping and your orders will appear here.', 'Shop Now', "navigateTo('products')")}</div></div>`;
      return;
    }

    main.innerHTML = `
      <div class="orders-page">
        <div class="container">
          <h1 style="margin-bottom:24px"><i class="fas fa-box" style="color:var(--primary)"></i> My Orders</h1>
          ${data.orders.map(order => `
            <div class="order-card">
              <div class="order-header">
                <div>
                  <span class="order-id">Order #${order.id}</span>
                  <span class="order-date"> — ${new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                <div style="display:flex;gap:8px;align-items:center">
                  <span class="status-badge ${getStatusClass(order.status)}">${order.status}</span>
                  <span class="status-badge ${getStatusClass(order.payment_status)}">${order.payment_status}</span>
                </div>
              </div>
              <div class="order-items-list">
                ${(order.items || []).map(item => `
                  <div class="order-item-row">
                    <img src="${item.image || 'https://via.placeholder.com/50'}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/50'">
                    <div style="flex:1">
                      <div style="font-weight:600">${item.name}</div>
                      <div style="font-size:0.82rem;color:var(--gray)">Qty: ${item.quantity} × $${item.price.toFixed(2)}</div>
                    </div>
                    <span style="font-weight:600">$${item.total.toFixed(2)}</span>
                  </div>
                `).join('')}
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;padding-top:12px;border-top:1px solid var(--gray-lightest)">
                <span style="font-weight:700;font-size:1.1rem">Total: $${order.total_amount.toFixed(2)}</span>
                <div style="display:flex;gap:8px">
                  ${['pending', 'confirmed'].includes(order.status) ? `<button class="btn btn-sm btn-danger" onclick="cancelOrder(${order.id})"><i class="fas fa-times"></i> Cancel</button>` : ''}
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } catch (err) {
    main.innerHTML = `<div class="container section">${renderEmptyState('exclamation-triangle', 'Error', err.message, 'Try Again', "renderOrdersPage()")}</div>`;
  }
}

async function renderWishlistPage() {
  const main = document.getElementById('main-content');
  if (!isLoggedIn()) { openModal('login-modal'); navigateTo('home'); return; }
  main.innerHTML = renderLoading();

  try {
    const data = await api.wishlist.get();
    if (data.items.length === 0) {
      main.innerHTML = `<div class="wishlist-page"><div class="container">${renderEmptyState('heart', 'Your Wishlist is Empty', 'Save products you love for later.', 'Browse Products', "navigateTo('products')")}</div></div>`;
      return;
    }

    main.innerHTML = `
      <div class="wishlist-page">
        <div class="container">
          <h1 style="margin-bottom:24px"><i class="fas fa-heart" style="color:var(--danger)"></i> My Wishlist (${data.items.length})</h1>
          <div class="products-grid">
            ${data.items.map(item => `
              <div class="product-card" onclick="navigateTo('product', ${item.product_id})">
                <button class="wishlist-btn active" onclick="event.stopPropagation(); removeFromWishlist(${item.product_id})" title="Remove"><i class="fas fa-heart" style="color:var(--danger)"></i></button>
                <div class="product-image"><img src="${item.image || 'https://via.placeholder.com/300'}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/300?text=Product'"></div>
                <div class="product-info">
                  <div class="product-category">${item.category_name || ''}</div>
                  <h3 class="product-name">${item.name}</h3>
                  <div class="product-rating"><span class="stars">${renderStars(item.rating)}</span></div>
                  <div class="product-price"><span class="current">$${item.price.toFixed(2)}</span>${item.compare_price ? `<span class="original">$${item.compare_price.toFixed(2)}</span>` : ''}</div>
                  <div class="product-actions">
                    <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); addToCart(${item.product_id})"><i class="fas fa-shopping-cart"></i> Add to Cart</button>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    main.innerHTML = `<div class="container section">${renderEmptyState('exclamation-triangle', 'Error', err.message, 'Try Again', "renderWishlistPage()")}</div>`;
  }
}

async function renderProfilePage() {
  const main = document.getElementById('main-content');
  if (!isLoggedIn()) { openModal('login-modal'); navigateTo('home'); return; }
  main.innerHTML = renderLoading();

  try {
    const data = await api.auth.profile();
    const user = data.user;

    main.innerHTML = `
      <div class="profile-page">
        <div class="container">
          <div class="profile-grid">
            <div class="profile-sidebar">
              <div class="avatar">${user.name.charAt(0).toUpperCase()}</div>
              <h3>${user.name}</h3>
              <p class="email">${user.email}</p>
              <div class="profile-nav">
                <a href="#" class="active" onclick="navigateTo('profile')"><i class="fas fa-user"></i> Profile</a>
                <a href="#" onclick="navigateTo('orders')"><i class="fas fa-box"></i> Orders</a>
                <a href="#" onclick="navigateTo('wishlist')"><i class="fas fa-heart"></i> Wishlist</a>
              </div>
            </div>
            <div class="profile-content">
              <h2 style="margin-bottom:24px">Account Details</h2>
              <form onsubmit="updateProfile(event)">
                <div class="form-row">
                  <div class="form-group"><label>Full Name</label><input type="text" id="p-name" value="${user.name || ''}"></div>
                  <div class="form-group"><label>Email</label><input type="email" value="${user.email}" disabled style="background:var(--light)"></div>
                </div>
                <div class="form-row">
                  <div class="form-group"><label>Phone</label><input type="tel" id="p-phone" value="${user.phone || ''}"></div>
                  <div class="form-group"><label>City</label><input type="text" id="p-city" value="${user.city || ''}"></div>
                </div>
                <div class="form-group"><label>Address</label><input type="text" id="p-address" value="${user.address || ''}"></div>
                <button class="btn btn-primary" type="submit"><i class="fas fa-save"></i> Save Changes</button>
              </form>

              <hr style="margin:32px 0;border:none;border-top:1px solid var(--gray-lightest)">

              <h3 style="margin-bottom:16px">Change Password</h3>
              <form onsubmit="changePassword(event)">
                <div class="form-group"><label>Current Password</label><input type="password" id="cp-current" required></div>
                <div class="form-group"><label>New Password</label><input type="password" id="cp-new" required></div>
                <button class="btn btn-outline" type="submit"><i class="fas fa-key"></i> Update Password</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    main.innerHTML = `<div class="container section">${renderEmptyState('exclamation-triangle', 'Error', err.message, 'Try Again', "renderProfilePage()")}</div>`;
  }
}
