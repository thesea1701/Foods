require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Restaurant = require('./models/Restaurant');
const Category = require('./models/Category');
const Food = require('./models/Food');
const Message = require('./models/Message');
const Order = require('./models/Order');
const logger = require('./logger');

async function seedUser() {
  const count = await User.countDocuments();
  if (count > 0) {
    logger.info('User đã có dữ liệu, bỏ qua seed user.');
    return;
  }
  await User.create([
    {
      name: 'Administrator',
      email: 'admin@gmail.com',
      password: await bcrypt.hash('12345@', 10),
      role: 'admin'
    },
    {
      name: 'Customer',
      email: 'customer@gmail.com',
      password: await bcrypt.hash('12345@', 10),
      role: 'customer'
    }
  ]);
  logger.info('Seed user thành công!');
}

async function seedCategory() {
  const count = await Category.countDocuments();
  if (count > 0) {
    logger.info('Category đã có dữ liệu, bỏ qua seed category.');
    return;
  }
  await Category.create([
    { name: 'Món nước' },
    { name: 'Món khô' }
  ]);
  logger.info('Seed category thành công!');
}

async function seedRestaurant() {
  const count = await Restaurant.countDocuments();
  if (count > 0) {
    logger.info('Restaurant đã có dữ liệu, bỏ qua seed restaurant.');
    return;
  }
  const cat1 = await Category.findOne({ name: 'Món nước' });
  const cat2 = await Category.findOne({ name: 'Món khô' });
  await Restaurant.create([
    { name: 'Quán Ăn A', address: '123 Đường A', description: 'Quán ăn ngon', categories: [cat1?._id, cat2?._id].filter(Boolean) },
    { name: 'Quán Ăn B', address: '456 Đường B', description: 'Quán ăn bình dân', categories: [cat1?._id].filter(Boolean) }
  ]);
  logger.info('Seed restaurant thành công!');
}

async function seedFood() {
  const count = await Food.countDocuments();
  if (count > 0) {
    logger.info('Food đã có dữ liệu, bỏ qua seed food.');
    return;
  }
  const cat1 = await Category.findOne({ name: 'Món nước' });
  const cat2 = await Category.findOne({ name: 'Món khô' });
  const res1 = await Restaurant.findOne({ name: 'Quán Ăn A' });
  const res2 = await Restaurant.findOne({ name: 'Quán Ăn B' });
  await Food.create([
    { name: 'Phở bò', price: 40000, description: 'Phở bò truyền thống', category: cat1?._id, restaurant: res1?._id },
    { name: 'Bún chả', price: 35000, description: 'Bún chả Hà Nội', category: cat2?._id, restaurant: res1?._id },
    { name: 'Bánh canh', price: 30000, description: 'Bánh canh cua', category: cat1?._id, restaurant: res2?._id },
    { name: 'Cơm tấm', price: 45000, description: 'Cơm tấm sườn bì', category: cat2?._id, restaurant: res2?._id },
  ]);
  logger.info('Seed food thành công!');
}

async function seedOrder() {
  const count = await Order.countDocuments();
  if (count > 0) {
    logger.info('Order đã có dữ liệu, bỏ qua seed order.');
    return;
  }
  const customer = await User.findOne({ role: 'customer' });
  const admin = await User.findOne({ role: 'admin' });
  const restaurant = await Restaurant.findOne();
  const food1 = await Food.findOne();
  const food2 = await Food.findOne({ _id: { $ne: food1?._id } });
  if (!customer || !admin || !restaurant || !food1) {
    logger.info('Thiếu dữ liệu liên quan để seed order.');
    return;
  }
  
  const totalAmount1 = (food1.price * 2) + (food2 ? food2.price * 1 : 0);
  const totalAmount2 = food1.price * 1;
  
  await Order.create([
    {
      customer: customer._id,
      restaurant: restaurant._id,
      items: [
        { food: food1._id, quantity: 2, price: food1.price },
        ...(food2 ? [{ food: food2._id, quantity: 1, price: food2.price }] : [])
      ],
      totalAmount: totalAmount1,
      status: 'pending'
    },
    {
      customer: customer._id,
      restaurant: restaurant._id,
      items: [
        { food: food1._id, quantity: 1, price: food1.price }
      ],
      totalAmount: totalAmount2,
      status: 'completed'
    }
  ]);
  logger.info('Seed order thành công!');
}

async function seedMessage() {
  const count = await Message.countDocuments();
  if (count > 0) {
    logger.info('Message đã có dữ liệu, bỏ qua seed message.');
    return;
  }
  const customer = await User.findOne({ role: 'customer' });
  const admin = await User.findOne({ role: 'admin' });
  const order = await Order.findOne();
  if (!customer || !admin || !order) {
    logger.info('Thiếu dữ liệu liên quan để seed message.');
    return;
  }
  await Message.create([
    {
      sender: customer._id,
      receiver: admin._id,
      order: order._id,
      content: 'Chào quán, tôi muốn hỏi về đơn hàng này.'
    },
    {
      sender: admin._id,
      receiver: customer._id,
      order: order._id,
      content: 'Chào bạn, đơn hàng của bạn đang được chuẩn bị.'
    },
    {
      sender: customer._id,
      receiver: admin._id,
      content: 'Chào admin, tôi có câu hỏi về menu.'
    },
    {
      sender: admin._id,
      receiver: customer._id,
      content: 'Chào bạn, tôi có thể giúp gì cho bạn?'
    },
    {
      sender: customer._id,
      receiver: admin._id,
      content: 'Quán có món chay không ạ?'
    },
    {
      sender: admin._id,
      receiver: customer._id,
      content: 'Có bạn nhé, chúng tôi có nhiều món chay ngon.'
    }
  ]);
  logger.info('Seed data message thành công!');
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const arg = process.argv[2];
  if (!arg) {
    await seedUser();
    await seedCategory();
    await seedRestaurant();
    await seedFood();
    await seedOrder();
    await seedMessage();
    logger.info('Seed tất cả thành công!');
  } else if (arg === 'user') {
    await seedUser();
  } else if (arg === 'category') {
    await seedCategory();
  } else if (arg === 'restaurant') {
    await seedRestaurant();
  } else if (arg === 'food') {
    await seedFood();
  } else if (arg === 'order') {
    await seedOrder();
  } else if (arg === 'message') {
    await seedMessage();
  } else {
    logger.info('Tham số không hợp lệ. Chọn: user, category, restaurant, food, order, message');
  }
}

main();

module.exports = {
  seedUser,
  seedCategory,
  seedRestaurant,
  seedFood,
  seedOrder,
  seedMessage
}; 