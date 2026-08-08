// ============================================
// 🔥 UPDATE THIS URL when you deploy your backend to Render
// ============================================
const API_URL = 'http://localhost:5000/api'; // ← Change to your Render URL: https://your-api.onrender.com/api

// --- STATE ---
let appData = { products: [], categories: [], orders: [] };
let currentLang = 'th';
let currentCurrency = 'thb';
let cart = [];
let selectedCategory = 'all';
let adminLoggedIn = false;
let currentAdminTab = 'dashboard';
let editingItem = null;
let authToken = null;

// --- API HELPERS ---
async function apiFetch(endpoint, options = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}

async function loadDataFromDB() {
    try {
        const [products, categories] = await Promise.all([
            apiFetch('/products'),
            apiFetch('/categories')
        ]);
        appData.products = products;
        appData.categories = categories;
    } catch (e) {
        console.error('Failed to load DB:', e);
        toast('⚠️ Cannot connect to server. Make sure backend is running.', 'error');
    }
}

async function refreshData() {
    await loadDataFromDB();
    renderAll();
}

// --- ADMIN LOGIN ---
async function adminLogin(username, password) {
    try {
        const res = await apiFetch('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        authToken = res.token;
        adminLoggedIn = true;
        renderAdmin();
        toast('✅ Login successful');
    } catch (e) {
        toast('❌ Invalid credentials', 'error');
    }
}

// --- CRUD OPERATIONS ---
async function addProduct(p) { await apiFetch('/products', { method: 'POST', body: JSON.stringify(p) });
    await refreshData(); }
async function updateProduct(id, p) { await apiFetch(`/products/${id}`, { method: 'PUT', body: JSON.stringify(p) });
    await refreshData(); }
async function deleteProduct(id) { await apiFetch(`/products/${id}`, { method: 'DELETE' });
    await refreshData(); }
async function addCategory(c) { await apiFetch('/categories', { method: 'POST', body: JSON.stringify(c) });
    await refreshData(); }
async function updateCategory(id, c) { await apiFetch(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(c) });
    await refreshData(); }
async function deleteCategory(id) { await apiFetch(`/categories/${id}`, { method: 'DELETE' });
    await refreshData(); }
async function saveOrder(order) { await apiFetch('/orders', { method: 'POST', body: JSON.stringify(order) });
    await refreshData(); }

// --- UTILITY ---
function t(thText, enText) { return currentLang === 'th' ? thText : enText; }

function formatPrice(amount) {
    if (currentCurrency === 'thb') return '฿' + amount.toLocaleString();
    const usd = Math.round(amount / 35);
    return '$' + usd.toLocaleString();
}

function getCategoryName(catId) {
    const cat = appData.categories.find(c => c.id === catId);
    if (!cat) return catId;
    return currentLang === 'th' ? cat.th : cat.en;
}

function getCategoryIcon(catId) {
    const cat = appData.categories.find(c => c.id === catId);
    return cat ? cat.icon : 'fa-tag';
}

function getProductName(p) { return currentLang === 'th' ? p.name_th : p.name_en; }

function getProductDesc(p) { return currentLang === 'th' ? p.desc_th : p.desc_en; }

