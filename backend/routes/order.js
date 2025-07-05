const express = require('express');
const Order = require('../models/Order');
const auth = require('../middleware/auth');
const logger = require('../logger');

const router = express.Router();

router.post('/', auth, async (req, res) => {
  try {
    logger.info('POST /orders', { body: req.body, user: req.user });
    if (req.user.role !== 'customer') return res.status(403).json({ message: 'Chỉ khách hàng mới được đặt món' });
    
    if (!req.body) {
      logger.error('req.body is undefined', { headers: req.headers });
      return res.status(400).json({ message: 'Dữ liệu request không hợp lệ' });
    }
    
    const { restaurant, items } = req.body;
    
    if (!restaurant) {
      logger.warn('Thiếu thông tin nhà hàng', { body: req.body });
      return res.status(400).json({ message: 'Thiếu thông tin nhà hàng' });
    }
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      logger.warn('Thiếu hoặc sai định dạng danh sách món ăn', { body: req.body });
      return res.status(400).json({ message: 'Thiếu hoặc sai định dạng danh sách món ăn' });
    }
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.food || !item.quantity || item.quantity <= 0) {
        logger.warn('Thông tin món ăn không hợp lệ', { item, index: i });
        return res.status(400).json({ message: `Thông tin món ăn thứ ${i + 1} không hợp lệ` });
      }
    }
    
    logger.info('Dữ liệu hợp lệ, tiến hành tạo đơn hàng', { restaurant, itemsCount: items.length });
    
    const totalAmount = items.reduce((total, item) => total + (item.price * item.quantity), 0);
    
    const order = new Order({ 
      customer: req.user.userId, 
      restaurant, 
      items,
      totalAmount,
      status: 'pending'
    });
    
    await order.save();
    logger.info('Đã lưu đơn hàng thành công', { orderId: order._id, restaurant, itemsCount: items.length });
    
    if (req.app.get('io')) {
      const io = req.app.get('io');
      
      io.to(restaurant).emit('new_order', order);
      
      io.to('admin').emit('new_order_for_admin', {
        order,
        customerName: req.user.name || 'Khách hàng',
        restaurantName: restaurant.name || 'Quán ăn'
      });
      
      logger.info('Socket events emitted for new order', {
        orderId: order._id,
        adminRooms: Array.from(io.sockets.adapter.rooms.keys()).filter(room => room === 'admin')
      });
    }
    
    res.status(201).json(order);
  } catch (err) {
    logger.error('Lỗi khi tạo đơn hàng', { error: err, body: req.body });
    res.status(500).json({ message: 'Lỗi server' });
  }
});

router.get('/my', auth, async (req, res) => {
  try {
    logger.info('GET /orders/my', { user: req.user });
    const orders = await Order.find({ customer: req.user.userId })
      .populate('restaurant')
      .populate('items.food')
      .sort({ createdAt: -1 });
    logger.info('orders', orders );
    res.json(orders);
  } catch (err) {
    logger.error('Lỗi khi lấy đơn hàng của user', { error: err });
    res.status(500).json({ message: 'Lỗi server' });
  }
});

router.get('/all', auth, async (req, res) => {
  try {
    logger.info('GET /orders/all', { user: req.user });
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Chỉ admin mới được xem tất cả đơn hàng' });
    
    const orders = await Order.find({})
      .populate('restaurant')
      .populate('items.food')
      .populate('customer', 'name email')
      .sort({ createdAt: -1 }); 
    
    logger.info('Retrieved all orders', { count: orders.length });
    res.json(orders);
  } catch (err) {
    logger.error('Lỗi khi lấy tất cả đơn hàng', { error: err });
    res.status(500).json({ message: 'Lỗi server' });
  }
});

router.get('/restaurant/:id', auth, async (req, res) => {
  try {
    logger.info('GET /orders/restaurant/:id', { user: req.user, params: req.params });
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Chỉ nhân viên mới xem được đơn của quán' });
    const orders = await Order.find({ restaurant: req.params.id }).populate('customer').populate('items.food');
    res.json(orders);
  } catch (err) {
    logger.error('Lỗi khi lấy đơn hàng của quán', { error: err });
    res.status(500).json({ message: 'Lỗi server' });
  }
});

router.put('/:id/status', auth, async (req, res) => {
  try {
    logger.info('PUT /orders/:id/status', { user: req.user, params: req.params, body: req.body });
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Chỉ nhân viên mới được cập nhật trạng thái' });
    const { status } = req.body;
    
    const validStatuses = ['pending', 'confirmed', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Trạng thái không hợp lệ' });
    }
    
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status, updatedAt: Date.now() },
      { new: true }
    );
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });

    if (req.app.get('io')) {
      req.app.get('io').to(String(order.customer)).emit('order_status', order);
    }
    res.json(order);
  } catch (err) {
    logger.error('Lỗi khi cập nhật trạng thái đơn hàng', { error: err });
    res.status(500).json({ message: 'Lỗi server' });
  }
});

router.patch('/:id/status', auth, async (req, res) => {
  try {
    logger.info('PATCH /orders/:id/status', { user: req.user, params: req.params, body: req.body });
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Chỉ admin mới được cập nhật trạng thái' });
    
    const { status } = req.body;
    
    const validStatuses = ['pending', 'confirmed', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Trạng thái không hợp lệ' });
    }
    
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status, updatedAt: Date.now() },
      { new: true }
    ).populate('restaurant').populate('items.food').populate('customer', 'name email');
    
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    
    if (req.app.get('io')) {
      const io = req.app.get('io');
      const customerId = String(order.customer._id);
      
      io.to(`user_${customerId}`).emit('order_status', {
        orderId: order._id,
        status: order.status,
        statusText: getStatusText(order.status),
        updatedAt: order.updatedAt,
        customerId: customerId
      });
      
      io.to('admin').emit('order_status_updated', order);
      
      io.emit('order_status', {
        orderId: order._id,
        status: order.status,
        statusText: getStatusText(order.status),
        updatedAt: order.updatedAt,
        customerId: customerId
      });
      
      logger.info('Socket events emitted for order status update', {
        orderId: order._id,
        newStatus: status,
        customerId: customerId,
        customerRoom: `user_${customerId}`,
        adminRoom: 'admin'
      });
    }
    
    logger.info('Order status updated successfully', { orderId: order._id, newStatus: status });
    res.json(order);
  } catch (err) {
    logger.error('Lỗi khi cập nhật trạng thái đơn hàng', { error: err });
    res.status(500).json({ message: 'Lỗi server' });
  }
});

const getStatusText = (status) => {
  switch (status) {
    case 'pending':
      return 'Chờ xác nhận';
    case 'confirmed':
      return 'Đã xác nhận';
    case 'completed':
      return 'Hoàn thành';
    default:
      return status;
  }
};

module.exports = router; 