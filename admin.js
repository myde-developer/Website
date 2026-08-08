// ============================================
// 🔥 UPDATE API_URL with your deployed backend
// ============================================
const API_URL = 'https://website-219o.onrender.com/api';

// --- STATE ---
let appData = { products: [], categories: [], orders: [] };
let adminLoggedIn = false;
let currentAdminTab = 'dashboard';
let editingItem = null;
let authToken = localStorage.getItem('adminToken');
let adminLang = localStorage.getItem('adminLang') || 'th';
let adminCurrency = localStorage.getItem('adminCurrency') || 'thb';
let uploadedImageUrl = null;
let searchTerm = '';

if (authToken) adminLoggedIn = true;

function t(thText, enText) {
    return adminLang === 'th' ? thText : enText;
}

function formatPrice(amount) {
    if (adminCurrency === 'thb') return '฿' + amount.toLocaleString();
    const usd = Math.round(amount / 35);
    return '$' + usd.toLocaleString();
}

// ============================================
// 🔥 TRANSLATE API
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
        toast('⚠️ ' + t('ไม่สามารถแปลได้', 'Translation failed'), 'error');
        return text;
    }
}

// ============================================
// 🔥 IMAGE UPLOAD
// ============================================
async function uploadImage(file) {
    const formData = new FormData();
    formData.append('image', file);

    try {
        const response = await fetch(`${API_URL}/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}` },
            body: formData
        });
        if (!response.ok) throw new Error('Upload failed');
        const data = await response.json();
        return data.url;
    } catch (error) {
        console.error('Upload failed:', error);
        toast('❌ ' + t('อัปโหลดล้มเหลว', 'Upload failed'), 'error');
        return null;
    }
}

// ============================================
// 🔥 API HELPER
// ============================================
async function apiFetch(endpoint, options = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}

// ============================================
// 🔥 LOAD DATA
// ============================================
function showLoading() {
    const content = document.getElementById('adminContent');
    if (content) {
        content.innerHTML = `
            <div style="display:flex;justify-content:center;align-items:center;height:200px;">
                <div style="text-align:center;">
                    <i class="fas fa-spinner fa-spin" style="font-size:40px;color:#c9a84c;"></i>
                    <p style="margin-top:10px;color:#8a7e7a;">${t('กำลังโหลด...', 'Loading...')}</p>
                </div>
            </div>
        `;
    }
}

async function loadDataFromDB() {
    showLoading();
    try {
        const [products, categories, orders] = await Promise.all([
            apiFetch('/products'),
            apiFetch('/categories'),
            apiFetch('/orders')
        ]);
        appData.products = products;
        appData.categories = categories;
        appData.orders = orders;
        return { products, categories, orders };
    } catch (e) {
        console.error('Failed to load:', e);
        toast('⚠️ ' + t('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์', 'Cannot connect to server'), 'error');
        return null;
    }
}

