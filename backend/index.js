require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const authRoutes = require('./routes/auth');
const restaurantRoutes = require('./routes/restaurant');
const categoryRoutes = require('./routes/category');
const foodRoutes = require('./routes/food');
const orderRoutes = require('./routes/order');
const messageRoutes = require('./routes/message');
const cartRoutes = require('./routes/cart');
const seedUser = require('./seed').seedUser;
const seedCategory = require('./seed').seedCategory;
const seedRestaurant = require('./seed').seedRestaurant;
const seedFood = require('./seed').seedFood;
const seedOrder = require('./seed').seedOrder;
const seedMessage = require('./seed').seedMessage;
const jwt = require('jsonwebtoken');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

app.get('/', (req, res) => {
  res.send('API is running');
});

app.use('/api/auth', authRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/foods', foodRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/cart', cartRoutes);

app.set('io', io);

io.on('connection', (socket) => {
  socket.on('authenticate', async (token) => {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      socket.userRole = decoded.role;
      socket.userName = decoded.name;
      
      socket.join(`user_${decoded.userId}`);
      
      if (decoded.role === 'admin') {
        socket.join('admin');
      }
      
      socket.emit('authenticated', { success: true });
    } catch (err) {
      socket.emit('authenticated', { success: false, error: 'Invalid token' });
    }
  });
  
  socket.on('join_admin_chat', () => {
    if (socket.userId) {
      socket.join(`admin_chat_${socket.userId}`);
    }
  });
  
  socket.on('join_customer_chat', (customerId) => {
    if (socket.userRole === 'admin') {
      socket.join(`admin_chat_${customerId}`);
    } else {
    }
  });
  
  socket.on('join_admin_room', () => {
    if (socket.userRole === 'admin') {
      socket.join('admin');
    } else {
    }
  });
  
  socket.on('join_user_room', (userId) => {
    if (socket.userId && socket.userId === userId) {
      socket.join(`user_${userId}`);
    } else {
    }
  });
  
  socket.on('join_order', (orderId) => {
    socket.join(`order_${orderId}`);
  });
  
  socket.on('leave_order', (orderId) => {
    socket.leave(`order_${orderId}`);
  });
  
  socket.on('typing_start', (data) => {
    const { receiverId, orderId } = data;
    const roomId = orderId ? `order_${orderId}` : `admin_chat_${receiverId}`;
    socket.to(roomId).emit('user_typing', {
      userId: socket.userId,
      userName: socket.userName
    });
  });
  
  socket.on('typing_stop', (data) => {
    const { receiverId, orderId } = data;
    const roomId = orderId ? `order_${orderId}` : `admin_chat_${receiverId}`;
    socket.to(roomId).emit('user_stop_typing', {
      userId: socket.userId
    });
  });
  
  socket.on('disconnect', () => {
  });
});

async function autoSeedIfEmpty() {
  const User = require('./models/User');
  const Restaurant = require('./models/Restaurant');
  const Category = require('./models/Category');
  const Food = require('./models/Food');
  const Order = require('./models/Order');
  const Message = require('./models/Message');
  const userCount = await User.countDocuments();
  const resCount = await Restaurant.countDocuments();
  const catCount = await Category.countDocuments();
  const foodCount = await Food.countDocuments();
  const orderCount = await Order.countDocuments();
  const messageCount = await Message.countDocuments();
  if (userCount === 0 || resCount === 0 || catCount === 0 || foodCount === 0 || orderCount === 0 || messageCount === 0) {
    await seedUser();
    await seedCategory();
    await seedRestaurant();
    await seedFood();
    await seedOrder();
    await seedMessage();
  }
}
autoSeedIfEmpty();

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 