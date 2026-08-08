// ============================================
// 🔥 UPDATE API_URL with your deployed backend
// ============================================
const API_URL = 'https://website-219o.onrender.com/api';

// --- STATE ---
let appData = { products: [], categories: [], orders: [] };
let adminLoggedIn = false;
let currentAdminTab = 'dashboard';
let editingItem = null;
let authToken = null;

// --- LANGUAGE & CURRENCY STATE ---
let adminLang = 'th';
let adminCurrency = 'thb';

// --- TRANSLATION HELPER ---
function t(thText, enText) {
    return adminLang === 'th' ? thText : enText;
}

function formatPrice(amount) {
    if (adminCurrency === 'thb') return '฿' + amount.toLocaleString();
    const usd = Math.round(amount / 35);
    return '$' + usd.toLocaleString();
}

// ============================================
// 🔥 LIBRETRANSLATE INTEGRATION
// ============================================
async function translateText(text, targetLang = 'th') {
    if (!text.trim()) return text;
    try {
        const response = await fetch('https://libretranslate.com/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                q: text,
                source: 'en',
                target: targetLang,
                format: 'text'
            })
        });
        if (!response.ok) throw new Error('Translation API error');
        const data = await response.json();
        return data.translatedText;
    } catch (error) {
        console.error('Translation failed:', error);
        toast('⚠️ ' + t('ไม่สามารถแปลได้ โปรดลองอีกครั้ง', 'Translation failed, please try again'), 'error');
        return text; // fallback to original
    }
}

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
        toast('✅ ' + t('เข้าสู่ระบบสำเร็จ', 'Login successful'));
    } catch (e) {
        toast('❌ ' + t('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', 'Invalid credentials'), 'error');
    }
}

function adminLogout() {
    authToken = null;
    adminLoggedIn = false;
    renderAdmin();
    toast('👋 ' + t('ออกจากระบบ', 'Logged out'));
}

// --- CRUD OPERATIONS ---
async function addProduct(p) { await apiFetch('/products', { method: 'POST', body: JSON.stringify(p) }); await loadDataFromDB(); renderAdmin(); }
async function updateProduct(id, p) { await apiFetch(`/products/${id}`, { method: 'PUT', body: JSON.stringify(p) }); await loadDataFromDB(); renderAdmin(); }
async function deleteProduct(id) { await apiFetch(`/products/${id}`, { method: 'DELETE' }); await loadDataFromDB(); renderAdmin(); }
async function addCategory(c) { await apiFetch('/categories', { method: 'POST', body: JSON.stringify(c) }); await loadDataFromDB(); renderAdmin(); }
async function updateCategory(id, c) { await apiFetch(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(c) }); await loadDataFromDB(); renderAdmin(); }
async function deleteCategory(id) { await apiFetch(`/categories/${id}`, { method: 'DELETE' }); await loadDataFromDB(); renderAdmin(); }

function getCategoryName(catId) {
    const cat = appData.categories.find(c => c.id === catId);
    return cat ? (adminLang === 'th' ? cat.th : cat.en) : catId;
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
        default: content.innerHTML = '<p>'+t('เลือกเมนู', 'Select menu')+'</p>';
    }
    // Sync dropdowns
    document.getElementById('adminLangSelect').value = adminLang;
    document.getElementById('adminCurrencySelect').value = adminCurrency;
}

function renderLogin() {
    const content = document.getElementById('adminContent');
    content.innerHTML = `<div class="admin-login"><div class="admin-login-box">
        <h3><i class="fas fa-crown" style="color:var(--gold);"></i> Admin</h3>
        <p class="sub">${t('เข้าสู่ระบบแผงควบคุม', 'Admin Login')}</p>
        <input type="text" id="adminUser" value="admin">
        <input type="password" id="adminPass" value="admin123">
        <button class="login-btn" id="adminLoginBtn">${t('เข้าสู่ระบบ', 'Login')}</button>
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
            <div class="admin-stat"><div class="number">${totalProducts}</div><div class="label">${t('สินค้า', 'Products')}</div></div>
            <div class="admin-stat"><div class="number">${totalCategories}</div><div class="label">${t('หมวดหมู่', 'Categories')}</div></div>
            <div class="admin-stat"><div class="number">${totalOrders}</div><div class="label">${t('คำสั่งซื้อ', 'Orders')}</div></div>
            <div class="admin-stat"><div class="number">${formatPrice(totalRevenue)}</div><div class="label">${t('ยอดขายรวม', 'Revenue')}</div></div>
        </div>
        <div style="background:white;border-radius:var(--radius);padding:24px;box-shadow:var(--shadow);">
            <h4 style="margin-bottom:8px;">${t('ยินดีต้อนรับสู่แผงควบคุม', 'Welcome to Admin Panel')}</h4>
            <p style="color:var(--gray);font-size:14px;">${t('จัดการสินค้า หมวดหมู่ และคำสั่งซื้อจากเมนูด้านซ้าย', 'Manage products, categories, and orders from the left menu.')}</p>
        </div>
    `;
}

