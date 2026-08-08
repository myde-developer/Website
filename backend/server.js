require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Sequelize, DataTypes } = require('sequelize');

const app = express();
const PORT = process.env.PORT || 5000;

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());

// --- CONNECT TO NEON (POSTGRESQL) ---
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false, // Required for Neon
    },
  },
  logging: false,
});

// --- DEFINE MODELS ---
const Admin = sequelize.define('Admin', {
  username: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
});

const Category = sequelize.define('Category', {
  id: { type: DataTypes.STRING, primaryKey: true },
  th: { type: DataTypes.STRING, allowNull: false },
  en: { type: DataTypes.STRING, allowNull: false },
  icon: { type: DataTypes.STRING, allowNull: false },
});

const Product = sequelize.define('Product', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name_th: { type: DataTypes.STRING, allowNull: false },
  name_en: { type: DataTypes.STRING, allowNull: false },
  desc_th: { type: DataTypes.TEXT },
  desc_en: { type: DataTypes.TEXT },
  category: { type: DataTypes.STRING, allowNull: false },
  price: { type: DataTypes.FLOAT, allowNull: false },
  image: { type: DataTypes.STRING, defaultValue: '👗' },
  sizes: { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: ['S', 'M', 'L'] },
});

const Order = sequelize.define('Order', {
  id: { type: DataTypes.STRING, primaryKey: true },
  customer: { type: DataTypes.STRING, defaultValue: 'Customer' },
  date: { type: DataTypes.STRING },
  total: { type: DataTypes.FLOAT },
  status: { type: DataTypes.STRING, defaultValue: 'pending' },
  items: { type: DataTypes.JSONB, defaultValue: [] },
});

// --- SEED DATABASE (runs only if empty) ---
async function seedDatabase() {
  const adminCount = await Admin.count();
  if (adminCount === 0) {
    const hashed = await bcrypt.hash('admin123', 10);
    await Admin.create({ username: 'admin', password: hashed });
    console.log('🔑 Admin created (admin/admin123)');
  }

  const catCount = await Category.count();
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
      { id: 'gifts', th: 'ของขวัญ', en: 'Gifts', icon: 'fa-gift' },
    ];
    await Category.bulkCreate(defaultCats);
    console.log('📂 Categories seeded.');
  }

  const prodCount = await Product.count();
  if (prodCount === 0) {
    const defaultProducts = [
      { category: 'gowns', name_th: 'ชุดราตรีไหมไทย', name_en: 'Thai Silk Gown', desc_th: 'ชุดราตรีทำจากไหมไทยแท้ ดีไซน์หรูหรา', desc_en: 'Authentic Thai silk gown', price: 4500, image: '👗', sizes: ['S', 'M', 'L', 'XL'] },
      { category: 'gowns', name_th: 'ชุดราตรีลูกไม้', name_en: 'Lace Evening Gown', desc_th: 'ชุดราตรีลูกไม้ละเอียด ดีไซน์เซ็กซี่', desc_en: 'Fine lace evening gown', price: 3800, image: '👗', sizes: ['S', 'M', 'L'] },
      { category: 'crop-tops', name_th: 'เสื้อครอปสายเดี่ยว', name_en: 'Strappy Crop Top', desc_th: 'เสื้อครอปสายเดี่ยวดีไซน์ทันสมัย', desc_en: 'Modern strappy crop top', price: 890, image: '👚', sizes: ['S', 'M', 'L'] },
      { category: 'night-wear', name_th: 'ชุดนอนผ้าไหม', name_en: 'Silk Pajama Set', desc_th: 'ชุดนอนผ้าไหมเนื้อนุ่ม', desc_en: 'Soft silk pajama set', price: 2200, image: '🌙', sizes: ['S', 'M', 'L'] },
      { category: 'skirts', name_th: 'กระโปรงทรงเอ', name_en: 'A-Line Skirt', desc_th: 'กระโปรงทรงเอ ดีไซน์คลาสสิค', desc_en: 'Classic A-line skirt', price: 1500, image: '👗', sizes: ['S', 'M', 'L'] },
      { category: 'event-outfits', name_th: 'ชุดงานเลี้ยงสีทอง', name_en: 'Gold Party Dress', desc_th: 'ชุดงานเลี้ยงสีทอง ดีไซน์หรูหรา', desc_en: 'Gold party dress', price: 4200, image: '✨', sizes: ['S', 'M', 'L'] },
      { category: 'shoes', name_th: 'รองเท้าส้นสูง', name_en: 'High Heels', desc_th: 'รองเท้าส้นสูงดีไซน์หรู', desc_en: 'Elegant high heels', price: 2800, image: '👠', sizes: ['36', '37', '38', '39', '40'] },
      { category: 'bags', name_th: 'กระเป๋าโท้ท', name_en: 'Leather Tote Bag', desc_th: 'กระเป๋าโท้ทหนังแท้', desc_en: 'Genuine leather tote', price: 3900, image: '👜', sizes: ['One Size'] },
      { category: 'jewelries', name_th: 'สร้อยคอทองคำ', name_en: 'Gold Necklace', desc_th: 'สร้อยคอทองคำ ดีไซน์สวยงาม', desc_en: 'Beautiful gold necklace', price: 5600, image: '💎', sizes: ['One Size'] },
      { category: 'watches', name_th: 'นาฬิกาหรูหรา', name_en: 'Luxury Watch', desc_th: 'นาฬิกา ดีไซน์สวยงาม', desc_en: 'Beautiful luxury watch', price: 7500, image: '⌚', sizes: ['One Size'] },
      { category: 'gifts', name_th: 'เซ็ทของขวัญ', name_en: 'Gift Set', desc_th: 'เซ็ทของขวัญสุดหรู', desc_en: 'Luxury gift set', price: 2800, image: '🎁', sizes: ['One Size'] },
    ];
    await Product.bulkCreate(defaultProducts);
    console.log('📦 Products seeded.');
  }
}

