const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../logger');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    logger.info('POST /auth/register', { body: req.body });
    const { name, email, password, role } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      logger.warn('Email đã tồn tại khi đăng ký', { email });
      return res.status(400).json({ message: 'Email đã tồn tại' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword, role });
    await user.save();
    logger.info('Đăng ký thành công', { userId: user._id, email });
    res.status(201).json({ message: 'Đăng ký thành công' });
  } catch (err) {
    logger.error('Lỗi khi đăng ký', { error: err, body: req.body });
    res.status(500).json({ message: 'Lỗi server' });
  }
});

router.post('/login', async (req, res) => {
  try {
    logger.info('POST /auth/login', { body: req.body });
    const { email, name, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      logger.warn('Đăng nhập thất bại: không tìm thấy user', { email });
      return res.status(400).json({ message: 'Email hoặc mật khẩu không đúng' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      logger.warn('Đăng nhập thất bại: sai mật khẩu', { email });
      return res.status(400).json({ message: 'Email hoặc mật khẩu không đúng' });
    }
    const token = jwt.sign({ userId: user._id, role: user.role, name: user.name }, process.env.JWT_SECRET, { expiresIn: '7d' });
    logger.info('Đăng nhập thành công', { userId: user._id, email });
    logger.info('Đăng nhập thành công 1', { ...user });
    logger.info('Đăng nhập thành công 2', { name });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    logger.error('Lỗi khi đăng nhập', { error: err, body: req.body });
    res.status(500).json({ message: 'Lỗi server' });
  }
});

router.get('/admin', async (req, res) => {
  try {
    logger.info('GET /auth/admin', { user: req.user });
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      return res.status(404).json({ message: 'Không tìm thấy admin' });
    }
    res.json({ _id: admin._id, name: admin.name, role: admin.role });
  } catch (err) {
    logger.error('Lỗi khi lấy thông tin admin', { error: err });
    res.status(500).json({ message: 'Lỗi server' });
  }
});

module.exports = router; 