function toast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${message}`;
    container.appendChild(el);
    setTimeout(() => { el.style.opacity = '0';
        el.style.transform = 'translateX(30px)';
        setTimeout(() => el.remove(), 300); }, 2800);
}

// --- RENDER FUNCTIONS ---
function renderCategories() {
    const grid = document.getElementById('categoriesGrid');
    grid.innerHTML = appData.categories.map(cat => {
        const count = appData.products.filter(p => p.category === cat.id).length;
        const active = selectedCategory === cat.id ? 'active' : '';
        return `<div class="category-card ${active}" data-category="${cat.id}">
              <span class="icon"><i class="fas ${cat.icon}"></i></span>
              <h4>${currentLang === 'th' ? cat.th : cat.en}</h4>
              <span class="count">${count} รายการ</span>
            </div>`;
    }).join('');
    grid.querySelectorAll('.category-card').forEach(el => {
        el.addEventListener('click', () => {
            const catId = el.dataset.category;
            selectedCategory = (selectedCategory === catId) ? 'all' : catId;
            renderCategories();
            renderProducts();
            updateProductResults();
            document.getElementById('productsSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });
}

function renderProducts() {
    const grid = document.getElementById('productsGrid');
    let filtered = appData.products;
    if (selectedCategory !== 'all') filtered = filtered.filter(p => p.category === selectedCategory);
    const sort = document.getElementById('sortProducts').value;
    if (sort === 'price-asc') filtered.sort((a, b) => a.price - b.price);
    else if (sort === 'price-desc') filtered.sort((a, b) => b.price - a.price);
    else if (sort === 'name') filtered.sort((a, b) => getProductName(a).localeCompare(getProductName(b)));
    if (filtered.length === 0) {
        grid.innerHTML =
            `<div style="grid-column:1/-1;text-align:center;padding:60px 0;color:var(--gray);"><i class="fas fa-box-open" style="font-size:48px;display:block;margin-bottom:12px;color:var(--light-gray);"></i> ไม่พบสินค้า</div>`;
        return;
    }
    grid.innerHTML = filtered.map(p => `
            <div class="product-card" data-id="${p.id}">
              <div class="image"><span style="font-size:56px;">${p.image || '👗'}</span><span class="tag">${getCategoryName(p.category)}</span></div>
              <div class="info">
                <div class="category-label">${getCategoryName(p.category)}</div>
                <div class="name">${getProductName(p)}</div>
                <div class="price-row"><span class="price">${formatPrice(p.price)}</span>
                  <button class="add-btn" data-id="${p.id}"><i class="fas fa-plus"></i></button>
                </div>
              </div>
            </div>
          `).join('');
    grid.querySelectorAll('.add-btn').forEach(btn => {
        btn.addEventListener('click', (e) => { e.stopPropagation();
            addToCart(parseInt(btn.dataset.id)); });
    });
    grid.querySelectorAll('.product-card').forEach(el => {
        el.addEventListener('click', () => showProductDetail(parseInt(el.dataset.id)));
    });
    updateProductResults();
}

function updateProductResults() {
    let filtered = appData.products;
    if (selectedCategory !== 'all') filtered = filtered.filter(p => p.category === selectedCategory);
    const total = appData.products.length;
    const showing = filtered.length;
    const catLabel = selectedCategory === 'all' ? 'ทั้งหมด' : getCategoryName(selectedCategory);
    document.getElementById('productResults').textContent =
        currentLang === 'th' ? `แสดง ${showing} จาก ${total} รายการ (${catLabel})` :
        `Showing ${showing} of ${total} items (${catLabel})`;
}

function updateCategoryFilter() {
    const sel = document.getElementById('filterCategory');
    const current = sel.value;
    sel.innerHTML = `<option value="all">${currentLang === 'th' ? 'ทุกหมวดหมู่' : 'All Categories'}</option>`;
    appData.categories.forEach(cat => {
        const label = currentLang === 'th' ? cat.th : cat.en;
        sel.innerHTML += `<option value="${cat.id}">${label}</option>`;
    });
    sel.value = current;
}

// --- CART ---
function renderCart() {
    const container = document.getElementById('cartItems');
    const countEl = document.getElementById('cartCount');
    const totalEl = document.getElementById('cartTotal');
    countEl.textContent = cart.reduce((sum, item) => sum + item.qty, 0);
    if (cart.length === 0) {
        container.innerHTML =
            `<div class="cart-empty"><i class="fas fa-shopping-bag"></i><p>${currentLang === 'th' ? 'ตะกร้าของคุณว่างเปล่า' : 'Your cart is empty'}</p></div>`;
        totalEl.textContent = formatPrice(0);
        return;
    }
    let html = '',
        total = 0;
    cart.forEach((item, index) => {
        const p = appData.products.find(prod => prod.id === item.id);
        if (!p) return;
        const price = p.price * item.qty;
        total += price;
        html += `<div class="cart-item">
              <div class="thumb">${p.image || '👗'}</div>
              <div class="details">
                <div class="name">${getProductName(p)}</div>
                <div class="price">${formatPrice(p.price)}</div>
                <div class="qty-control">
                  <button data-index="${index}" data-dir="-1">−</button>
                  <span>${item.qty}</span>
                  <button data-index="${index}" data-dir="1">+</button>
                </div>
              </div>
              <button class="remove-btn" data-index="${index}"><i class="fas fa-trash-alt"></i></button>
            </div>`;
    });
    container.innerHTML = html;
    totalEl.textContent = formatPrice(total);
    container.querySelectorAll('.qty-control button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(btn.dataset.index);
            const dir = parseInt(btn.dataset.dir);
            updateCartQty(index, dir);
        });
    });
    container.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeFromCart(parseInt(btn.dataset.index));
        });
    });
}

function addToCart(productId) {
    const existing = cart.find(item => item.id === productId);
    if (existing) existing.qty += 1;
    else cart.push({ id: productId, qty: 1 });
    renderCart();
    toast(t('เพิ่มสินค้าลงตะกร้าเรียบร้อย', 'Added to cart'));
}

function updateCartQty(index, dir) {
    if (index < 0 || index >= cart.length) return;
    const item = cart[index];
    item.qty += dir;
    if (item.qty <= 0) cart.splice(index, 1);
    renderCart();
}

function removeFromCart(index) { cart.splice(index, 1);
    renderCart();
    toast(t('ลบสินค้าออกจากตะกร้า', 'Removed from cart')); }

function showProductDetail(id) {
    const p = appData.products.find(prod => prod.id === id);
    if (!p) return;
    const overlay = document.getElementById('modalOverlay');
    const content = document.getElementById('modalContent');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    const submitBtn = document.getElementById('modalSubmitBtn');
    title.textContent = getProductName(p);
    submitBtn.style.display = 'none';
    const sizes = p.sizes ? p.sizes.join(', ') : '-';
    body.innerHTML = `
            <div style="text-align:center;font-size:72px;margin:8px 0 16px;">${p.image || '👗'}</div>
            <p style="color:var(--gray);margin-bottom:12px;line-height:1.7;">${getProductDesc(p)}</p>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:14px;margin-bottom:8px;">
              <div><strong>${t('หมวดหมู่', 'Category')}:</strong> ${getCategoryName(p.category)}</div>
              <div><strong>${t('ราคา', 'Price')}:</strong> <span style="color:var(--gold-dark);font-weight:700;font-family:var(--font-serif);font-size:20px;">${formatPrice(p.price)}</span></div>
              <div><strong>${t('ไซส์', 'Sizes')}:</strong> ${sizes}</div>
              <div><strong>${t('รหัสสินค้า', 'SKU')}:</strong> #${p.id}</div>
            </div>
            <button class="btn btn-primary" style="width:100%;justify-content:center;margin-top:12px;" id="detailAddBtn"><i class="fas fa-shopping-bag"></i> ${t('เพิ่มลงตะกร้า', 'Add to Cart')}</button>
          `;
    overlay.classList.add('open');
    document.getElementById('detailAddBtn').addEventListener('click', () => { addToCart(p.id);
        overlay.classList.remove('open'); });
    document.getElementById('modalCloseBtn').onclick = () => overlay.classList.remove('open');
    overlay.onclick = (e) => { if (e.target === overlay) overlay.classList.remove('open'); };
}

// --- CHECKOUT ---
async function checkout() {
    if (cart.length === 0) { toast(t('ตะกร้าของคุณว่างเปล่า', 'Your cart is empty'), 'error'); return; }
    const total = cart.reduce((sum, item) => {
        const p = appData.products.find(prod => prod.id === item.id);
        return sum + (p ? p.price * item.qty : 0);
    }, 0);
    const order = {
        id: Date.now().toString().slice(-6),
        customer: t('ลูกค้า', 'Customer'),
        date: new Date().toLocaleDateString(),
        total: total,
        status: 'pending',
        items: cart.map(item => ({ ...item })),
    };
    await saveOrder(order);
    cart = [];
    renderCart();
    renderAll();
    toast(t('คำสั่งซื้อของคุณได้รับการบันทึกแล้ว ขอบคุณ!', 'Your order has been placed! Thank you!'));
    closeCart();
}

// --- ADMIN RENDER ---
function renderAdmin() {
    if (!adminLoggedIn) {
        const content = document.getElementById('adminContent');
        content.innerHTML = `<div class="admin-login"><div class="admin-login-box">
              <h3><i class="fas fa-crown" style="color:var(--gold);"></i> Admin</h3>
              <p class="sub">${t('เข้าสู่ระบบแผงควบคุม', 'Admin Login')}</p>
              <input type="text" id="adminUser" value="admin"><input type="password" id="adminPass" value="admin123">
              <button class="login-btn" id="adminLoginBtn">${t('เข้าสู่ระบบ', 'Login')}</button>
            </div></div>`;
        document.getElementById('adminLoginBtn').addEventListener('click', () => {
            adminLogin(document.getElementById('adminUser').value, document.getElementById('adminPass').value);
        });
        document.getElementById('adminPass').addEventListener('keydown', (e) => { if (e.key === 'Enter')
                document.getElementById('adminLoginBtn').click(); });
        return;
    }
    const content = document.getElementById('adminContent');
    switch (currentAdminTab) {
        case 'dashboard':
            renderAdminDashboard(content);
            break;
        case 'products':
            renderAdminProducts(content);
            break;
        case 'categories':
            renderAdminCategories(content);
            break;
        case 'orders':
            renderAdminOrders(content);
            break;
        default:
            content.innerHTML = '<p>เลือกเมนู</p>';
    }
}

function renderAdminDashboard(content) {
    const totalProducts = appData.products.length;
    const totalCategories = appData.categories.length;
    const totalOrders = appData.orders.length;
    const totalRevenue = appData.orders.reduce((s, o) => s + o.total, 0);
    content.innerHTML = `
            <div class="admin-stats">
              <div class="admin-stat"><div class="number">${totalProducts}</div><div class="label">${t('สินค้า', 'Products')}</div></div>
              <div class="admin-stat"><div class="number">${totalCategories}</div><div class="label">${t('หมวดหมู่', 'Categories')}</div></div>
              <div class="admin-stat"><div class="number">${totalOrders}</div><div class="label">${t('คำสั่งซื้อ', 'Orders')}</div></div>
              <div class="admin-stat"><div class="number">${formatPrice(totalRevenue)}</div><div class="label">${t('ยอดขายรวม', 'Revenue')}</div></div>
            </div>
            <div style="background:white;border-radius:var(--radius);padding:24px;box-shadow:var(--shadow);">
              <h4 style="margin-bottom:8px;">${t('ยินดีต้อนรับสู่แผงควบคุม', 'Welcome to Admin Panel')}</h4>
              <p style="color:var(--gray);font-size:14px;">${t('คุณสามารถจัดการสินค้า หมวดหมู่ และคำสั่งซื้อได้จากเมนูด้านซ้าย', 'Manage products, categories, and orders from the left menu.')}</p>
            </div>
          `;
}

function renderAdminProducts(content) {
    let html =
        `<div class="admin-table-wrap"><div class="table-header"><h4><i class="fas fa-box" style="color:var(--gold);"></i> ${t('รายการสินค้า', 'Products')}</h4>
            <button class="add-btn" id="adminAddProductBtn"><i class="fas fa-plus"></i> ${t('เพิ่มสินค้า', 'Add Product')}</button></div>
            <table class="admin-table"><thead><tr><th>#</th><th>${t('ชื่อ', 'Name')}</th><th>${t('หมวดหมู่', 'Category')}</th><th>${t('ราคา', 'Price')}</th><th>${t('การจัดการ', 'Actions')}</th></tr></thead><tbody>`;
    if (appData.products.length === 0) html +=
        `<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--gray);">${t('ยังไม่มีสินค้า', 'No products')}</td></tr>`;
    else {
        appData.products.forEach(p => {
            html += `<tr><td>${p.id}</td><td>${p.name_th}</td><td><span class="badge">${getCategoryName(p.category)}</span></td>
                <td>${formatPrice(p.price)}</td>
                <td><div class="actions"><button class="edit-btn" data-id="${p.id}"><i class="fas fa-edit"></i></button>
                <button class="del-btn" data-id="${p.id}"><i class="fas fa-trash"></i></button></div></td></tr>`;
        });
    }
    html += `</tbody></table></div>`;
    content.innerHTML = html;
    document.getElementById('adminAddProductBtn').addEventListener('click', () => openProductModal());
    content.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const p = appData.products.find(prod => prod.id === parseInt(btn.dataset.id));
            if (p) openProductModal(p);
        });
    });
    content.querySelectorAll('.del-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (confirm(t('ลบสินค้านี้ใช่หรือไม่?', 'Delete this product?'))) {
                await deleteProduct(parseInt(btn.dataset.id));
            }
        });
    });
}

