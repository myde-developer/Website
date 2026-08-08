// ============================================
// 🔥 Same API URL – ensure it matches your backend
// ============================================
const API_URL = 'https://website-219o.onrender.com/api';

// --- STATE ---
let appData = { products: [], categories: [], orders: [] };
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
        const [products, categories, orders] = await Promise.all([
            apiFetch('/products'),
            apiFetch('/categories'),
            apiFetch('/orders')
        ]);
        appData.products = products;
        appData.categories = categories;
        appData.orders = orders;
    } catch (e) {
        console.error('Failed to load:', e);
        toast('⚠️ Cannot connect to server.', 'error');
    }
}

// --- AUTH ---
async function adminLogin(username, password) {
    try {
        const res = await apiFetch('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        authToken = res.token;
        adminLoggedIn = true;
        await loadDataFromDB();
        renderAdmin();
        toast('✅ Login successful');
    } catch (e) {
        toast('❌ Invalid credentials', 'error');
    }
}

function adminLogout() {
    authToken = null;
    adminLoggedIn = false;
    renderAdmin();
    toast('👋 Logged out');
}

// --- CRUD OPERATIONS ---
async function addProduct(p) { await apiFetch('/products', { method: 'POST', body: JSON.stringify(p) }); await loadDataFromDB(); renderAdmin(); }
async function updateProduct(id, p) { await apiFetch(`/products/${id}`, { method: 'PUT', body: JSON.stringify(p) }); await loadDataFromDB(); renderAdmin(); }
async function deleteProduct(id) { await apiFetch(`/products/${id}`, { method: 'DELETE' }); await loadDataFromDB(); renderAdmin(); }
async function addCategory(c) { await apiFetch('/categories', { method: 'POST', body: JSON.stringify(c) }); await loadDataFromDB(); renderAdmin(); }
async function updateCategory(id, c) { await apiFetch(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(c) }); await loadDataFromDB(); renderAdmin(); }
async function deleteCategory(id) { await apiFetch(`/categories/${id}`, { method: 'DELETE' }); await loadDataFromDB(); renderAdmin(); }

// --- UTILITY ---
function t(thText, enText) { return 'th' === 'th' ? thText : enText; } // always th for admin (or could add lang switch)
function formatPrice(amount) { return '฿' + amount.toLocaleString(); }
function getCategoryName(catId) {
    const cat = appData.categories.find(c => c.id === catId);
    return cat ? cat.th : catId;
}
function toast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${message}`;
    container.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(30px)'; setTimeout(() => el.remove(), 300); }, 2800);
}

// --- RENDER ADMIN ---
function renderAdmin() {
    if (!adminLoggedIn) {
        renderLogin();
        return;
    }
    const content = document.getElementById('adminContent');
    switch (currentAdminTab) {
        case 'dashboard': renderDashboard(content); break;
        case 'products': renderProductsAdmin(content); break;
        case 'categories': renderCategoriesAdmin(content); break;
        case 'orders': renderOrdersAdmin(content); break;
        default: content.innerHTML = '<p>เลือกเมนู</p>';
    }
}

function renderLogin() {
    const content = document.getElementById('adminContent');
    content.innerHTML = `<div class="admin-login"><div class="admin-login-box">
        <h3><i class="fas fa-crown" style="color:var(--gold);"></i> Admin</h3>
        <p class="sub">เข้าสู่ระบบแผงควบคุม</p>
        <input type="text" id="adminUser" value="admin">
        <input type="password" id="adminPass" value="admin123">
        <button class="login-btn" id="adminLoginBtn">เข้าสู่ระบบ</button>
    </div></div>`;
    document.getElementById('adminLoginBtn').addEventListener('click', () => {
        adminLogin(document.getElementById('adminUser').value, document.getElementById('adminPass').value);
    });
    document.getElementById('adminPass').addEventListener('keydown', (e) => { if (e.key === 'Enter') document.getElementById('adminLoginBtn').click(); });
}

function renderDashboard(content) {
    const totalProducts = appData.products.length;
    const totalCategories = appData.categories.length;
    const totalOrders = appData.orders.length;
    const totalRevenue = appData.orders.reduce((s, o) => s + o.total, 0);
    content.innerHTML = `
        <div class="admin-stats">
            <div class="admin-stat"><div class="number">${totalProducts}</div><div class="label">สินค้า</div></div>
            <div class="admin-stat"><div class="number">${totalCategories}</div><div class="label">หมวดหมู่</div></div>
            <div class="admin-stat"><div class="number">${totalOrders}</div><div class="label">คำสั่งซื้อ</div></div>
            <div class="admin-stat"><div class="number">${formatPrice(totalRevenue)}</div><div class="label">ยอดขายรวม</div></div>
        </div>
        <div style="background:white;border-radius:var(--radius);padding:24px;box-shadow:var(--shadow);">
            <h4 style="margin-bottom:8px;">ยินดีต้อนรับสู่แผงควบคุม</h4>
            <p style="color:var(--gray);font-size:14px;">จัดการสินค้า หมวดหมู่ และคำสั่งซื้อจากเมนูด้านซ้าย</p>
        </div>
    `;
}

function renderProductsAdmin(content) {
    let html = `<div class="admin-table-wrap"><div class="table-header"><h4><i class="fas fa-box" style="color:var(--gold);"></i> รายการสินค้า</h4>
        <button class="add-btn" id="adminAddProductBtn"><i class="fas fa-plus"></i> เพิ่มสินค้า</button></div>
        <table class="admin-table"><thead><tr><th>#</th><th>ชื่อ</th><th>หมวดหมู่</th><th>ราคา</th><th>จัดการ</th></tr></thead><tbody>`;
    if (appData.products.length === 0) html += `<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--gray);">ยังไม่มีสินค้า</td></tr>`;
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
            if (confirm('ลบสินค้านี้ใช่หรือไม่?')) await deleteProduct(parseInt(btn.dataset.id));
        });
    });
}