// --- AUTH MIDDLEWARE ---
const auth = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Access denied' });
  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET || 'your_secret');
    req.admin = verified;
    next();
  } catch (err) {
    res.status(400).json({ error: 'Invalid token' });
  }
};

// --- AUTH ROUTE ---
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const admin = await Admin.findOne({ where: { username } });
  if (!admin) return res.status(400).json({ error: 'User not found' });
  const valid = await bcrypt.compare(password, admin.password);
  if (!valid) return res.status(400).json({ error: 'Wrong password' });
  const token = jwt.sign({ id: admin.id }, process.env.JWT_SECRET || 'your_secret', { expiresIn: '7d' });
  res.json({ token, message: 'Login successful' });
});

// --- PRODUCT ROUTES ---
app.get('/api/products', async (req, res) => {
  const products = await Product.findAll({ order: [['id', 'ASC']] });
  res.json(products);
});
app.post('/api/products', auth, async (req, res) => {
  const newProduct = await Product.create(req.body);
  res.json(newProduct);
});
app.put('/api/products/:id', auth, async (req, res) => {
  const product = await Product.findByPk(req.params.id);
  if (!product) return res.status(404).json({ error: 'Not found' });
  await product.update(req.body);
  res.json(product);
});
app.delete('/api/products/:id', auth, async (req, res) => {
  await Product.destroy({ where: { id: req.params.id } });
  res.json({ message: 'Deleted' });
});

// --- CATEGORY ROUTES ---
app.get('/api/categories', async (req, res) => {
  const cats = await Category.findAll({ order: [['id', 'ASC']] });
  res.json(cats);
});
app.post('/api/categories', auth, async (req, res) => {
  const newCat = await Category.create(req.body);
  res.json(newCat);
});
app.put('/api/categories/:id', auth, async (req, res) => {
  const cat = await Category.findByPk(req.params.id);
  if (!cat) return res.status(404).json({ error: 'Not found' });
  await cat.update(req.body);
  res.json(cat);
});
app.delete('/api/categories/:id', auth, async (req, res) => {
  await Category.destroy({ where: { id: req.params.id } });
  res.json({ message: 'Deleted' });
});

// --- ORDER ROUTES ---
app.get('/api/orders', auth, async (req, res) => {
  const orders = await Order.findAll({ order: [['createdAt', 'DESC']] });
  res.json(orders);
});
app.post('/api/orders', async (req, res) => {
  const newOrder = await Order.create(req.body);
  res.json(newOrder);
});

// --- START SERVER ---
(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Neon PostgreSQL connection established.');

    // 🔥 FIX: Await table creation before seeding
    await sequelize.sync({ force: false });
    console.log('✅ Tables synced.');

    await seedDatabase();

    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    process.exit(1);
  }
})();