function renderAdminCategories(content) {
    let html =
        `<div class="admin-table-wrap"><div class="table-header"><h4><i class="fas fa-tags" style="color:var(--gold);"></i> ${t('หมวดหมู่', 'Categories')}</h4>
            <button class="add-btn" id="adminAddCategoryBtn"><i class="fas fa-plus"></i> ${t('เพิ่มหมวดหมู่', 'Add Category')}</button></div>
            <table class="admin-table"><thead><tr><th>#</th><th>${t('ชื่อภาษาไทย', 'Thai Name')}</th><th>${t('ชื่อภาษาอังกฤษ', 'English Name')}</th><th>${t('ไอคอน', 'Icon')}</th><th>${t('สินค้า', 'Products')}</th><th>${t('การจัดการ', 'Actions')}</th></tr></thead><tbody>`;
    appData.categories.forEach(cat => {
        const count = appData.products.filter(p => p.category === cat.id).length;
        html += `<tr><td>${cat.id}</td><td>${cat.th}</td><td>${cat.en}</td><td><i class="fas ${cat.icon}"></i></td><td>${count}</td>
              <td><div class="actions"><button class="edit-btn" data-id="${cat.id}"><i class="fas fa-edit"></i></button>
              <button class="del-btn" data-id="${cat.id}" ${count > 0 ? 'disabled style="opacity:0.4;cursor:not-allowed;"' : ''}><i class="fas fa-trash"></i></button></div></td></tr>`;
    });
    html += `</tbody></table></div>`;
    content.innerHTML = html;
    document.getElementById('adminAddCategoryBtn').addEventListener('click', () => openCategoryModal());
    content.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const cat = appData.categories.find(c => c.id === btn.dataset.id);
            if (cat) openCategoryModal(cat);
        });
    });
    content.querySelectorAll('.del-btn:not([disabled])').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (confirm(t('ลบหมวดหมู่นี้ใช่หรือไม่?', 'Delete this category?'))) {
                await deleteCategory(btn.dataset.id);
            }
        });
    });
}

