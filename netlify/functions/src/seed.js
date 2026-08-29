require('dotenv').config();
const bcrypt = require('bcryptjs');
const { initializeDatabase, getOne, runSql } = require('./models/database');

async function seed() {
  await initializeDatabase();
  const hashedPassword = bcrypt.hashSync('password123', 10);

  // Seed Users
  const users = [
    ['John Customer', 'john@test.com', hashedPassword, 'customer', '9841234567', 'Kathmandu'],
    ['Jane Customer', 'jane@test.com', hashedPassword, 'customer', '9841234568', 'Pokhara'],
    ['Seller One', 'seller@test.com', hashedPassword, 'seller', '9841234569', 'Lalitpur'],
    ['Ram Sharma', 'ram@test.com', hashedPassword, 'customer', '9841234570', 'Bhaktapur'],
    ['Sita Devi', 'sita@test.com', hashedPassword, 'customer', '9841234571', 'Biratnagar'],
  ];

  for (const u of users) {
    const exists = await getOne('SELECT id FROM users WHERE email = ?', [u[1]]);
    if (!exists) await runSql('INSERT INTO users (name, email, password, role, phone, city) VALUES (?, ?, ?, ?, ?, ?)', u);
  }
  console.log('✅ Users seeded');

  // Seed Categories
  const categories = [
    ['Electronics', 'electronics', 'Smartphones, laptops, tablets and more', 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400'],
    ['Fashion', 'fashion', 'Clothing, shoes, and accessories', 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400'],
    ['Home & Living', 'home-living', 'Furniture, decor, and kitchen essentials', 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=400'],
    ['Sports & Outdoors', 'sports-outdoors', 'Fitness, camping, and sports equipment', 'https://images.unsplash.com/photo-1461896836934-bd45ba8c69c6?w=400'],
    ['Beauty & Health', 'beauty-health', 'Skincare, makeup, and wellness', 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400'],
    ['Books', 'books', 'Fiction, non-fiction, and academic books', 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=400'],
    ['Automotive', 'automotive', 'Car accessories and parts', 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400'],
    ['Toys & Games', 'toys-games', 'Fun for all ages', 'https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=400'],
  ];

  for (const c of categories) {
    const exists = await getOne('SELECT id FROM categories WHERE slug = ?', [c[1]]);
    if (!exists) await runSql('INSERT INTO categories (name, slug, description, image) VALUES (?, ?, ?, ?)', c);
  }
  console.log('✅ Categories seeded');

  // Seed Products
  const products = [
    ['Premium Wireless Headphones', 'premium-wireless-headphones', 1, 89.99, 129.99, 50, 'SoundMax', 'High-quality wireless headphones with active noise cancellation, 30-hour battery life, and premium sound quality.', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500', 1, 4.5, 128],
    ['Smartphone Pro Max 15', 'smartphone-pro-max-15', 1, 999.99, 1199.99, 30, 'TechVision', 'Latest flagship smartphone with 6.7" AMOLED display, 108MP camera, and 5000mAh battery.', 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500', 1, 4.7, 256],
    ['Ultra Slim Laptop 14"', 'ultra-slim-laptop-14', 1, 749.99, 899.99, 25, 'ByteBook', 'Lightweight laptop with Intel i7, 16GB RAM, 512GB SSD, and stunning 2K display.', 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500', 1, 4.6, 89],
    ['Smart Watch Series 8', 'smart-watch-series-8', 1, 249.99, 299.99, 75, 'WristTech', 'Advanced smartwatch with health monitoring, GPS, water resistance, and 5-day battery.', 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500', 0, 4.3, 67],
    ['Bluetooth Speaker Boom', 'bluetooth-speaker-boom', 1, 59.99, 79.99, 100, 'SoundMax', 'Portable Bluetooth speaker with 360° sound, waterproof design, and 12-hour playback.', 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=500', 0, 4.2, 45],
    ['Wireless Earbuds Pro', 'wireless-earbuds-pro', 1, 129.99, 159.99, 80, 'SoundMax', 'True wireless earbuds with active noise cancellation, transparency mode, and spatial audio.', 'https://images.unsplash.com/photo-1590658268037-6bf12f032f55?w=500', 1, 4.4, 112],
    ['4K Action Camera', '4k-action-camera', 1, 199.99, 249.99, 40, 'ActionPro', 'Waterproof 4K action camera with image stabilization and wide-angle lens.', 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=500', 0, 4.1, 34],
    ['Gaming Keyboard RGB', 'gaming-keyboard-rgb', 1, 79.99, 99.99, 60, 'GameMaster', 'Mechanical gaming keyboard with RGB backlighting, anti-ghosting, and programmable keys.', 'https://images.unsplash.com/photo-1541140532154-b024d1c0ba78?w=500', 0, 4.5, 78],
    ['Classic Leather Jacket', 'classic-leather-jacket', 2, 149.99, 199.99, 35, 'UrbanStyle', 'Premium genuine leather jacket with a timeless design.', 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500', 1, 4.6, 56],
    ['Running Shoes Air Max', 'running-shoes-air-max', 2, 119.99, 149.99, 45, 'SpeedFit', 'Lightweight running shoes with cushioned sole and breathable mesh upper.', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500', 1, 4.4, 92],
    ['Designer Sunglasses', 'designer-sunglasses', 2, 79.99, 119.99, 60, 'VisionElite', 'UV400 protected designer sunglasses with polarized lenses.', 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=500', 0, 4.3, 41],
    ['Premium Cotton T-Shirt', 'premium-cotton-tshirt', 2, 29.99, 39.99, 200, 'ComfortWear', '100% organic cotton t-shirt with comfortable fit.', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500', 0, 4.5, 167],
    ['Modern LED Desk Lamp', 'modern-led-desk-lamp', 3, 45.99, 59.99, 80, 'LightPro', 'Adjustable LED desk lamp with touch control and USB charging.', 'https://images.unsplash.com/photo-1507473885765-e6ed057ab6fe?w=500', 0, 4.2, 38],
    ['Ergonomic Office Chair', 'ergonomic-office-chair', 3, 299.99, 399.99, 20, 'ComfortSit', 'Premium ergonomic office chair with lumbar support.', 'https://images.unsplash.com/photo-1592078615290-033ee584e267?w=500', 1, 4.7, 74],
    ['Stainless Steel Water Bottle', 'stainless-steel-water-bottle', 3, 24.99, 34.99, 150, 'HydroKeep', 'Double-wall insulated water bottle.', 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=500', 0, 4.4, 89],
    ['Yoga Mat Premium', 'yoga-mat-premium', 4, 39.99, 49.99, 90, 'FlexFit', 'Non-slip yoga mat with alignment lines.', 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=500', 0, 4.3, 52],
    ['Fitness Tracker Band', 'fitness-tracker-band', 4, 49.99, 69.99, 100, 'FitTrack', 'Advanced fitness tracker with heart rate monitor.', 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=500', 1, 4.1, 63],
    ['Luxury Skincare Set', 'luxury-skincare-set', 5, 89.99, 119.99, 40, 'GlowUp', 'Complete skincare routine set.', 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500', 1, 4.6, 85],
    ['Professional Hair Dryer', 'professional-hair-dryer', 5, 69.99, 89.99, 55, 'StylePro', 'Ionic hair dryer with multiple heat settings.', 'https://images.unsplash.com/photo-1522338242992-e1a54571a9e7?w=500', 0, 4.2, 41],
    ['The Art of Programming', 'the-art-of-programming', 6, 34.99, 44.99, 120, 'TechPress', 'Comprehensive guide to programming.', 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500', 0, 4.8, 203],
    ['Mindful Living Guide', 'mindful-living-guide', 6, 19.99, 24.99, 80, 'WellPress', 'Guide to mindfulness and meditation.', 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=500', 0, 4.5, 147],
    ['Car Phone Mount', 'car-phone-mount', 7, 19.99, 29.99, 200, 'AutoGrip', 'Universal car phone mount with magnetic hold.', 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=500', 0, 4.0, 156],
    ['Educational Robot Kit', 'educational-robot-kit', 8, 59.99, 79.99, 45, 'RoboLearn', 'STEM robot kit for kids aged 8+.', 'https://images.unsplash.com/photo-1535378620166-273708d44e4c?w=500', 1, 4.7, 68],
  ];

  for (const p of products) {
    const exists = await getOne('SELECT id FROM products WHERE slug = ?', [p[1]]);
    if (!exists) {
      await runSql('INSERT INTO products (name, slug, category_id, price, compare_price, stock, brand, description, image, is_featured, rating, num_reviews) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', p);
    }
  }
  console.log('✅ Products seeded (' + products.length + ')');

  // Seed Orders
  const orderData = [
    [2, 179.98, 'delivered', 'paid', 'esewa'],
    [3, 999.99, 'processing', 'paid', 'khalti'],
    [2, 89.99, 'pending', 'unpaid', 'cod'],
    [4, 329.97, 'shipped', 'paid', 'esewa'],
    [5, 59.99, 'confirmed', 'paid', 'khalti'],
    [6, 149.99, 'delivered', 'paid', 'cod'],
    [2, 249.99, 'delivered', 'paid', 'esewa'],
    [4, 79.99, 'pending', 'unpaid', 'cod'],
  ];

  const existingOrders = (await getOne('SELECT COUNT(*) as count FROM orders', [])).count;
  if (existingOrders === 0) {
    for (const o of orderData) {
      const result = await runSql("INSERT INTO orders (user_id, total_amount, status, payment_status, payment_method, shipping_name, shipping_address, shipping_city, shipping_phone) VALUES (?, ?, ?, ?, ?, 'Customer', '123 Main St', 'Kathmandu', '9841234567')", o);
      const pId = Math.floor(Math.random() * 23) + 1;
      const product = await getOne('SELECT price FROM products WHERE id = ?', [pId]);
      if (product) {
        await runSql('INSERT INTO order_items (order_id, product_id, quantity, price, total) VALUES (?, ?, ?, ?, ?)', [result.lastInsertRowid, pId, 1, product.price, product.price]);
        await runSql('INSERT INTO payments (order_id, method, amount, status) VALUES (?, ?, ?, ?)', [result.lastInsertRowid, o[4], o[1], o[3] === 'paid' ? 'completed' : 'pending']);
      }
    }
    console.log('✅ Orders seeded');
  }

  // Seed Reviews
  const reviews = [
    [1, 2, 5, 'Amazing Sound!', 'Best headphones I ever owned.'],
    [1, 4, 4, 'Great value', 'Really good for the price.'],
    [2, 2, 5, 'Best Phone Ever', 'Camera quality is outstanding.'],
    [3, 5, 4, 'Lightweight and Powerful', 'Perfect for work and study.'],
    [9, 4, 5, 'Premium Quality', 'The leather is genuine and the fit is perfect.'],
    [10, 6, 4, 'Comfortable Running', 'Great cushioning and breathable.'],
  ];

  for (const r of reviews) {
    const exists = await getOne('SELECT id FROM reviews WHERE product_id = ? AND user_id = ?', [r[0], r[1]]);
    if (!exists) await runSql('INSERT INTO reviews (product_id, user_id, rating, title, comment, is_approved) VALUES (?, ?, ?, ?, ?, 1)', r);
  }
  console.log('✅ Reviews seeded');

  // Seed Coupons
  const coupons = [
    ['WELCOME10', 'Welcome discount - 10% off', 'percentage', 10, 20, null],
    ['SAVE20', 'Save $20 on orders over $100', 'fixed', 20, 100, null],
    ['FLASH50', 'Flash sale - 50% off', 'percentage', 50, 50, 100],
  ];

  for (const c of coupons) {
    const exists = await getOne('SELECT id FROM coupons WHERE code = ?', [c[0]]);
    if (!exists) await runSql('INSERT INTO coupons (code, description, discount_type, discount_value, min_order_amount, max_uses) VALUES (?, ?, ?, ?, ?, ?)', c);
  }
  console.log('✅ Coupons seeded');

  console.log('\n🎉 Database seeded successfully!');
  process.exit(0);
}

seed().catch(err => { console.error('Seed failed:', err); process.exit(1); });
