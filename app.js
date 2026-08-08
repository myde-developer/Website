// ============================================
// 🔥 UPDATE API_URL with your deployed backend
// ============================================
const API_URL = 'https://website-219o.onrender.com/api';

// --- STATE ---
let appData = { products: [], categories: [], orders: [] };
let currentLang = 'th';
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

function getProductName(p) { return currentLang === 'th' ? p.name_th : p.name_en; }
function getProductDesc(p) { return currentLang === 'th' ? p.desc_th : p.desc_en; }

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
        grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 0;color:var(--gray);"><i class="fas fa-box-open" style="font-size:48px;display:block;margin-bottom:12px;color:var(--light-gray);"></i> ไม่พบสินค้า</div>`;
        return;
    }
    grid.innerHTML = filtered.map(p => `
        <div class="product-card" data-id="${p.id}">
            <div class="image">
                ${p.image && p.image.startsWith('http') ? 
                    `<img src="${p.image}" alt="${getProductName(p)}" style="width:100%;height:100%;object-fit:cover;">` : 
                    `<span style="font-size:56px;">${p.image || '👗'}</span>`
                }
                <span class="tag">${getCategoryName(p.category)}</span>
            </div>
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
        container.innerHTML = `<div class="cart-empty"><i class="fas fa-shopping-bag"></i><p>${currentLang === 'th' ? 'ตะกร้าของคุณว่างเปล่า' : 'Your cart is empty'}</p></div>`;
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
            <div class="thumb">${p.image && p.image.startsWith('http') ? `<img src="${p.image}" style="width:100%;height:100%;object-fit:cover;border-radius:4px;">` : (p.image || '👗')}</div>
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

function removeFromCart(index) { cart.splice(index, 1); renderCart(); toast(t('ลบสินค้าออกจากตะกร้า', 'Removed from cart')); }

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
        <div style="text-align:center;font-size:72px;margin:8px 0 16px;">
            ${p.image && p.image.startsWith('http') ? `<img src="${p.image}" style="max-width:100%;max-height:300px;border-radius:8px;">` : (p.image || '👗')}
        </div>
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
    document.getElementById('detailAddBtn').addEventListener('click', () => { addToCart(p.id); overlay.classList.remove('open'); });
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

function openCart() { document.getElementById('cartOverlay').classList.add('open'); document.getElementById('cartDrawer').classList.add('open'); }
function closeCart() { document.getElementById('cartOverlay').classList.remove('open'); document.getElementById('cartDrawer').classList.remove('open'); }

// --- RENDER ALL ---
function renderAll() {
    renderCategories();
    renderProducts();
    renderCart();
    updateCategoryFilter();
    updateProductResults();
    updateHeaderText();
    document.getElementById('langSelect').value = currentLang;
    document.getElementById('currencySelect').value = currentCurrency;
}

function updateHeaderText() {
    document.getElementById('heroDesc').textContent = t(
        'ค้นพบคอลเลกชันแฟชั่นชั้นนำของไทย ตั้งแต่ชุดราตรีไปจนถึงเครื่องประดับสุดหรู พร้อมจัดส่งทั่วประเทศ',
        'Discover Thailand\'s premier fashion collection, from evening gowns to luxury accessories, nationwide delivery.'
    );
    document.getElementById('heroShopBtn').innerHTML = `<i class="fas fa-shopping-bag"></i> ${t('ช้อปเลย', 'Shop Now')}`;
    document.getElementById('heroCollectionBtn').textContent = t('ดูคอลเลกชัน', 'View Collection');
    document.getElementById('categorySubtitle').textContent = t('เลือกหมวดหมู่ที่คุณสนใจ', 'Choose your category');
    document.getElementById('productSubtitle').textContent = t('คอลเลกชันล่าสุด', 'Latest Collection');
    const navTexts = t(['หน้าหลัก', 'สินค้า', 'หมวดหมู่', 'เกี่ยวกับ'], ['Home', 'Products', 'Categories', 'About']);
    document.querySelectorAll('.nav-links a').forEach((el, i) => { if (i < navTexts.length) el.textContent = navTexts[i]; });
    document.querySelector('.cart-drawer .header h3').textContent = t('🛍️ ตะกร้าสินค้า', '🛍️ Shopping Cart');
    document.getElementById('checkoutBtn').textContent = t('ดำเนินการชำระเงิน', 'Checkout');
    updateCategoryFilter();
    updateProductResults();
}

// --- EVENT LISTENERS ---
document.getElementById('cartBtn').addEventListener('click', openCart);
document.getElementById('cartCloseBtn').addEventListener('click', closeCart);
document.getElementById('cartOverlay').addEventListener('click', closeCart);
document.getElementById('checkoutBtn').addEventListener('click', checkout);

document.getElementById('langSelect').addEventListener('change', (e) => {
    currentLang = e.target.value;
    renderAll();
});
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