// ============================================
// 🔥 AUTH
// ============================================
async function adminLogin(username, password) {
    try {
        const res = await apiFetch('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        authToken = res.token;
        localStorage.setItem('adminToken', authToken);
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
    localStorage.removeItem('adminToken');
    adminLoggedIn = false;
    renderAdmin();
    toast('👋 ' + t('ออกจากระบบ', 'Logged out'));
}

// ============================================
// 🔥 PRODUCT CRUD
// ============================================
async function addProduct(productData) {
    try {
        const response = await apiFetch('/products', { method: 'POST', body: JSON.stringify(productData) });
        await loadDataFromDB();
        renderAdmin();
        toast('✅ ' + t('เพิ่มสินค้าเรียบร้อย', 'Product added'));
        return response;
    } catch (error) {
        toast('❌ ' + t('ไม่สามารถเพิ่มสินค้าได้', 'Failed to add'), 'error');
        return null;
    }
}

async function updateProduct(productId, updatedData) {
    try {
        const response = await apiFetch(`/products/${productId}`, { method: 'PUT', body: JSON.stringify(updatedData) });
        await loadDataFromDB();
        renderAdmin();
        toast('✅ ' + t('อัปเดตสินค้าเรียบร้อย', 'Product updated'));
        return response;
    } catch (error) {
        toast('❌ ' + t('ไม่สามารถอัปเดตสินค้าได้', 'Failed to update'), 'error');
        return null;
    }
}

async function deleteProduct(productId) {
    try {
        if (!confirm(t('ลบสินค้านี้ใช่หรือไม่?', 'Delete this product?'))) return;
        await apiFetch(`/products/${productId}`, { method: 'DELETE' });
        await loadDataFromDB();
        renderAdmin();
        toast('✅ ' + t('ลบสินค้าเรียบร้อย', 'Product deleted'));
    } catch (error) {
        toast('❌ ' + t('ไม่สามารถลบสินค้าได้', 'Failed to delete'), 'error');
    }
}

// ============================================
// 🔥 CATEGORY CRUD
// ============================================
async function addCategory(categoryData) {
    try {
        const response = await apiFetch('/categories', { method: 'POST', body: JSON.stringify(categoryData) });
        await loadDataFromDB();
        renderAdmin();
        toast('✅ ' + t('เพิ่มหมวดหมู่เรียบร้อย', 'Category added'));
        return response;
    } catch (error) {
        toast('❌ ' + t('ไม่สามารถเพิ่มหมวดหมู่ได้', 'Failed to add'), 'error');
        return null;
    }
}

async function updateCategory(categoryId, updatedData) {
    try {
        const response = await apiFetch(`/categories/${categoryId}`, { method: 'PUT', body: JSON.stringify(updatedData) });
        await loadDataFromDB();
        renderAdmin();
        toast('✅ ' + t('อัปเดตหมวดหมู่เรียบร้อย', 'Category updated'));
        return response;
    } catch (error) {
        toast('❌ ' + t('ไม่สามารถอัปเดตหมวดหมู่ได้', 'Failed to update'), 'error');
        return null;
    }
}

async function deleteCategory(categoryId) {
    try {
        const hasProducts = appData.products.some(p => p.category === categoryId);
        if (hasProducts) {
            toast('❌ ' + t('มีสินค้าอยู่ในหมวดหมู่นี้', 'Category has products'), 'error');
            return;
        }
        if (!confirm(t('ลบหมวดหมู่นี้ใช่หรือไม่?', 'Delete this category?'))) return;
        await apiFetch(`/categories/${categoryId}`, { method: 'DELETE' });
        await loadDataFromDB();
        renderAdmin();
        toast('✅ ' + t('ลบหมวดหมู่เรียบร้อย', 'Category deleted'));
    } catch (error) {
        toast('❌ ' + t('ไม่สามารถลบหมวดหมู่ได้', 'Failed to delete'), 'error');
    }
}

function getCategoryName(catId) {
    const cat = appData.categories.find(c => c.id === catId);
    return cat ? (adminLang === 'th' ? cat.th : cat.en) : catId;
}

function toast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${message}`;
    container.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(30px)'; setTimeout(() => el.remove(), 300); }, 2800);
}

// ============================================
// 🔥 RENDER FUNCTIONS
// ============================================
function renderAdmin() {
    console.log('🔄 renderAdmin() called, loggedIn:', adminLoggedIn);
    
    if (!adminLoggedIn) {
        renderLogin();
        return;
    }
    const content = document.getElementById('adminContent');
    if (!content) return;
    
    switch (currentAdminTab) {
        case 'dashboard': renderDashboard(content); break;
        case 'products': renderProductsAdmin(content); break;
        case 'categories': renderCategoriesAdmin(content); break;
        case 'orders': renderOrdersAdmin(content); break;
        default: content.innerHTML = '<p>'+t('เลือกเมนู', 'Select menu')+'</p>';
    }
    
    const langSelect = document.getElementById('adminLangSelect');
    const currencySelect = document.getElementById('adminCurrencySelect');
    if (langSelect) langSelect.value = adminLang;
    if (currencySelect) currencySelect.value = adminCurrency;
}

function renderLogin() {
    const content = document.getElementById('adminContent');
    if (!content) return;
    
    content.innerHTML = `
        <div class="admin-login">
            <div class="admin-login-box">
                <h3><i class="fas fa-crown" style="color:#c9a84c;"></i> Admin</h3>
                <p class="sub">${t('เข้าสู่ระบบแผงควบคุม', 'Admin Login')}</p>
                <input type="text" id="adminUser" placeholder="${t('ชื่อผู้ใช้', 'Username')}" value="admin">
                <input type="password" id="adminPass" placeholder="${t('รหัสผ่าน', 'Password')}" value="admin123">
                <button class="login-btn" id="adminLoginBtn">${t('เข้าสู่ระบบ', 'Login')}</button>
            </div>
        </div>
    `;
    
    document.getElementById('adminLoginBtn').addEventListener('click', () => {
        adminLogin(document.getElementById('adminUser').value, document.getElementById('adminPass').value);
    });
    document.getElementById('adminPass').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') document.getElementById('adminLoginBtn').click();
    });
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
        <div style="background:white;border-radius:16px;padding:24px;box-shadow:0 8px 32px rgba(26,20,16,0.12);">
            <h4 style="margin-bottom:8px;">${t('ยินดีต้อนรับสู่แผงควบคุม', 'Welcome to Admin Panel')}</h4>
            <p style="color:#8a7e7a;font-size:14px;">${t('จัดการสินค้า หมวดหมู่ และคำสั่งซื้อจากเมนูด้านซ้าย', 'Manage products, categories, and orders from the left menu.')}</p>
        </div>
    `;
}

function renderProductsAdmin(content) {
    let filteredProducts = appData.products;
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredProducts = appData.products.filter(p => 
            p.name_th.toLowerCase().includes(term) ||
            p.name_en.toLowerCase().includes(term) ||
            getCategoryName(p.category).toLowerCase().includes(term)
        );
    }

    let html = `
        <div class="admin-table-wrap">
            <div class="table-header">
                <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;width:100%;">
                    <h4><i class="fas fa-box" style="color:#c9a84c;"></i> ${t('รายการสินค้า', 'Products')}</h4>
                    <div style="flex:1;min-width:200px;display:flex;gap:8px;">
                        <input type="text" id="productSearch" placeholder="${t('ค้นหาสินค้า...', 'Search products...')}" class="search-input">
                        <button class="add-btn" id="adminAddProductBtn" style="white-space:nowrap;">
                            <i class="fas fa-plus"></i> ${t('เพิ่มสินค้า', 'Add Product')}
                        </button>
                    </div>
                </div>
            </div>
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>${t('รูป', 'Image')}</th>
                        <th>#</th>
                        <th>${t('ชื่อ', 'Name')}</th>
                        <th>${t('หมวดหมู่', 'Category')}</th>
                        <th>${t('ราคา', 'Price')}</th>
                        <th>${t('จัดการ', 'Actions')}</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    if (filteredProducts.length === 0) {
        html += `<tr><td colspan="6" style="text-align:center;padding:40px;color:#8a7e7a;">
            ${searchTerm ? t('ไม่พบสินค้าที่ค้นหา', 'No products found') : t('ยังไม่มีสินค้า', 'No products')}
        </td></tr>`;
    } else {
        filteredProducts.forEach(p => {
            const imageDisplay = p.image && p.image.startsWith('http') ? 
                `<img src="${p.image}" style="width:50px;height:50px;object-fit:cover;border-radius:4px;">` : 
                `<span style="font-size:24px;">${p.image || '👗'}</span>`;
            
            html += `
                <tr>
                    <td>${imageDisplay}</td>
                    <td>${p.id}</td>
                    <td>${adminLang === 'th' ? p.name_th : p.name_en}</td>
                    <td><span class="badge">${getCategoryName(p.category)}</span></td>
                    <td>${formatPrice(p.price)}</td>
                    <td>
                        <div class="actions">
                            <button class="edit-btn" data-id="${p.id}"><i class="fas fa-edit"></i></button>
                            <button class="del-btn" data-id="${p.id}"><i class="fas fa-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `;
        });
    }
    
    html += `</tbody></table></div>`;
    content.innerHTML = html;
    
    // Search handler
    document.getElementById('productSearch')?.addEventListener('input', (e) => {
        searchTerm = e.target.value;
        renderProductsAdmin(content);
    });
    
    // Add Product button
    document.getElementById('adminAddProductBtn')?.addEventListener('click', () => {
        console.log('🟢 Add Product clicked');
        openProductModal();
    });
    
    // Edit buttons
    content.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.dataset.id);
            const product = appData.products.find(p => p.id === id);
            if (product) openProductModal(product);
        });
    });
    
    // Delete buttons
    content.querySelectorAll('.del-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.dataset.id);
            deleteProduct(id);
        });
    });
}

