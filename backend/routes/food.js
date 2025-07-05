const express = require('express');
const Food = require('../models/Food');
const auth = require('../middleware/auth');
const logger = require('../logger');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    logger.info('GET /foods');
    const filter = {};
    if (req.query.categoryId) {
      filter.category = req.query.categoryId;
    }
    const foods = await Food.find(filter).populate('category').populate('restaurant');
    res.json(foods);
  } catch (err) {
    logger.error('Lỗi khi lấy danh sách món ăn', { error: err });
    res.status(500).json({ message: 'Lỗi server' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    logger.info('GET /foods/:id', { params: req.params });
    const food = await Food.findById(req.params.id).populate('category').populate('restaurant');
    if (!food) return res.status(404).json({ message: 'Không tìm thấy món ăn' });
    res.json(food);
  } catch (err) {
    logger.error('Lỗi khi lấy chi tiết món ăn', { error: err });
    res.status(500).json({ message: 'Lỗi server' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    logger.info('POST /foods', { user: req.user, body: req.body });
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Không có quyền' });
    const { name, price, description, category, restaurant } = req.body;
    const food = new Food({ name, price, description, category, restaurant });
    await food.save();
    res.status(201).json(food);
  } catch (err) {
    logger.error('Lỗi khi thêm món ăn', { error: err });
    res.status(500).json({ message: 'Lỗi server' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    logger.info('PUT /foods/:id', { user: req.user, params: req.params, body: req.body });
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Không có quyền' });
    const { name, price, description, category, restaurant } = req.body;
    const food = await Food.findByIdAndUpdate(
      req.params.id,
      { name, price, description, category, restaurant },
      { new: true }
    );
    if (!food) return res.status(404).json({ message: 'Không tìm thấy món ăn' });
    res.json(food);
  } catch (err) {
    logger.error('Lỗi khi sửa món ăn', { error: err });
    res.status(500).json({ message: 'Lỗi server' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    logger.info('DELETE /foods/:id', { user: req.user, params: req.params });
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Không có quyền' });
    const food = await Food.findByIdAndDelete(req.params.id);
    if (!food) return res.status(404).json({ message: 'Không tìm thấy món ăn' });
    res.json({ message: 'Đã xóa món ăn' });
  } catch (err) {
    logger.error('Lỗi khi xóa món ăn', { error: err });
    res.status(500).json({ message: 'Lỗi server' });
  }
});

module.exports = router; 