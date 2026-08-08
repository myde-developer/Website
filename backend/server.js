require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5000;

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());

// --- ENVIRONMENT VARIABLES (Set these in Render) ---
const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key_123';

if (!MONGO_URI) {
    console.error('❌ MONGO_URI is not defined in environment variables.');
    process.exit(1);
}

// --- CONNECT TO MONGODB ATLAS ---
mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Connected to FREE MongoDB Atlas!'))
    .catch(err => console.error('❌ DB Error:', err));

// --- SCHEMAS ---
const ProductSchema = new mongoose.Schema({
    id: Number,
    name_th: String,
    name_en: String,
    desc_th: String,
    desc_en: String,
    category: String,
    price: Number,
    image: String,
    sizes: [String]
});
const CategorySchema = new mongoose.Schema({
    id: String,
    th: String,
    en: String,
    icon: String
});
const OrderSchema = new mongoose.Schema({
    id: String,
    customer: String,
    date: String,
    total: Number,
    status: String,
    items: Array
});
const AdminSchema = new mongoose.Schema({
    username: String,
    password: String
});

const Product = mongoose.model('Product', ProductSchema);
const Category = mongoose.model('Category', CategorySchema);
const Order = mongoose.model('Order', OrderSchema);
const Admin = mongoose.model('Admin', AdminSchema);

// --- SEED DATABASE (runs once) ---
async function seedDatabase() {
    const adminCount = await Admin.countDocuments();
    if (adminCount === 0) {
        const hashed = await bcrypt.hash('admin123', 10);
        await Admin.create({ username: 'admin', password: hashed });
        console.log('🔑 Admin created (admin/admin123)');
    }
    const catCount = await Category.countDocuments();
    if (catCount === 0) {
        const defaultCats = [
            { id: 'gowns', th: 'ชุดราตรี', en: 'Gowns', icon: 'fa-vest' },
            { id: 'crop-tops', th: 'เสื้อครอป', en: 'Crop Tops', icon: 'fa-shirt' },
            { id: 'night-wear', th: 'ชุดนอน', en: 'Night Wear', icon: 'fa-moon' },
            { id: 'skirts', th: 'กระโปรง', en: 'Skirts', icon: 'fa-people-arrows' },
            { id: 'event-outfits', th: 'ชุดงานอีเว้นท์', en: 'Event Outfits', icon: 'fa-calendar-check' },
            { id: 'shoes', th: 'รองเท้า', en: 'Shoes', icon: 'fa-shoe-prints' },
            { id: 'bags', th: 'กระเป๋า', en: 'Bags', icon: 'fa-bag-shopping' },
            { id: 'jewelries', th: 'เครื่องประดับ', en: 'Jewelries', icon: 'fa-gem' },
            { id: 'watches', th: 'นาฬิกา', en: 'Watches', icon: 'fa-clock' },
            { id: 'gifts', th: 'ของขวัญ', en: 'Gifts', icon: 'fa-gift' }
        ];
        await Category.insertMany(defaultCats);
        console.log('📂 Categories seeded.');
    }
    const productCount = await Product.countDocuments();
    if (productCount === 0) {
        const defaultProducts = [
            { id: 1, category: 'gowns', name_th: 'ชุดราตรีไหมไทย', name_en: 'Thai Silk Gown', desc_th: 'ชุดราตรีทำจากไหมไทยแท้ ดีไซน์หรูหรา', desc_en: 'Authentic Thai silk gown', price: 4500, image: '👗', sizes: ['S', 'M', 'L', 'XL'] },
            { id: 2, category: 'gowns', name_th: 'ชุดราตรีลูกไม้', name_en: 'Lace Evening Gown', desc_th: 'ชุดราตรีลูกไม้ละเอียด ดีไซน์เซ็กซี่', desc_en: 'Fine lace evening gown', price: 3800, image: '👗', sizes: ['S', 'M', 'L'] },
            { id: 3, category: 'crop-tops', name_th: 'เสื้อครอปสายเดี่ยว', name_en: 'Strappy Crop Top', desc_th: 'เสื้อครอปสายเดี่ยวดีไซน์ทันสมัย', desc_en: 'Modern strappy crop top', price: 890, image: '👚', sizes: ['S', 'M', 'L'] },
            { id: 4, category: 'night-wear', name_th: 'ชุดนอนผ้าไหม', name_en: 'Silk Pajama Set', desc_th: 'ชุดนอนผ้าไหมเนื้อนุ่ม', desc_en: 'Soft silk pajama set', price: 2200, image: '🌙', sizes: ['S', 'M', 'L'] },
            { id: 5, category: 'skirts', name_th: 'กระโปรงทรงเอ', name_en: 'A-Line Skirt', desc_th: 'กระโปรงทรงเอ ดีไซน์คลาสสิค', desc_en: 'Classic A-line skirt', price: 1500, image: '👗', sizes: ['S', 'M', 'L'] },
            { id: 6, category: 'event-outfits', name_th: 'ชุดงานเลี้ยงสีทอง', name_en: 'Gold Party Dress', desc_th: 'ชุดงานเลี้ยงสีทอง ดีไซน์หรูหรา', desc_en: 'Gold party dress', price: 4200, image: '✨', sizes: ['S', 'M', 'L'] },
            { id: 7, category: 'shoes', name_th: 'รองเท้าส้นสูง', name_en: 'High Heels', desc_th: 'รองเท้าส้นสูงดีไซน์หรู', desc_en: 'Elegant high heels', price: 2800, image: '👠', sizes: ['36', '37', '38', '39', '40'] },
            { id: 8, category: 'bags', name_th: 'กระเป๋าโท้ท', name_en: 'Leather Tote Bag', desc_th: 'กระเป๋าโท้ทหนังแท้', desc_en: 'Genuine leather tote', price: 3900, image: '👜', sizes: ['One Size'] },
            { id: 9, category: 'jewelries', name_th: 'สร้อยคอทองคำ', name_en: 'Gold Necklace', desc_th: 'สร้อยคอทองคำ ดีไซน์สวยงาม', desc_en: 'Beautiful gold necklace', price: 5600, image: '💎', sizes: ['One Size'] },
            { id: 10, category: 'watches', name_th: 'นาฬิกาหรูหรา', name_en: 'Luxury Watch', desc_th: 'นาฬิกา ดีไซน์สวยงาม', desc_en: 'Beautiful luxury watch', price: 7500, image: '⌚', sizes: ['One Size'] },
            { id: 11, category: 'gifts', name_th: 'เซ็ทของขวัญ', name_en: 'Gift Set', desc_th: 'เซ็ทของขวัญสุดหรู', desc_en: 'Luxury gift set', price: 2800, image: '🎁', sizes: ['One Size'] }
        ];
        await Product.insertMany(defaultProducts);
        console.log('📦 Products seeded.');
    }
}
seedDatabase();