function renderCategoriesAdmin(content) {
    let html = `<div class="admin-table-wrap"><div class="table-header"><h4><i class="fas fa-tags" style="color:var(--gold);"></i> หมวดหมู่</h4>
        <button class="add-btn" id="adminAddCategoryBtn"><i class="fas fa-plus"></i> เพิ่มหมวดหมู่</button></div>
        <table class="admin-table"><thead><tr><th>#</th><th>ชื่อไทย</th><th>ชื่ออังกฤษ</th><th>ไอคอน</th><th>สินค้า</th><th>จัดการ</th></tr></thead><tbody>`;
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
            if (confirm('ลบหมวดหมู่นี้ใช่หรือไม่?')) await deleteCategory(btn.dataset.id);
        });
    });
}

function renderOrdersAdmin(content) {
    let html = `<div class="admin-table-wrap"><div class="table-header"><h4><i class="fas fa-receipt" style="color:var(--gold);"></i> คำสั่งซื้อ</h4>
        <span style="font-size:13px;color:var(--gray);">${appData.orders.length} รายการ</span></div>
        <table class="admin-table"><thead><tr><th>เลขที่</th><th>ลูกค้า</th><th>วันที่</th><th>ยอดรวม</th><th>สถานะ</th></tr></thead><tbody>`;
    if (appData.orders.length === 0) html += `<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--gray);">ยังไม่มีคำสั่งซื้อ</td></tr>`;
    else {
        appData.orders.forEach(o => {
            const statusLabel = { pending: 'รอดำเนินการ', completed: 'เสร็จสิ้น', cancelled: 'ยกเลิก' } [o.status] || o.status;
            html += `<tr><td>#${o.id}</td><td>${o.customer}</td><td>${o.date}</td><td>${formatPrice(o.total)}</td><td><span class="badge">${statusLabel}</span></td></tr>`;
        });
    }
    html += `</tbody></table></div>`;
    content.innerHTML = html;
}