function renderAdminOrders(content) {
    let html =
        `<div class="admin-table-wrap"><div class="table-header"><h4><i class="fas fa-receipt" style="color:var(--gold);"></i> ${t('คำสั่งซื้อ', 'Orders')}</h4>
            <span style="font-size:13px;color:var(--gray);">${appData.orders.length} ${t('รายการ', 'orders')}</span></div>
            <table class="admin-table"><thead><tr><th>${t('เลขที่', 'Order #')}</th><th>${t('ลูกค้า', 'Customer')}</th><th>${t('วันที่', 'Date')}</th><th>${t('ยอดรวม', 'Total')}</th><th>${t('สถานะ', 'Status')}</th></tr></thead><tbody>`;
    if (appData.orders.length === 0) html +=
        `<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--gray);">${t('ยังไม่มีคำสั่งซื้อ', 'No orders')}</td></tr>`;
    else {
        appData.orders.forEach(o => {
            const statusLabel = { pending: t('รอดำเนินการ', 'Pending'), completed: t('เสร็จสิ้น', 'Completed'),
                cancelled: t('ยกเลิก', 'Cancelled') } [o.status] || o.status;
            html +=
                `<tr><td>#${o.id}</td><td>${o.customer}</td><td>${o.date}</td><td>${formatPrice(o.total)}</td><td><span class="badge">${statusLabel}</span></td></tr>`;
        });
    }
    html += `</tbody></table></div>`;
    content.innerHTML = html;
}