function renderProductsAdmin(content) {
    let html = `<div class="admin-table-wrap"><div class="table-header"><h4><i class="fas fa-box" style="color:var(--gold);"></i> ${t('รายการสินค้า', 'Products')}</h4>
        <button class="add-btn" id="adminAddProductBtn"><i class="fas fa-plus"></i> ${t('เพิ่มสินค้า', 'Add Product')}</button></div>
        <table class="admin-table"><thead><tr><th>#</th><th>${t('ชื่อ', 'Name')}</th><th>${t('หมวดหมู่', 'Category')}</th><th>${t('ราคา', 'Price')}</th><th>${t('จัดการ', 'Actions')}</th></tr></thead><tbody>`;
    if (appData.products.length === 0) html += `<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--gray);">${t('ยังไม่มีสินค้า', 'No products')}</td></tr>`;
    else {
        appData.products.forEach(p => {
            html += `<tr><td>${p.id}</td><td>${adminLang === 'th' ? p.name_th : p.name_en}</td>
                <td><span class="badge">${getCategoryName(p.category)}</span></td>
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
            if (confirm(t('ลบสินค้านี้ใช่หรือไม่?', 'Delete this product?'))) await deleteProduct(parseInt(btn.dataset.id));
        });
    });
}

function renderCategoriesAdmin(content) {
    let html = `<div class="admin-table-wrap"><div class="table-header"><h4><i class="fas fa-tags" style="color:var(--gold);"></i> ${t('หมวดหมู่', 'Categories')}</h4>
        <button class="add-btn" id="adminAddCategoryBtn"><i class="fas fa-plus"></i> ${t('เพิ่มหมวดหมู่', 'Add Category')}</button></div>
        <table class="admin-table"><thead><tr><th>#</th><th>${t('ชื่อภาษาไทย', 'Thai Name')}</th><th>${t('ชื่อภาษาอังกฤษ', 'English Name')}</th><th>${t('ไอคอน', 'Icon')}</th><th>${t('สินค้า', 'Products')}</th><th>${t('จัดการ', 'Actions')}</th></tr></thead><tbody>`;
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
            if (confirm(t('ลบหมวดหมู่นี้ใช่หรือไม่?', 'Delete this category?'))) await deleteCategory(btn.dataset.id);
        });
    });
}

function renderOrdersAdmin(content) {
    let html = `<div class="admin-table-wrap"><div class="table-header"><h4><i class="fas fa-receipt" style="color:var(--gold);"></i> ${t('คำสั่งซื้อ', 'Orders')}</h4>
        <span style="font-size:13px;color:var(--gray);">${appData.orders.length} ${t('รายการ', 'orders')}</span></div>
        <table class="admin-table"><thead><tr><th>${t('เลขที่', 'Order #')}</th><th>${t('ลูกค้า', 'Customer')}</th><th>${t('วันที่', 'Date')}</th><th>${t('ยอดรวม', 'Total')}</th><th>${t('สถานะ', 'Status')}</th></tr></thead><tbody>`;
    if (appData.orders.length === 0) html += `<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--gray);">${t('ยังไม่มีคำสั่งซื้อ', 'No orders')}</td></tr>`;
    else {
        appData.orders.forEach(o => {
            const statusLabel = { pending: t('รอดำเนินการ', 'Pending'), completed: t('เสร็จสิ้น', 'Completed'), cancelled: t('ยกเลิก', 'Cancelled') } [o.status] || o.status;
            html += `<tr><td>#${o.id}</td><td>${o.customer}</td><td>${o.date}</td><td>${formatPrice(o.total)}</td><td><span class="badge">${statusLabel}</span></td></tr>`;
        });
    }
    html += `</tbody></table></div>`;
    content.innerHTML = html;
}

