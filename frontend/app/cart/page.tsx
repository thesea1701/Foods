"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Container, 
  Typography, 
  Card, 
  CardContent, 
  Button, 
  Box, 
  IconButton, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemSecondaryAction,
  Divider,
  Alert,
  CircularProgress
} from '@mui/material';
import { Add, Remove, Delete } from '@mui/icons-material';

type CartItem = {
  _id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  restaurant?: string;
  restaurantName?: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function CartPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      setCartItems(JSON.parse(savedCart));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  useEffect(() => {
    const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || 'null') : null;
    if (user && user.role === 'admin') {
      router.replace('/admin-orders');
    }
  }, [router]);

  const updateCart = (newCart: CartItem[]) => {
    setCartItems(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
    window.dispatchEvent(new Event('storage'));
  };

  const increaseQuantity = (itemId: string) => {
    const newCart = cartItems.map(item => 
      item._id === itemId ? { ...item, quantity: item.quantity + 1 } : item
    );
    updateCart(newCart);
  };

  const decreaseQuantity = (itemId: string) => {
    const newCart = cartItems.map(item => 
      item._id === itemId && item.quantity > 1 
        ? { ...item, quantity: item.quantity - 1 } 
        : item
    );
    updateCart(newCart);
  };

  const removeItem = (itemId: string) => {
    const newCart = cartItems.filter(item => item._id !== itemId);
    updateCart(newCart);
  };

  const getTotalPrice = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    setError('');
    setSuccess('');

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Vui lòng đăng nhập để đặt hàng!');
      setCheckoutLoading(false);
      return;
    }

    if (cartItems.length === 0) {
      setError('Giỏ hàng trống!');
      setCheckoutLoading(false);
      return;
    }

    try {
      const restaurantId = cartItems[0]?.restaurant || localStorage.getItem('currentRestaurant');
      
      if (!restaurantId) {
        setError('Không tìm thấy thông tin quán ăn!');
        setCheckoutLoading(false);
        return;
      }

      const orderData = {
        restaurant: restaurantId,
        items: cartItems.map(item => ({
          food: item._id,
          quantity: item.quantity,
          price: item.price
        })),
        totalAmount: getTotalPrice()
      };

      const response = await fetch(`${API_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(orderData)
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || data.error?.message || 'Đặt hàng thất bại!');
      } else {
        setSuccess('Đặt hàng thành công! Chuyển đến trang đơn hàng...');
        localStorage.removeItem('cart');
        localStorage.removeItem('currentRestaurant');
        setCartItems([]);
        window.dispatchEvent(new Event('storage'));
        setTimeout(() => {
          window.location.href = '/orders';
        }, 100);
      }
    } catch (err) {
      setError('Không thể kết nối máy chủ!');
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (!mounted) return null;

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" mb={3}>Giỏ hàng</Typography>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      
      {cartItems.length === 0 ? (
        <Alert severity="info">Giỏ hàng trống. Hãy thêm món ăn vào giỏ hàng!</Alert>
      ) : (
        <>
          <List>
            {cartItems.map((item, index) => (
              <React.Fragment key={item._id}>
                <ListItem>
                  <ListItemText
                    primary={item.name}
                    secondary={
                      <>
                        {item.restaurantName && (
                          <span>Quán: {item.restaurantName}<br /></span>
                        )}
                        Giá: {item.price.toLocaleString()}đ
                      </>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <IconButton 
                        size="small" 
                        onClick={() => decreaseQuantity(item._id)}
                        disabled={item.quantity <= 1}
                      >
                        <Remove />
                      </IconButton>
                      <Typography sx={{ minWidth: 30, textAlign: 'center' }}>
                        {item.quantity}
                      </Typography>
                      <IconButton 
                        size="small" 
                        onClick={() => increaseQuantity(item._id)}
                      >
                        <Add />
                      </IconButton>
                      <IconButton 
                        color="error" 
                        onClick={() => removeItem(item._id)}
                      >
                        <Delete />
                      </IconButton>
                    </Box>
                  </ListItemSecondaryAction>
                </ListItem>
                {index < cartItems.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>

          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Tổng cộng: {getTotalPrice().toLocaleString()}đ
              </Typography>
              <Button 
                variant="contained" 
                color="primary" 
                fullWidth 
                size="large"
                onClick={handleCheckout}
                disabled={checkoutLoading}
              >
                {checkoutLoading ? 'Đang đặt hàng...' : 'Đặt hàng'}
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </Container>
  );
} 