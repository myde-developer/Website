// ============================================
// 🔥 UPDATE THIS URL with your deployed backend
// ============================================
const API_URL = 'https://website-219o.onrender.com/api';

// --- STATE ---
let appData = { products: [], categories: [], orders: [] };
let currentCurrency = 'thb';
let cart = [];
let selectedCategory = 'all';

// --- API HELPERS ---
async function apiFetch(endpoint, options = {}) {
    const headers = { 'Content-Type': 'application/json' };
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
        toast('⚠️ Cannot connect to server.', 'error');
    }
}

async function saveOrder(order) {
    await apiFetch('/orders', { method: 'POST', body: JSON.stringify(order) });
    await loadDataFromDB();
}

// --- UTILITY ---
function formatPrice(amount) {
    if (currentCurrency === 'thb') return '฿' + amount.toLocaleString();
    const usd = Math.round(amount / 35);
    return '$' + usd.toLocaleString();
}

function getCategoryName(catId) {
    const cat = appData.categories.find(c => c.id === catId);
    return cat ? cat.th : catId;
}

function getProductName(p) { return p.name_th; }
function getProductDesc(p) { return p.desc_th; }

function toast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${message}`;
    container.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(30px)'; setTimeout(() => el.remove(), 300); }, 2800);
}

// --- RENDER FUNCTIONS ---
function renderCategories() {
    const grid = document.getElementById('categoriesGrid');
    grid.innerHTML = appData.categories.map(cat => {
        const count = appData.products.filter(p => p.category === cat.id).length;
        const active = selectedCategory === cat.id ? 'active' : '';
        return `<div class="category-card ${active}" data-category="${cat.id}">
            <span class="icon"><i class="fas ${cat.icon}"></i></span>
            <h4>${cat.th}</h4>
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
    else if (sort === 'name') filtered.sort((a, b) => a.name_th.localeCompare(b.name_th));
    if (filtered.length === 0) {
        grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 0;color:var(--gray);"><i class="fas fa-box-open" style="font-size:48px;display:block;margin-bottom:12px;color:var(--light-gray);"></i> ไม่พบสินค้า</div>`;
        return;
    }
    grid.innerHTML = filtered.map(p => `
        <div class="product-card" data-id="${p.id}">
            <div class="image"><span style="font-size:56px;">${p.image || '👗'}</span><span class="tag">${getCategoryName(p.category)}</span></div>
            <div class="info">
                <div class="category-label">${getCategoryName(p.category)}</div>
                <div class="name">${p.name_th}</div>
                <div class="price-row"><span class="price">${formatPrice(p.price)}</span>
                    <button class="add-btn" data-id="${p.id}"><i class="fas fa-plus"></i></button>
                </div>
            </div>
        </div>
    `).join('');
    grid.querySelectorAll('.add-btn').forEach(btn => {
        btn.addEventListener('click', (e) => { e.stopPropagation(); addToCart(parseInt(btn.dataset.id)); });
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
    document.getElementById('productResults').textContent = `แสดง ${showing} จาก ${total} รายการ (${catLabel})`;
}

function updateCategoryFilter() {
    const sel = document.getElementById('filterCategory');
    const current = sel.value;
    sel.innerHTML = `<option value="all">ทุกหมวดหมู่</option>`;
    appData.categories.forEach(cat => {
        sel.innerHTML += `<option value="${cat.id}">${cat.th}</option>`;
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
        container.innerHTML = `<div class="cart-empty"><i class="fas fa-shopping-bag"></i><p>ตะกร้าของคุณว่างเปล่า</p></div>`;
        totalEl.textContent = formatPrice(0);
        return;
    }
    let html = '', total = 0;
    cart.forEach((item, index) => {
        const p = appData.products.find(prod => prod.id === item.id);
        if (!p) return;
        const price = p.price * item.qty;
        total += price;
        html += `<div class="cart-item">
            <div class="thumb">${p.image || '👗'}</div>
            <div class="details">
                <div class="name">${p.name_th}</div>
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
    toast('เพิ่มสินค้าลงตะกร้าเรียบร้อย');
}

function updateCartQty(index, dir) {
    if (index < 0 || index >= cart.length) return;
    const item = cart[index];
    item.qty += dir;
    if (item.qty <= 0) cart.splice(index, 1);
    renderCart();
}

function removeFromCart(index) { cart.splice(index, 1); renderCart(); toast('ลบสินค้าออกจากตะกร้า'); }

function showProductDetail(id) {
    const p = appData.products.find(prod => prod.id === id);
    if (!p) return;
    const overlay = document.getElementById('modalOverlay');
    const content = document.getElementById('modalContent');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    const submitBtn = document.getElementById('modalSubmitBtn');
    title.textContent = p.name_th;
    submitBtn.style.display = 'none';
    const sizes = p.sizes ? p.sizes.join(', ') : '-';
    body.innerHTML = `
        <div style="text-align:center;font-size:72px;margin:8px 0 16px;">${p.image || '👗'}</div>
        <p style="color:var(--gray);margin-bottom:12px;line-height:1.7;">${p.desc_th}</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:14px;margin-bottom:8px;">
            <div><strong>หมวดหมู่:</strong> ${getCategoryName(p.category)}</div>
            <div><strong>ราคา:</strong> <span style="color:var(--gold-dark);font-weight:700;font-family:var(--font-serif);font-size:20px;">${formatPrice(p.price)}</span></div>
            <div><strong>ไซส์:</strong> ${sizes}</div>
            <div><strong>รหัสสินค้า:</strong> #${p.id}</div>
        </div>
        <button class="btn btn-primary" style="width:100%;justify-content:center;margin-top:12px;" id="detailAddBtn"><i class="fas fa-shopping-bag"></i> เพิ่มลงตะกร้า</button>
    `;
    overlay.classList.add('open');
    document.getElementById('detailAddBtn').addEventListener('click', () => { addToCart(p.id); overlay.classList.remove('open'); });
    document.getElementById('modalCloseBtn').onclick = () => overlay.classList.remove('open');
    overlay.onclick = (e) => { if (e.target === overlay) overlay.classList.remove('open'); };
}

// --- CHECKOUT ---
async function checkout() {
    if (cart.length === 0) { toast('ตะกร้าของคุณว่างเปล่า', 'error'); return; }
    const total = cart.reduce((sum, item) => {
        const p = appData.products.find(prod => prod.id === item.id);
        return sum + (p ? p.price * item.qty : 0);
    }, 0);
    const order = {
        id: Date.now().toString().slice(-6),
        customer: 'ลูกค้า',
        date: new Date().toLocaleDateString(),
        total: total,
        status: 'pending',
        items: cart.map(item => ({ ...item })),
    };
    await saveOrder(order);
    cart = [];
    renderCart();
    renderAll();
    toast('คำสั่งซื้อของคุณได้รับการบันทึกแล้ว ขอบคุณ!');
    closeCart();
}

function openCart() { document.getElementById('cartOverlay').classList.add('open'); document.getElementById('cartDrawer').classList.add('open'); }
function closeCart() { document.getElementById('cartOverlay').classList.remove('open'); document.getElementById('cartDrawer').classList.remove('open'); }

// --- RENDER ALL ---
function renderAll() {
    renderCategories();
    renderProducts();
    renderCart();
    updateCategoryFilter();
    updateProductResults();
    document.getElementById('currencySelect').value = currentCurrency;
}

// --- EVENT LISTENERS ---
document.getElementById('cartBtn').addEventListener('click', openCart);
document.getElementById('cartCloseBtn').addEventListener('click', closeCart);
document.getElementById('cartOverlay').addEventListener('click', closeCart);
document.getElementById('checkoutBtn').addEventListener('click', checkout);

document.getElementById('currencySelect').addEventListener('change', (e) => {
    currentCurrency = e.target.value;
    renderAll();
});

document.getElementById('filterCategory').addEventListener('change', () => {
    selectedCategory = document.getElementById('filterCategory').value;
    renderCategories();
    renderProducts();
    updateProductResults();
});
document.getElementById('sortProducts').addEventListener('change', renderProducts);

// Mobile menu
document.getElementById('mobileMenuBtn').addEventListener('click', () => {
    const nav = document.getElementById('navLinks');
    nav.style.display = nav.style.display === 'flex' ? 'none' : 'flex';
    if (window.innerWidth <= 768) {
        nav.style.position = 'absolute';
        nav.style.top = '100%';
        nav.style.left = '0';
        nav.style.right = '0';
        nav.style.background = 'white';
        nav.style.padding = '20px 24px';
        nav.style.flexDirection = 'column';
        nav.style.gap = '16px';
        nav.style.boxShadow = 'var(--shadow)';
        nav.style.borderTop = '1px solid var(--light-gray)';
    }
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

document.getElementById('heroShopBtn').addEventListener('click', (e) => { e.preventDefault(); document.getElementById('productsSection').scrollIntoView({ behavior: 'smooth' }); });
document.getElementById('heroCollectionBtn').addEventListener('click', (e) => { e.preventDefault(); document.getElementById('categoriesSection').scrollIntoView({ behavior: 'smooth' }); });

window.addEventListener('scroll', () => {
    const header = document.getElementById('header');
    if (window.scrollY > 40) header.classList.add('scrolled');
    else header.classList.remove('scrolled');
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { document.getElementById('modalOverlay').classList.remove('open'); closeCart(); }
});

// --- INIT ---
(async function init() {
    await loadDataFromDB();
    renderAll();
    console.log('✅ Storefront ready – API:', API_URL);
})();