const express = require('express');
const auth = require('../middleware/auth');
const logger = require('../logger');

const router = express.Router();

const carts = new Map();

router.get('/', auth, async (req, res) => {
  try {
    logger.info('GET /cart', { user: req.user });
    const userId = req.user.userId;
    const userCart = carts.get(userId) || [];
    logger.info('Lấy giỏ hàng thành công', { userId, itemCount: userCart.length });
    res.json(userCart);
  } catch (err) {
    logger.error('Lỗi khi lấy giỏ hàng', { error: err });
    res.status(500).json({ message: 'Lỗi server' });
  }
});

router.post('/add', auth, async (req, res) => {
  try {
    logger.info('POST /cart/add', { user: req.user, body: req.body });
    const userId = req.user.userId;
    const { foodId, quantity = 1, restaurantId } = req.body;
    
    if (!foodId || !restaurantId) {
      logger.warn('Thiếu thông tin món ăn hoặc nhà hàng', { body: req.body });
      return res.status(400).json({ message: 'Thiếu thông tin món ăn hoặc nhà hàng' });
    }

    let userCart = carts.get(userId) || [];
    
    const existingItemIndex = userCart.findIndex(item => item.foodId === foodId);
    
    if (existingItemIndex !== -1) {
      userCart[existingItemIndex].quantity += quantity;
      logger.info('Cập nhật số lượng món trong giỏ hàng', { 
        foodId, 
        newQuantity: userCart[existingItemIndex].quantity 
      });
    } else {
      userCart.push({
        foodId,
        quantity,
        restaurantId,
        addedAt: new Date()
      });
      logger.info('Thêm món mới vào giỏ hàng', { foodId, quantity });
    }
    
    carts.set(userId, userCart);
    res.json({ message: 'Đã thêm vào giỏ hàng', cart: userCart });
  } catch (err) {
    logger.error('Lỗi khi thêm vào giỏ hàng', { error: err });
    res.status(500).json({ message: 'Lỗi server' });
  }
});

router.put('/update', auth, async (req, res) => {
  try {
    logger.info('PUT /cart/update', { user: req.user, body: req.body });
    const userId = req.user.userId;
    const { foodId, quantity } = req.body;
    
    if (!foodId || quantity === undefined) {
      logger.warn('Thiếu thông tin cập nhật giỏ hàng', { body: req.body });
      return res.status(400).json({ message: 'Thiếu thông tin cập nhật' });
    }

    let userCart = carts.get(userId) || [];
    const itemIndex = userCart.findIndex(item => item.foodId === foodId);
    
    if (itemIndex === -1) {
      logger.warn('Không tìm thấy món trong giỏ hàng', { foodId });
      return res.status(404).json({ message: 'Không tìm thấy món trong giỏ hàng' });
    }

    if (quantity <= 0) {
      userCart.splice(itemIndex, 1);
      logger.info('Xóa món khỏi giỏ hàng do số lượng = 0', { foodId });
    } else {
      userCart[itemIndex].quantity = quantity;
      logger.info('Cập nhật số lượng món trong giỏ hàng', { foodId, quantity });
    }
    
    carts.set(userId, userCart);
    res.json({ message: 'Đã cập nhật giỏ hàng', cart: userCart });
  } catch (err) {
    logger.error('Lỗi khi cập nhật giỏ hàng', { error: err });
    res.status(500).json({ message: 'Lỗi server' });
  }
});

router.delete('/remove/:foodId', auth, async (req, res) => {
  try {
    logger.info('DELETE /cart/remove/:foodId', { user: req.user, params: req.params });
    const userId = req.user.userId;
    const { foodId } = req.params;
    
    let userCart = carts.get(userId) || [];
    const itemIndex = userCart.findIndex(item => item.foodId === foodId);
    
    if (itemIndex === -1) {
      logger.warn('Không tìm thấy món trong giỏ hàng để xóa', { foodId });
      return res.status(404).json({ message: 'Không tìm thấy món trong giỏ hàng' });
    }

    userCart.splice(itemIndex, 1);
    carts.set(userId, userCart);
    
    logger.info('Xóa món khỏi giỏ hàng thành công', { foodId });
    res.json({ message: 'Đã xóa món khỏi giỏ hàng', cart: userCart });
  } catch (err) {
    logger.error('Lỗi khi xóa món khỏi giỏ hàng', { error: err });
    res.status(500).json({ message: 'Lỗi server' });
  }
});

router.delete('/clear', auth, async (req, res) => {
  try {
    logger.info('DELETE /cart/clear', { user: req.user });
    const userId = req.user.userId;
    
    carts.delete(userId);
    
    logger.info('Xóa toàn bộ giỏ hàng thành công', { userId });
    res.json({ message: 'Đã xóa toàn bộ giỏ hàng' });
  } catch (err) {
    logger.error('Lỗi khi xóa toàn bộ giỏ hàng', { error: err });
    res.status(500).json({ message: 'Lỗi server' });
  }
});

module.exports = router; 