// --- MODALS (same as before) ---
function openProductModal(product = null) {
    const overlay = document.getElementById('modalOverlay');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    const submitBtn = document.getElementById('modalSubmitBtn');
    const form = document.getElementById('modalForm');
    editingItem = product;
    title.textContent = product ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่';
    submitBtn.textContent = product ? 'อัปเดต' : 'บันทึก';
    const catOptions = appData.categories.map(cat =>
        `<option value="${cat.id}" ${product && product.category === cat.id ? 'selected' : ''}>${cat.th}</option>`
    ).join('');
    const sizeOptions = ['S', 'M', 'L', 'XL', 'One Size'].map(s =>
        `<option value="${s}" ${product && product.sizes && product.sizes.includes(s) ? 'selected' : ''}>${s}</option>`
    ).join('');
    body.innerHTML = `
        <div class="form-group"><label>ชื่อภาษาไทย</label><input type="text" id="pNameTh" value="${product ? product.name_th : ''}" required></div>
        <div class="form-group"><label>ชื่อภาษาอังกฤษ</label><input type="text" id="pNameEn" value="${product ? product.name_en : ''}" required></div>
        <div class="form-row"><div class="form-group"><label>หมวดหมู่</label><select id="pCategory">${catOptions}</select></div>
        <div class="form-group"><label>ราคา (บาท)</label><input type="number" id="pPrice" value="${product ? product.price : ''}" required min="0"></div></div>
        <div class="form-group"><label>คำอธิบายภาษาไทย</label><textarea id="pDescTh">${product ? product.desc_th : ''}</textarea></div>
        <div class="form-group"><label>คำอธิบายภาษาอังกฤษ</label><textarea id="pDescEn">${product ? product.desc_en : ''}</textarea></div>
        <div class="form-row"><div class="form-group"><label>ไอคอน/อีโมจิ</label><input type="text" id="pImage" value="${product ? product.image : '👗'}" maxlength="4"></div>
        <div class="form-group"><label>ไซส์ (กด Ctrl เพื่อเลือกหลายรายการ)</label><select id="pSizes" multiple style="height:auto;min-height:60px;">${sizeOptions}</select></div></div>
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
        if (editingItem) { await updateProduct(editingItem.id, { ...editingItem, ...payload }); toast('อัปเดตสินค้าเรียบร้อย'); }
        else { await addProduct({ ...payload, id: Date.now() % 100000 }); toast('เพิ่มสินค้าเรียบร้อย'); }
        overlay.classList.remove('open');
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
    title.textContent = category ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่ใหม่';
    submitBtn.textContent = category ? 'อัปเดต' : 'บันทึก';
    const iconOptions = ['fa-vest', 'fa-shirt', 'fa-moon', 'fa-people-arrows', 'fa-calendar-check',
        'fa-shoe-prints', 'fa-bag-shopping', 'fa-gem', 'fa-clock', 'fa-gift'
    ].map(icon =>
        `<option value="${icon}" ${category && category.icon === icon ? 'selected' : ''}>${icon}</option>`
    ).join('');
    body.innerHTML = `
        <div class="form-group"><label>รหัสหมวดหมู่ (ภาษาอังกฤษ)</label><input type="text" id="cId" value="${category ? category.id : ''}" ${category ? 'readonly' : ''} required></div>
        <div class="form-group"><label>ชื่อภาษาไทย</label><input type="text" id="cTh" value="${category ? category.th : ''}" required></div>
        <div class="form-group"><label>ชื่อภาษาอังกฤษ</label><input type="text" id="cEn" value="${category ? category.en : ''}" required></div>
        <div class="form-group"><label>ไอคอน</label><select id="cIcon">${iconOptions}</select></div>
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
        if (category) { await updateCategory(category.id, payload); toast('อัปเดตหมวดหมู่เรียบร้อย'); }
        else { await addCategory(payload); toast('เพิ่มหมวดหมู่เรียบร้อย'); }
        overlay.classList.remove('open');
    };
    document.getElementById('modalCloseBtn').onclick = () => overlay.classList.remove('open');
    overlay.onclick = (e) => { if (e.target === overlay) overlay.classList.remove('open'); };
}

// --- SIDEBAR NAVIGATION ---
document.querySelectorAll('.admin-sidebar .menu-item').forEach(el => {
    el.addEventListener('click', () => {
        const tab = el.dataset.tab;
        if (tab) {
            currentAdminTab = tab;
            document.querySelectorAll('.admin-sidebar .menu-item').forEach(item => item.classList.toggle('active', item.dataset.tab === tab));
            renderAdmin();
        }
    });
});

// --- LOGOUT ---
document.getElementById('adminLogoutBtn').addEventListener('click', adminLogout);

// --- INIT ---
(async function init() {
    await loadDataFromDB();
    renderAdmin();
    console.log('✅ Admin panel ready – API:', API_URL);
})();