function renderCategoriesAdmin(content) {
    let html = `
        <div class="admin-table-wrap">
            <div class="table-header">
                <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;width:100%;">
                    <h4><i class="fas fa-tags" style="color:#c9a84c;"></i> ${t('หมวดหมู่', 'Categories')}</h4>
                    <button class="add-btn" id="adminAddCategoryBtn" style="white-space:nowrap;">
                        <i class="fas fa-plus"></i> ${t('เพิ่มหมวดหมู่', 'Add Category')}
                    </button>
                </div>
            </div>
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>${t('ชื่อภาษาไทย', 'Thai Name')}</th>
                        <th>${t('ชื่อภาษาอังกฤษ', 'English Name')}</th>
                        <th>${t('ไอคอน', 'Icon')}</th>
                        <th>${t('สินค้า', 'Products')}</th>
                        <th>${t('จัดการ', 'Actions')}</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    appData.categories.forEach(cat => {
        const count = appData.products.filter(p => p.category === cat.id).length;
        html += `
            <tr>
                <td>${cat.id}</td>
                <td>${cat.th}</td>
                <td>${cat.en}</td>
                <td><i class="fas ${cat.icon}"></i></td>
                <td>${count}</td>
                <td>
                    <div class="actions">
                        <button class="edit-btn" data-id="${cat.id}"><i class="fas fa-edit"></i></button>
                        <button class="del-btn" data-id="${cat.id}" ${count > 0 ? 'disabled style="opacity:0.4;cursor:not-allowed;"' : ''}>
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    html += `</tbody></table></div>`;
    content.innerHTML = html;
    
    // Add Category button
    document.getElementById('adminAddCategoryBtn')?.addEventListener('click', () => {
        console.log('🟢 Add Category clicked');
        openCategoryModal();
    });
    
    // Edit buttons
    content.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const catId = btn.dataset.id;
            const category = appData.categories.find(c => c.id === catId);
            if (category) openCategoryModal(category);
        });
    });
    
    // Delete buttons
    content.querySelectorAll('.del-btn:not([disabled])').forEach(btn => {
        btn.addEventListener('click', () => {
            const catId = btn.dataset.id;
            deleteCategory(catId);
        });
    });
}