// --- MODALS (CRUD hooks) ---
function openProductModal(product = null) {
    const overlay = document.getElementById('modalOverlay');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    const submitBtn = document.getElementById('modalSubmitBtn');
    const form = document.getElementById('modalForm');
    editingItem = product;
    title.textContent = product ? t('แก้ไขสินค้า', 'Edit Product') : t('เพิ่มสินค้าใหม่', 'Add New Product');
    submitBtn.textContent = product ? t('อัปเดต', 'Update') : t('บันทึก', 'Save');
    const catOptions = appData.categories.map(cat =>
        `<option value="${cat.id}" ${product && product.category === cat.id ? 'selected' : ''}>${currentLang === 'th' ? cat.th : cat.en}</option>`
    ).join('');
    const sizeOptions = ['S', 'M', 'L', 'XL', 'One Size'].map(s =>
        `<option value="${s}" ${product && product.sizes && product.sizes.includes(s) ? 'selected' : ''}>${s}</option>`
    ).join('');
    body.innerHTML = `
            <div class="form-group"><label>${t('ชื่อภาษาไทย', 'Thai Name')}</label><input type="text" id="pNameTh" value="${product ? product.name_th : ''}" required></div>
            <div class="form-group"><label>${t('ชื่อภาษาอังกฤษ', 'English Name')}</label><input type="text" id="pNameEn" value="${product ? product.name_en : ''}" required></div>
            <div class="form-row"><div class="form-group"><label>${t('หมวดหมู่', 'Category')}</label><select id="pCategory">${catOptions}</select></div>
            <div class="form-group"><label>${t('ราคา (บาท)', 'Price (THB)')}</label><input type="number" id="pPrice" value="${product ? product.price : ''}" required min="0"></div></div>
            <div class="form-group"><label>${t('คำอธิบายภาษาไทย', 'Thai Description')}</label><textarea id="pDescTh">${product ? product.desc_th : ''}</textarea></div>
            <div class="form-group"><label>${t('คำอธิบายภาษาอังกฤษ', 'English Description')}</label><textarea id="pDescEn">${product ? product.desc_en : ''}</textarea></div>
            <div class="form-row"><div class="form-group"><label>${t('ไอคอน/อีโมจิ', 'Icon/Emoji')}</label><input type="text" id="pImage" value="${product ? product.image : '👗'}" maxlength="4"></div>
            <div class="form-group"><label>${t('ไซส์ (กด Ctrl เพื่อเลือกหลายรายการ)', 'Sizes (Ctrl+Click)')}</label><select id="pSizes" multiple style="height:auto;min-height:60px;">${sizeOptions}</select></div></div>
          `;
    overlay.classList.add('open');
    form.onsubmit = async (e) => {
        e.preventDefault();
        const payload = {
            name_th: document.getElementById('pNameTh').value.trim(),
            name_en: document.getElementById('pNameEn').value.trim(),
            category: document.getElementById('pCategory').value,
            price: parseFloat(document.getElementById('pPrice').value),
            desc_th: document.getElementById('pDescTh').value.trim(),
            desc_en: document.getElementById('pDescEn').value.trim(),
            image: document.getElementById('pImage').value.trim() || '👗',
            sizes: Array.from(document.getElementById('pSizes').selectedOptions).map(opt => opt.value),
        };
        if (editingItem) { await updateProduct(editingItem.id, { ...editingItem, ...payload });
            toast(t('อัปเดตสินค้าเรียบร้อย', 'Product updated')); } else { await addProduct({ ...payload, id: Date.now() %
                    100000 });
            toast(t('เพิ่มสินค้าเรียบร้อย', 'Product added')); }
        overlay.classList.remove('open');
        await refreshData();
    };
    document.getElementById('modalCloseBtn').onclick = () => overlay.classList.remove('open');
    overlay.onclick = (e) => { if (e.target === overlay) overlay.classList.remove('open'); };
}