// --- MODALS WITH LIBRETRANSLATE INTEGRATION ---
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
        `<option value="${cat.id}" ${product && product.category === cat.id ? 'selected' : ''}>${adminLang === 'th' ? cat.th : cat.en}</option>`
    ).join('');
    const sizeOptions = ['S', 'M', 'L', 'XL', 'One Size'].map(s =>
        `<option value="${s}" ${product && product.sizes && product.sizes.includes(s) ? 'selected' : ''}>${s}</option>`
    ).join('');

    // Build modal HTML with Auto-Translate button
    body.innerHTML = `
        <div class="form-group">
            <label>${t('ชื่อภาษาไทย', 'Thai Name')}</label>
            <input type="text" id="pNameTh" value="${product ? product.name_th : ''}" required>
        </div>
        <div class="form-group">
            <label>${t('ชื่อภาษาอังกฤษ', 'English Name')}</label>
            <div style="display:flex;gap:8px;align-items:center;">
                <input type="text" id="pNameEn" value="${product ? product.name_en : ''}" required style="flex:1;">
                <button type="button" class="btn btn-primary" id="autoTranslateBtn" style="padding:8px 16px;font-size:12px;white-space:nowrap;">
                    <i class="fas fa-language"></i> ${t('แปลอัตโนมัติ', 'Auto-Translate')}
                </button>
            </div>
            <small style="color:var(--gray);">${t('ป้อนภาษาอังกฤษ แล้วกดปุ่มเพื่อแปลเป็นไทย', 'Enter English and click button to translate to Thai')}</small>
        </div>
        <div class="form-row">
            <div class="form-group"><label>${t('หมวดหมู่', 'Category')}</label><select id="pCategory">${catOptions}</select></div>
            <div class="form-group"><label>${t('ราคา (บาท)', 'Price (THB)')}</label><input type="number" id="pPrice" value="${product ? product.price : ''}" required min="0"></div>
        </div>
        <div class="form-group">
            <label>${t('คำอธิบายภาษาไทย', 'Thai Description')}</label>
            <textarea id="pDescTh">${product ? product.desc_th : ''}</textarea>
        </div>
        <div class="form-group">
            <label>${t('คำอธิบายภาษาอังกฤษ', 'English Description')}</label>
            <textarea id="pDescEn">${product ? product.desc_en : ''}</textarea>
        </div>
        <div class="form-row">
            <div class="form-group"><label>${t('ไอคอน/อีโมจิ', 'Icon/Emoji')}</label><input type="text" id="pImage" value="${product ? product.image : '👗'}" maxlength="4"></div>
            <div class="form-group"><label>${t('ไซส์ (กด Ctrl เพื่อเลือกหลายรายการ)', 'Sizes (Ctrl+Click)')}</label><select id="pSizes" multiple style="height:auto;min-height:60px;">${sizeOptions}</select></div>
        </div>
    `;

    overlay.classList.add('open');

    // --- AUTO-TRANSLATE BUTTON LOGIC ---
    const translateBtn = document.getElementById('autoTranslateBtn');
    if (translateBtn) {
        translateBtn.addEventListener('click', async () => {
            const nameEn = document.getElementById('pNameEn').value.trim();
            const descEn = document.getElementById('pDescEn').value.trim();
            
            if (!nameEn && !descEn) {
                toast(t('กรุณากรอกข้อมูลภาษาอังกฤษก่อน', 'Please enter English text first'), 'error');
                return;
            }

            // Show loading state
            translateBtn.disabled = true;
            translateBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${t('กำลังแปล...', 'Translating...')}`;

            try {
                // Translate name
                if (nameEn) {
                    const nameTh = await translateText(nameEn, 'th');
                    document.getElementById('pNameTh').value = nameTh;
                }
                // Translate description
                if (descEn) {
                    const descTh = await translateText(descEn, 'th');
                    document.getElementById('pDescTh').value = descTh;
                }
                toast(t('แปลสำเร็จ ✅', 'Translation successful ✅'));
            } catch (error) {
                toast(t('การแปลล้มเหลว ❌', 'Translation failed ❌'), 'error');
            } finally {
                translateBtn.disabled = false;
                translateBtn.innerHTML = `<i class="fas fa-language"></i> ${t('แปลอัตโนมัติ', 'Auto-Translate')}`;
            }
        });
    }

    // --- FORM SUBMIT ---
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
        if (editingItem) { 
            await updateProduct(editingItem.id, { ...editingItem, ...payload }); 
            toast(t('อัปเดตสินค้าเรียบร้อย', 'Product updated')); 
        } else { 
            await addProduct({ ...payload, id: Date.now() % 100000 }); 
            toast(t('เพิ่มสินค้าเรียบร้อย', 'Product added')); 
        }
        overlay.classList.remove('open');
    };

    // Close handlers
    document.getElementById('modalCloseBtn').onclick = () => overlay.classList.remove('open');
    overlay.onclick = (e) => { if (e.target === overlay) overlay.classList.remove('open'); };
}

// --- CATEGORY MODAL (no translation needed, but keep it) ---
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
        <div class="form-group"><label>${t('รหัสหมวดหมู่ (ภาษาอังกฤษ)', 'Category ID (English)')}</label><input type="text" id="cId" value="${category ? category.id : ''}" ${category ? 'readonly' : ''} required></div>
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
        if (category) { await updateCategory(category.id, payload); toast(t('อัปเดตหมวดหมู่เรียบร้อย', 'Category updated')); }
        else { await addCategory(payload); toast(t('เพิ่มหมวดหมู่เรียบร้อย', 'Category added')); }
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

// --- LANGUAGE & CURRENCY DROPDOWN EVENTS ---
document.getElementById('adminLangSelect').addEventListener('change', (e) => {
    adminLang = e.target.value;
    renderAdmin();
});
document.getElementById('adminCurrencySelect').addEventListener('change', (e) => {
    adminCurrency = e.target.value;
    renderAdmin();
});

// --- LOGOUT ---
document.getElementById('adminLogoutBtn').addEventListener('click', adminLogout);

// --- INIT ---
(async function init() {
    await loadDataFromDB();
    renderAdmin();
    console.log('✅ Admin panel ready – API:', API_URL);
})();