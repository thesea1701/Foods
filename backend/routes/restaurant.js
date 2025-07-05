const express = require('express');
const Restaurant = require('../models/Restaurant');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const restaurants = await Restaurant.find().populate('categories');
    res.json(restaurants);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id).populate('categories');
    if (!restaurant) return res.status(404).json({ message: 'Không tìm thấy quán ăn' });
    res.json(restaurant);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Không có quyền' });
    const { name, address, description, categories } = req.body;
    const restaurant = new Restaurant({ name, address, description, categories });
    await restaurant.save();
    res.status(201).json(restaurant);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Không có quyền' });
    const { name, address, description, categories } = req.body;
    const restaurant = await Restaurant.findByIdAndUpdate(
      req.params.id,
      { name, address, description, categories },
      { new: true }
    );
    if (!restaurant) return res.status(404).json({ message: 'Không tìm thấy quán ăn' });
    res.json(restaurant);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Không có quyền' });
    const restaurant = await Restaurant.findByIdAndDelete(req.params.id);
    if (!restaurant) return res.status(404).json({ message: 'Không tìm thấy quán ăn' });
    res.json({ message: 'Đã xóa quán ăn' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

module.exports = router; 