function openCategoryModal(category = null) {
    const overlay = document.getElementById('modalOverlay');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    const submitBtn = document.getElementById('modalSubmitBtn');
    const form = document.getElementById('modalForm');
    editingItem = category;
    title.textContent = category ? t('แก้ไขหมวดหมู่', 'Edit Category') : t('เพิ่มหมวดหมู่ใหม่', 'Add New Category');
    submitBtn.textContent = category ? t('อัปเดต', 'Update') : t('บันทึก', 'Save');
    const iconOptions = ['fa-vest', 'fa-shirt', 'fa-moon', 'fa-people-arrows', 'fa-calendar-check',
        'fa-shoe-prints', 'fa-bag-shopping', 'fa-gem', 'fa-clock', 'fa-gift'
    ].map(icon =>
        `<option value="${icon}" ${category && category.icon === icon ? 'selected' : ''}>${icon}</option>`
    ).join('');
    body.innerHTML = `
            <div class="form-group"><label>${t('รหัสหมวดหมู่ (ภาษาอังกฤษ)', 'Category ID')}</label><input type="text" id="cId" value="${category ? category.id : ''}" ${category ? 'readonly' : ''} required></div>
            <div class="form-group"><label>${t('ชื่อภาษาไทย', 'Thai Name')}</label><input type="text" id="cTh" value="${category ? category.th : ''}" required></div>
            <div class="form-group"><label>${t('ชื่อภาษาอังกฤษ', 'English Name')}</label><input type="text" id="cEn" value="${category ? category.en : ''}" required></div>
            <div class="form-group"><label>${t('ไอคอน', 'Icon')}</label><select id="cIcon">${iconOptions}</select></div>
          `;
    overlay.classList.add('open');
    form.onsubmit = async (e) => {
        e.preventDefault();
        const payload = {
            id: document.getElementById('cId').value.trim().toLowerCase().replace(/\s+/g, '-'),
            th: document.getElementById('cTh').value.trim(),
            en: document.getElementById('cEn').value.trim(),
            icon: document.getElementById('cIcon').value,
        };
        if (category) { await updateCategory(category.id, payload);
            toast(t('อัปเดตหมวดหมู่เรียบร้อย', 'Category updated')); } else { await addCategory(payload);
            toast(t('เพิ่มหมวดหมู่เรียบร้อย', 'Category added')); }
        overlay.classList.remove('open');
        await refreshData();
    };
    document.getElementById('modalCloseBtn').onclick = () => overlay.classList.remove('open');
    overlay.onclick = (e) => { if (e.target === overlay) overlay.classList.remove('open'); };
}