function renderOrdersAdmin(content) {
    let html = `
        <div class="admin-table-wrap">
            <div class="table-header">
                <h4><i class="fas fa-receipt" style="color:#c9a84c;"></i> ${t('คำสั่งซื้อ', 'Orders')}</h4>
                <span style="font-size:13px;color:#8a7e7a;">${appData.orders.length} ${t('รายการ', 'orders')}</span>
            </div>
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>${t('เลขที่', 'Order #')}</th>
                        <th>${t('ลูกค้า', 'Customer')}</th>
                        <th>${t('วันที่', 'Date')}</th>
                        <th>${t('ยอดรวม', 'Total')}</th>
                        <th>${t('สถานะ', 'Status')}</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    if (appData.orders.length === 0) {
        html += `<tr><td colspan="5" style="text-align:center;padding:40px;color:#8a7e7a;">${t('ยังไม่มีคำสั่งซื้อ', 'No orders')}</td></tr>`;
    } else {
        appData.orders.forEach(o => {
            const statusLabel = {
                pending: t('รอดำเนินการ', 'Pending'),
                completed: t('เสร็จสิ้น', 'Completed'),
                cancelled: t('ยกเลิก', 'Cancelled')
            } [o.status] || o.status;
            html += `
                <tr>
                    <td>#${o.id}</td>
                    <td>${o.customer}</td>
                    <td>${o.date}</td>
                    <td>${formatPrice(o.total)}</td>
                    <td><span class="badge">${statusLabel}</span></td>
                </tr>
            `;
        });
    }
    
    html += `</tbody></table></div>`;
    content.innerHTML = html;
}

// ============================================
// 🔥 PRODUCT MODAL
// ============================================
function openProductModal(product = null) {
    console.log('📦 Opening product modal...', product ? 'Edit' : 'Add');
    
    const overlay = document.getElementById('modalOverlay');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    const submitBtn = document.getElementById('modalSubmitBtn');
    const form = document.getElementById('modalForm');
    
    if (!overlay) {
        console.error('❌ Modal overlay not found!');
        toast('❌ ไม่พบโมดัล', 'error');
        return;
    }
    
    editingItem = product;
    uploadedImageUrl = product ? product.image : null;
    
    title.textContent = product ? t('แก้ไขสินค้า', 'Edit Product') : t('เพิ่มสินค้าใหม่', 'Add New Product');
    submitBtn.innerHTML = product ? 
        `<i class="fas fa-save"></i> ${t('อัปเดต', 'Update')}` : 
        `<i class="fas fa-plus"></i> ${t('บันทึก', 'Save')}`;
    
    const catOptions = appData.categories.map(cat =>
        `<option value="${cat.id}" ${product && product.category === cat.id ? 'selected' : ''}>${adminLang === 'th' ? cat.th : cat.en}</option>`
    ).join('');
    
    const sizeOptions = ['S', 'M', 'L', 'XL', 'One Size'].map(s =>
        `<option value="${s}" ${product && product.sizes && product.sizes.includes(s) ? 'selected' : ''}>${s}</option>`
    ).join('');

    const imageHtml = uploadedImageUrl && uploadedImageUrl.startsWith('http') ? 
        `<img src="${uploadedImageUrl}" alt="Product image" style="max-width:200px;max-height:200px;border-radius:8px;margin:10px auto;">` :
        `<div class="placeholder-text"><i class="fas fa-cloud-upload-alt"></i> ${t('คลิกเพื่ออัปโหลดรูปภาพ', 'Click to upload image')}</div>`;

    body.innerHTML = `
        <div class="form-group">
            <label>${t('ชื่อภาษาไทย', 'Thai Name')}</label>
            <input type="text" id="pNameTh" value="${product ? product.name_th : ''}" required>
        </div>
        <div class="form-group">
            <label>${t('ชื่อภาษาอังกฤษ', 'English Name')}</label>
            <div style="display:flex;gap:8px;align-items:center;">
                <input type="text" id="pNameEn" value="${product ? product.name_en : ''}" required style="flex:1;">
                <button type="button" class="btn-primary" id="autoTranslateBtn" style="padding:8px 16px;font-size:12px;white-space:nowrap;display:inline-flex;align-items:center;gap:6px;width:auto;">
                    <i class="fas fa-language"></i> ${t('แปล', 'Translate')}
                </button>
            </div>
            <small style="color:#8a7e7a;">${t('ป้อนภาษาอังกฤษ แล้วกดปุ่มเพื่อแปลเป็นไทย', 'Enter English and click Translate')}</small>
        </div>
        
        <div class="form-group">
            <label>${t('รูปภาพสินค้า', 'Product Image')}</label>
            <div class="image-upload-container ${uploadedImageUrl && uploadedImageUrl.startsWith('http') ? 'has-image' : ''}" id="imageUploadContainer">
                <input type="file" id="imageInput" accept="image/*">
                <div id="imagePreview">${imageHtml}</div>
                <button class="remove-image" id="removeImageBtn" style="${uploadedImageUrl && uploadedImageUrl.startsWith('http') ? 'display:flex;' : 'display:none;'}">
                    <i class="fas fa-times"></i>
                </button>
                <div class="upload-progress" id="uploadProgress">
                    <div class="progress-bar"><div class="progress-fill" id="progressFill"></div></div>
                    <div class="upload-status" id="uploadStatus">${t('กำลังอัปโหลด...', 'Uploading...')}</div>
                </div>
            </div>
            <small style="color:#8a7e7a;">${t('คลิกเพื่อเลือกรูปภาพ (JPG, PNG, WebP) ขนาดสูงสุด 5MB', 'Click to select image (JPG, PNG, WebP) max 5MB')}</small>
        </div>

        <div class="form-row">
            <div class="form-group">
                <label>${t('หมวดหมู่', 'Category')}</label>
                <select id="pCategory">${catOptions}</select>
            </div>
            <div class="form-group">
                <label>${t('ราคา (บาท)', 'Price (THB)')}</label>
                <input type="number" id="pPrice" value="${product ? product.price : ''}" required min="0">
            </div>
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
            <div class="form-group">
                <label>${t('ไซส์ (กด Ctrl เพื่อเลือกหลายรายการ)', 'Sizes (Ctrl+Click)')}</label>
                <select id="pSizes" multiple style="height:auto;min-height:60px;">${sizeOptions}</select>
            </div>
        </div>
    `;

    // SHOW MODAL
    overlay.style.display = 'flex';
    overlay.classList.add('open');
    console.log('✅ Modal opened!');

 // --- IMAGE UPLOAD ---
    const uploadContainer = document.getElementById('imageUploadContainer');
    const fileInput = document.getElementById('imageInput');
    const previewDiv = document.getElementById('imagePreview');
    const removeBtn = document.getElementById('removeImageBtn');
    const progressDiv = document.getElementById('uploadProgress');
    const progressFill = document.getElementById('progressFill');
    const statusText = document.getElementById('uploadStatus');

    if (uploadContainer) {
        uploadContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadContainer.style.borderColor = '#c9a84c';
            uploadContainer.style.background = 'rgba(201,168,76,0.08)';
        });
        uploadContainer.addEventListener('dragleave', () => {
            uploadContainer.style.borderColor = '';
            uploadContainer.style.background = '';
        });
        uploadContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadContainer.style.borderColor = '';
            uploadContainer.style.background = '';
            if (e.dataTransfer.files.length > 0) {
                fileInput.files = e.dataTransfer.files;
                fileInput.dispatchEvent(new Event('change'));
            }
        });
        uploadContainer.addEventListener('click', (e) => {
            if (e.target === removeBtn || e.target.closest('.remove-image')) return;
            fileInput.click();
        });
    }

    if (fileInput) {
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            if (!file.type.startsWith('image/')) {
                toast(t('กรุณาเลือกรูปภาพเท่านั้น', 'Please select an image'), 'error');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                toast(t('ขนาดไฟล์ต้องไม่เกิน 5MB', 'File size must be under 5MB'), 'error');
                return;
            }

            if (progressDiv) {
                progressDiv.classList.add('active');
                if (progressFill) progressFill.style.width = '0%';
                if (statusText) statusText.textContent = t('กำลังอัปโหลด...', 'Uploading...');
            }
            if (uploadContainer) uploadContainer.style.borderColor = '#c9a84c';

            const url = await uploadImage(file);
            
            if (url) {
                uploadedImageUrl = url;
                if (previewDiv) {
                    previewDiv.innerHTML = `<img src="${url}" alt="Product image" style="max-width:200px;max-height:200px;border-radius:8px;margin:10px auto;">`;
                }
                if (removeBtn) removeBtn.style.display = 'flex';
                if (uploadContainer) uploadContainer.classList.add('has-image');
                toast(t('อัปโหลดสำเร็จ ✅', 'Upload successful ✅'));
            }
            
            if (progressDiv) progressDiv.classList.remove('active');
            if (uploadContainer) uploadContainer.style.borderColor = '';
        });
    }

    if (removeBtn) {
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            uploadedImageUrl = null;
            if (previewDiv) {
                previewDiv.innerHTML = `<div class="placeholder-text"><i class="fas fa-cloud-upload-alt"></i> ${t('คลิกเพื่ออัปโหลดรูปภาพ', 'Click to upload image')}</div>`;
            }
            removeBtn.style.display = 'none';
            if (uploadContainer) uploadContainer.classList.remove('has-image');
            if (fileInput) fileInput.value = '';
        });
    }

    // --- AUTO-TRANSLATE ---
    const translateBtn = document.getElementById('autoTranslateBtn');
    if (translateBtn) {
        translateBtn.addEventListener('click', async () => {
            const nameEn = document.getElementById('pNameEn');
            const descEn = document.getElementById('pDescEn');
            if (!nameEn || !descEn) return;
            
            const nameEnValue = nameEn.value.trim();
            const descEnValue = descEn.value.trim();
            if (!nameEnValue && !descEnValue) {
                toast(t('กรุณากรอกภาษาอังกฤษก่อน', 'Enter English first'), 'error');
                return;
            }

            translateBtn.disabled = true;
            translateBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${t('กำลังแปล...', 'Translating...')}`;

            try {
                if (nameEnValue) {
                    const nameTh = await translateText(nameEnValue, 'th');
                    document.getElementById('pNameTh').value = nameTh;
                }
                if (descEnValue) {
                    const descTh = await translateText(descEnValue, 'th');
                    document.getElementById('pDescTh').value = descTh;
                }
                toast(t('แปลสำเร็จ ✅', 'Translation successful ✅'));
            } catch (error) {
                toast(t('การแปลล้มเหลว ❌', 'Translation failed ❌'), 'error');
            } finally {
                translateBtn.disabled = false;
                translateBtn.innerHTML = `<i class="fas fa-language"></i> ${t('แปล', 'Translate')}`;
            }
        });
    }

    // --- FORM SUBMIT ---
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            
            const nameTh = document.getElementById('pNameTh');
            const nameEn = document.getElementById('pNameEn');
            const category = document.getElementById('pCategory');
            const price = document.getElementById('pPrice');
            const descTh = document.getElementById('pDescTh');
            const descEn = document.getElementById('pDescEn');
            const sizes = document.getElementById('pSizes');
            
            if (!nameTh || !nameEn || !category || !price) {
                toast(t('กรุณากรอกข้อมูลให้ครบถ้วน', 'Please fill all fields'), 'error');
                return;
            }
            
            const payload = {
                name_th: nameTh.value.trim(),
                name_en: nameEn.value.trim(),
                category: category.value,
                price: parseFloat(price.value),
                desc_th: descTh ? descTh.value.trim() : '',
                desc_en: descEn ? descEn.value.trim() : '',
                image: uploadedImageUrl || '👗',
                sizes: sizes ? Array.from(sizes.selectedOptions).map(opt => opt.value) : [],
            };
            
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${t('กำลังบันทึก...', 'Saving...')}`;
            }
            
            if (editingItem) {
                await updateProduct(editingItem.id, { ...editingItem, ...payload });
            } else {
                await addProduct(payload);
            }
            
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = editingItem ? 
                    `<i class="fas fa-save"></i> ${t('อัปเดต', 'Update')}` : 
                    `<i class="fas fa-plus"></i> ${t('บันทึก', 'Save')}`;
            }
            
            overlay.classList.remove('open');
            overlay.style.display = 'none';
        };
    }

    // --- CLOSE MODAL ---
    document.getElementById('modalCloseBtn').onclick = () => {
        overlay.classList.remove('open');
        overlay.style.display = 'none';
    };
    overlay.onclick = (e) => {
        if (e.target === overlay) {
            overlay.classList.remove('open');
            overlay.style.display = 'none';
        }
    };
}

// ============================================
// 🔥 CATEGORY MODAL
// ============================================
function openCategoryModal(category = null) {
    console.log('📂 Opening category modal...', category ? 'Edit' : 'Add');
    
    const overlay = document.getElementById('modalOverlay');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    const submitBtn = document.getElementById('modalSubmitBtn');
    const form = document.getElementById('modalForm');
    
    if (!overlay) {
        console.error('❌ Modal overlay not found!');
        toast('❌ ไม่พบโมดัล', 'error');
        return;
    }
    
    editingItem = category;
    
    title.textContent = category ? t('แก้ไขหมวดหมู่', 'Edit Category') : t('เพิ่มหมวดหมู่ใหม่', 'Add New Category');
    submitBtn.innerHTML = category ? 
        `<i class="fas fa-save"></i> ${t('อัปเดต', 'Update')}` : 
        `<i class="fas fa-plus"></i> ${t('บันทึก', 'Save')}`;
    
    const iconOptions = [
        'fa-vest', 'fa-shirt', 'fa-moon', 'fa-people-arrows', 
        'fa-calendar-check', 'fa-shoe-prints', 'fa-bag-shopping', 
        'fa-gem', 'fa-clock', 'fa-gift', 'fa-crown', 'fa-star'
    ].map(icon =>
        `<option value="${icon}" ${category && category.icon === icon ? 'selected' : ''}>${icon}</option>`
    ).join('');
    
    body.innerHTML = `
        <div class="form-group">
            <label>${t('รหัสหมวดหมู่ (ภาษาอังกฤษ)', 'Category ID (English)')}</label>
            <input type="text" id="cId" value="${category ? category.id : ''}" ${category ? 'readonly' : ''} required>
            <small style="color:#8a7e7a;font-size:12px;">${category ? '' : t('ใช้ตัวพิมพ์เล็กและขีดกลางเท่านั้น', 'Use lowercase and dashes only')}</small>
        </div>
        <div class="form-group">
            <label>${t('ชื่อภาษาไทย', 'Thai Name')}</label>
            <input type="text" id="cTh" value="${category ? category.th : ''}" required>
        </div>
        <div class="form-group">
            <label>${t('ชื่อภาษาอังกฤษ', 'English Name')}</label>
            <input type="text" id="cEn" value="${category ? category.en : ''}" required>
        </div>
        <div class="form-group">
            <label>${t('ไอคอน', 'Icon')}</label>
            <select id="cIcon">${iconOptions}</select>
        </div>
    `;
    
    // SHOW MODAL
    overlay.style.display = 'flex';
    overlay.classList.add('open');
    console.log('✅ Category modal opened!');
    
    // --- FORM SUBMIT ---
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            
            const cId = document.getElementById('cId');
            const cTh = document.getElementById('cTh');
            const cEn = document.getElementById('cEn');
            const cIcon = document.getElementById('cIcon');
            
            if (!cId || !cTh || !cEn || !cIcon) {
                toast(t('กรุณากรอกข้อมูลให้ครบถ้วน', 'Please fill all fields'), 'error');
                return;
            }
            
            const payload = {
                id: cId.value.trim().toLowerCase().replace(/\s+/g, '-'),
                th: cTh.value.trim(),
                en: cEn.value.trim(),
                icon: cIcon.value,
            };
            
            if (!category) {
                const exists = appData.categories.some(c => c.id === payload.id);
                if (exists) {
                    toast(t('รหัสหมวดหมู่นี้มีอยู่แล้ว', 'Category ID already exists'), 'error');
                    return;
                }
            }
            
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${t('กำลังบันทึก...', 'Saving...')}`;
            }
            
            if (category) {
                await updateCategory(category.id, payload);
            } else {
                await addCategory(payload);
            }
            
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = category ? 
                    `<i class="fas fa-save"></i> ${t('อัปเดต', 'Update')}` : 
                    `<i class="fas fa-plus"></i> ${t('บันทึก', 'Save')}`;
            }
            
            overlay.classList.remove('open');
            overlay.style.display = 'none';
        };
    }
    
    // --- CLOSE MODAL ---
    document.getElementById('modalCloseBtn').onclick = () => {
        overlay.classList.remove('open');
        overlay.style.display = 'none';
    };
    overlay.onclick = (e) => {
        if (e.target === overlay) {
            overlay.classList.remove('open');
            overlay.style.display = 'none';
        }
    };
}

