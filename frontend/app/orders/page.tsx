"use client";
import React, { useEffect, useState, useRef } from 'react';
import { Container, Typography, List, ListItem, ListItemText, Paper, CircularProgress, Alert, Box, Chip, Button, Snackbar } from '@mui/material';
import { useSocket } from '../../hooks/useSocket';
import { useRouter } from 'next/navigation';
import 'react-toastify/dist/ReactToastify.css';

type Order = {
  _id: string;
  status: string;
  customerName?: string;
  createdAt?: string;
  totalAmount?: number;
  items?: Array<{
    food: {
      _id: string;
      name: string;
      price: number;
    };
    quantity: number;
    price: number;
  }>;
  restaurant?: {
    _id: string;
    name: string;
  };
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const previousOrdersRef = useRef<Order[]>([]);
  const { socket, isConnected, isAuthenticated, joinUserRoom } = useSocket();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [shouldRefetch, setShouldRefetch] = useState(false);

  const fetchOrders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;
    fetch(`${API_URL}/api/orders/my`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) {
          throw new Error('Không thể tải danh sách đơn hàng!');
        }
        return res.json();
      })
      .then(data => {
        setOrders(data);
        previousOrdersRef.current = data;
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Không thể tải danh sách đơn hàng!');
        setLoading(false);
      });
  };

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      setError('Vui lòng đăng nhập để xem đơn hàng!');
      setLoading(false);
      return;
    }
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (shouldRefetch) {
      fetchOrders();
      setShouldRefetch(false);
    }
  }, [shouldRefetch]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'confirmed':
        return 'info';
      case 'completed':
        return 'success';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: string) => {
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

  if (!mounted) return null;

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" mb={3}>Danh sách đơn hàng</Typography>
      {loading && <CircularProgress />}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Paper elevation={2} sx={{ mt: 2 }}>
        <List>
          {orders.length === 0 ? (
            <ListItem>
              <ListItemText primary="Chưa có đơn hàng nào" />
            </ListItem>
          ) : (
            orders.map(order => (
              <ListItem key={order._id} divider>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Typography variant="h6" component="div">
                        {order.createdAt ? new Date(order.createdAt).toLocaleString('vi-VN') : ''}
                      </Typography>
                      <Chip 
                        label={getStatusText(order.status)} 
                        color={getStatusColor(order.status) as any}
                        size="small"
                        variant="filled"
                      />
                    </Box>
                  }
                />
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
                  {order.restaurant && (
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                      Quán: {order.restaurant.name}
                    </Typography>
                  )}
                  {order.items && order.items.length > 0 && (
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                        Món ăn:
                      </Typography>
                      {order.items.map((item, index) => (
                        <Typography key={item.food._id} variant="body2" color="text.secondary" sx={{ ml: 2, mt: 0.5 }}>
                          • {item.food.name} - {item.quantity} phần - {(item.price || 0).toLocaleString()}đ
                        </Typography>
                      ))}
                    </Box>
                  )}
                  {order.totalAmount && (
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                      Tổng cộng: {(order.totalAmount || 0).toLocaleString()}đ
                    </Typography>
                  )}
                </Box>
              </ListItem>
            ))
          )}
        </List>
      </Paper>
    </Container>
  );
} 