// --- NAVIGATION ---
function switchAdminTab(tab) { currentAdminTab = tab;
    document.querySelectorAll('.admin-sidebar .menu-item').forEach(el => el.classList.toggle('active', el.dataset.tab ===
        tab));
    renderAdmin(); }

function renderAll() { renderCategories();
    renderProducts();
    renderCart();
    updateCategoryFilter();
    updateProductResults();
    updateHeaderText(); if (document.getElementById('adminPanel').classList.contains('open')) renderAdmin(); }

function updateHeaderText() {
    document.getElementById('heroDesc').textContent = t(
        'ค้นพบคอลเลกชันแฟชั่นชั้นนำของไทย ตั้งแต่ชุดราตรีไปจนถึงเครื่องประดับสุดหรู พร้อมจัดส่งทั่วประเทศ',
        'Discover Thailand\'s premier fashion collection, from evening gowns to luxury accessories, nationwide delivery.'
        );
    document.getElementById('heroShopBtn').innerHTML =
        `<i class="fas fa-shopping-bag"></i> ${t('ช้อปเลย', 'Shop Now')}`;
    document.getElementById('heroCollectionBtn').textContent = t('ดูคอลเลกชัน', 'View Collection');
    document.getElementById('categorySubtitle').textContent = t('เลือกหมวดหมู่ที่คุณสนใจ', 'Choose your category');
    document.getElementById('productSubtitle').textContent = t('คอลเลกชันล่าสุด', 'Latest Collection');
    document.getElementById('adminToggleText').textContent = t('ผู้ดูแลระบบ', 'Admin');
    const navTexts = t(['หน้าหลัก', 'สินค้า', 'หมวดหมู่', 'เกี่ยวกับ'], ['Home', 'Products', 'Categories', 'About']);
    document.querySelectorAll('.nav-links a').forEach((el, i) => { if (i < navTexts.length) el.textContent = navTexts[i]; });
    document.querySelector('.cart-drawer .header h3').textContent = t('🛍️ ตะกร้าสินค้า', '🛍️ Shopping Cart');
    document.getElementById('checkoutBtn').textContent = t('ดำเนินการชำระเงิน', 'Checkout');
    document.querySelector('.admin-header h2').innerHTML =
        `<i class="fas fa-crown" style="color:var(--gold);"></i> GLAMOUR<span style="color:var(--gold);">THAI</span> <span style="font-size:14px;color:var(--gray);font-weight:400;">| ${t('แผงควบคุม', 'Dashboard')}</span>`;
    const sidebarLabels = t(['Dashboard', 'สินค้า', 'หมวดหมู่', 'คำสั่งซื้อ'], ['Dashboard', 'Products', 'Categories',
        'Orders'
    ]);
    document.querySelectorAll('.admin-sidebar .menu-item').forEach((el, i) => { if (i < sidebarLabels.length) { const span =
            el.querySelector('span'); if (span) span.textContent = sidebarLabels[i]; } });
    updateCategoryFilter();
    updateProductResults();
}

function openCart() { document.getElementById('cartOverlay').classList.add('open');
    document.getElementById('cartDrawer').classList.add('open'); }

function closeCart() { document.getElementById('cartOverlay').classList.remove('open');
    document.getElementById('cartDrawer').classList.remove('open'); }