// --- AUTH MIDDLEWARE ---
const auth = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Access denied' });
    try {
        const verified = jwt.verify(token, JWT_SECRET);
        req.admin = verified;
        next();
    } catch (err) {
        res.status(400).json({ error: 'Invalid token' });
    }
};

// --- AUTH ROUTE ---
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    const admin = await Admin.findOne({ username });
    if (!admin) return res.status(400).json({ error: 'User not found' });
    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) return res.status(400).json({ error: 'Wrong password' });
    const token = jwt.sign({ id: admin._id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, message: 'Login successful' });
});

// --- PRODUCT ROUTES ---
app.get('/api/products', async (req, res) => {
    const products = await Product.find();
    res.json(products);
});
app.post('/api/products', auth, async (req, res) => {
    const newProduct = new Product(req.body);
    await newProduct.save();
    res.json(newProduct);
});
app.put('/api/products/:id', auth, async (req, res) => {
    const updated = await Product.findOneAndUpdate({ id: parseInt(req.params.id) }, req.body, { new: true });
    res.json(updated);
});
app.delete('/api/products/:id', auth, async (req, res) => {
    await Product.findOneAndDelete({ id: parseInt(req.params.id) });
    res.json({ message: 'Deleted' });
});

// --- CATEGORY ROUTES ---
app.get('/api/categories', async (req, res) => {
    const cats = await Category.find();
    res.json(cats);
});
app.post('/api/categories', auth, async (req, res) => {
    const newCat = new Category(req.body);
    await newCat.save();
    res.json(newCat);
});
app.put('/api/categories/:id', auth, async (req, res) => {
    const updated = await Category.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
    res.json(updated);
});
app.delete('/api/categories/:id', auth, async (req, res) => {
    await Category.findOneAndDelete({ id: req.params.id });
    res.json({ message: 'Deleted' });
});

// --- ORDER ROUTES ---
app.get('/api/orders', auth, async (req, res) => {
    const orders = await Order.find();
    res.json(orders);
});
app.post('/api/orders', async (req, res) => {
    const newOrder = new Order(req.body);
    await newOrder.save();
    res.json(newOrder);
});

// --- SERVER ---
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));