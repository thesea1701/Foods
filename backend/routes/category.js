const express = require('express');
const Category = require('../models/Category');
const auth = require('../middleware/auth');
const logger = require('../logger');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    logger.info('GET /categories');
    const categories = await Category.find();
    res.json(categories);
  } catch (err) {
    logger.error('Lỗi khi lấy danh sách loại món', { error: err });
    res.status(500).json({ message: 'Lỗi server' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    logger.info('POST /categories', { user: req.user, body: req.body });
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Không có quyền' });
    const { name } = req.body;
    const category = new Category({ name });
    await category.save();
    res.status(201).json(category);
  } catch (err) {
    logger.error('Lỗi khi thêm loại món', { error: err });
    res.status(500).json({ message: 'Lỗi server' });
  }
});
router.put('/:id', auth, async (req, res) => {
  try {
    logger.info('PUT /categories/:id', { user: req.user, params: req.params, body: req.body });
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Không có quyền' });
    const { name } = req.body;
    const category = await Category.findByIdAndUpdate(req.params.id, { name }, { new: true });
    if (!category) return res.status(404).json({ message: 'Không tìm thấy loại món' });
    res.json(category);
  } catch (err) {
    logger.error('Lỗi khi sửa loại món', { error: err });
    res.status(500).json({ message: 'Lỗi server' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    logger.info('DELETE /categories/:id', { user: req.user, params: req.params });
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Không có quyền' });
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ message: 'Không tìm thấy loại món' });
    res.json({ message: 'Đã xóa loại món' });
  } catch (err) {
    logger.error('Lỗi khi xóa loại món', { error: err });
    res.status(500).json({ message: 'Lỗi server' });
  }
});

module.exports = router; 