// --- EVENT LISTENERS ---
document.getElementById('cartBtn').addEventListener('click', openCart);
document.getElementById('cartCloseBtn').addEventListener('click', closeCart);
document.getElementById('cartOverlay').addEventListener('click', closeCart);
document.getElementById('checkoutBtn').addEventListener('click', checkout);
document.getElementById('langTh').addEventListener('click', () => { currentLang = 'th';
    document.querySelectorAll('[data-lang]').forEach(el => el.classList.toggle('active', el.dataset.lang === 'th'));
    renderAll(); });
document.getElementById('langEn').addEventListener('click', () => { currentLang = 'en';
    document.querySelectorAll('[data-lang]').forEach(el => el.classList.toggle('active', el.dataset.lang === 'en'));
    renderAll(); });
document.getElementById('curThb').addEventListener('click', () => { currentCurrency = 'thb';
    document.querySelectorAll('[data-currency]').forEach(el => el.classList.toggle('active', el.dataset.currency ===
        'thb'));
    renderAll(); });
document.getElementById('curUsd').addEventListener('click', () => { currentCurrency = 'usd';
    document.querySelectorAll('[data-currency]').forEach(el => el.classList.toggle('active', el.dataset.currency ===
        'usd'));
    renderAll(); });
document.getElementById('filterCategory').addEventListener('change', () => { selectedCategory = document.getElementById(
        'filterCategory').value;
    renderCategories();
    renderProducts();
    updateProductResults(); });
document.getElementById('sortProducts').addEventListener('change', renderProducts);
document.getElementById('mobileMenuBtn').addEventListener('click', () => {
    const nav = document.getElementById('navLinks');
    nav.style.display = nav.style.display === 'flex' ? 'none' : 'flex';
    if (window.innerWidth <= 768) { nav.style.position = 'absolute';
        nav.style.top = '100%';
        nav.style.left = '0';
        nav.style.right = '0';
        nav.style.background = 'white';
        nav.style.padding = '20px 24px';
        nav.style.flexDirection = 'column';
        nav.style.gap = '16px';
        nav.style.boxShadow = 'var(--shadow)';
        nav.style.borderTop = '1px solid var(--light-gray)'; }
});
document.querySelectorAll('.nav-links a').forEach(el => {
    el.addEventListener('click', (e) => {
        e.preventDefault();
        const section = el.dataset.section;
        if (section === 'home') document.getElementById('homeSection').scrollIntoView({ behavior: 'smooth' });
        else if (section === 'products') document.getElementById('productsSection').scrollIntoView({ behavior: 'smooth' });
        else if (section === 'categories') document.getElementById('categoriesSection').scrollIntoView({ behavior: 'smooth' });
        else if (section === 'about') document.querySelector('.footer').scrollIntoView({ behavior: 'smooth' });
        if (window.innerWidth <= 768) document.getElementById('navLinks').style.display = 'none';
    });
});
document.getElementById('heroShopBtn').addEventListener('click', (e) => { e.preventDefault();
    document.getElementById('productsSection').scrollIntoView({ behavior: 'smooth' }); });
document.getElementById('heroCollectionBtn').addEventListener('click', (e) => { e.preventDefault();
    document.getElementById('categoriesSection').scrollIntoView({ behavior: 'smooth' }); });
document.getElementById('adminToggle').addEventListener('click', () => {
    document.getElementById('adminPanel').classList.toggle('open');
    if (document.getElementById('adminPanel').classList.contains('open')) renderAdmin();
});
document.getElementById('adminCloseBtn').addEventListener('click', () => { document.getElementById('adminPanel').classList
        .remove('open'); });
document.querySelectorAll('.admin-sidebar .menu-item').forEach(el => {
    el.addEventListener('click', () => { const tab = el.dataset.tab; if (tab) switchAdminTab(tab); });
});
window.addEventListener('scroll', () => { const header = document.getElementById('header'); if (window.scrollY > 40) header
        .classList.add('scrolled'); else header.classList.remove('scrolled'); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { document.getElementById('modalOverlay').classList
            .remove('open');
        closeCart(); } });

// --- INIT ---
(async function init() {
    await loadDataFromDB();
    renderAll();
    console.log('✅ Connected to MongoDB via Render backend');
    console.log('👑 Admin: admin / admin123');
    console.log('🌐 Update API_URL in app.js if deploying');
})();