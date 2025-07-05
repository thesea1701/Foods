const express = require('express');
const Message = require('../models/Message');
const User = require('../models/User');
const auth = require('../middleware/auth');
const logger = require('../logger');

const router = express.Router();

router.get('/order/:orderId', auth, async (req, res) => {
  try {
    const messages = await Message.find({ order: req.params.orderId })
      .populate('sender', 'name role')
      .populate('receiver', 'name role')
      .sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    logger.error('Lỗi khi lấy tin nhắn theo order', { error: err });
    res.status(500).json({ message: 'Lỗi server' });
  }
});

router.get('/admin', auth, async (req, res) => {
  try {
    logger.info('GET /messages/admin', { user: req.user });

    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      return res.status(404).json({ message: 'Không tìm thấy admin' });
    }

    const messages = await Message.find({
      $or: [
        { sender: req.user.userId, receiver: admin._id, order: { $exists: false } },
        { sender: admin._id, receiver: req.user.userId, order: { $exists: false } }
      ]
    })
      .populate('sender', 'name role')
      .populate('receiver', 'name role')
      .sort({ createdAt: 1 });

    logger.info('Lấy tin nhắn admin thành công', { messageCount: messages.length });
    res.json(messages);
  } catch (err) {
    logger.error('Lỗi khi lấy tin nhắn admin', { error: err });
    res.status(500).json({ message: 'Lỗi server' });
  }
});

router.get('/all', auth, async (req, res) => {
  try {
    logger.info('GET /messages/all', { user: req.user });
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Chỉ admin mới được xem tất cả tin nhắn' });
    }

    const messages = await Message.find({ order: { $exists: false } })
      .populate('sender', 'name role')
      .populate('receiver', 'name role')
      .sort({ createdAt: -1 });

    res.json(messages);
  } catch (err) {
    logger.error('Lỗi khi lấy tất cả tin nhắn', { error: err });
    res.status(500).json({ message: 'Lỗi server' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    logger.info('POST /messages', { user: req.user, body: req.body });
    const { receiver, order, content } = req.body;
    
    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Nội dung tin nhắn không được để trống' });
    }

    const message = new Message({
      sender: req.user.userId,
      receiver,
      order,
      content: content.trim()
    });
    
    await message.save();

    await message.populate('sender', 'name role');
    await message.populate('receiver', 'name role');

    if (req.app.get('io')) {
      let roomId;
      if (order) {
        roomId = `order_${order}`;
      } else if (req.user.role === 'admin') {
        roomId = `admin_chat_${receiver}`;
      } else {
        roomId = `admin_chat_${req.user.userId}`;
      }
      req.app.get('io').to(roomId).emit('new_message', message);
      if (!order && req.user.role === 'customer') {
        req.app.get('io').to('admin_room').emit('new_customer_message', {
          message,
          customerId: req.user.userId
        });
      }
    }
    
    logger.info('Gửi tin nhắn thành công', { messageId: message._id });
    res.status(201).json(message);
  } catch (err) {
    logger.error('Lỗi khi gửi tin nhắn', { error: err });
    res.status(500).json({ message: 'Lỗi server' });
  }
});

module.exports = router; 