// ============================================
// 🔥 SIDEBAR NAVIGATION
// ============================================
document.querySelectorAll('.admin-sidebar .menu-item').forEach(el => {
    el.addEventListener('click', () => {
        const tab = el.dataset.tab;
        if (tab) {
            currentAdminTab = tab;
            document.querySelectorAll('.admin-sidebar .menu-item').forEach(item => {
                item.classList.toggle('active', item.dataset.tab === tab);
            });
            renderAdmin();
        }
    });
});

// ============================================
// 🔥 LANGUAGE & CURRENCY
// ============================================
document.getElementById('adminLangSelect')?.addEventListener('change', (e) => {
    adminLang = e.target.value;
    localStorage.setItem('adminLang', adminLang);
    renderAdmin();
});

document.getElementById('adminCurrencySelect')?.addEventListener('change', (e) => {
    adminCurrency = e.target.value;
    localStorage.setItem('adminCurrency', adminCurrency);
    renderAdmin();
});

// ============================================
// 🔥 LOGOUT
// ============================================
document.getElementById('adminLogoutBtn')?.addEventListener('click', adminLogout);

// ============================================
// 🔥 INIT
// ============================================
(async function init() {
    console.log('🚀 Admin panel initializing...');
    await loadDataFromDB();
    renderAdmin();
    console.log('✅ Admin panel ready!');
    console.log('📦 Products:', appData.products.length);
    console.log('📂 Categories:', appData.categories.length);
    console.log('📋 Orders:', appData.orders.length);
    console.log('💡 Click "Add Product" or "Add Category" to test modals!');
})();