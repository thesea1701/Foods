"use client";
import React, { useEffect, useState, useRef } from 'react';
import { Container, Typography, List, ListItem, ListItemText, Paper, CircularProgress, Alert, Box, Chip, Button, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { useSocket } from '../../hooks/useSocket';
import { useRouter } from 'next/navigation';
import { ToastContainer, toast } from 'react-toastify';
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
  customer?: {
    _id: string;
    name: string;
  };
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const previousOrdersRef = useRef<Order[]>([]);
  const { socket, isConnected, isAuthenticated, joinAdminRoom } = useSocket();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  useEffect(() => {
    if (statusFilter === 'all') {
      setFilteredOrders(orders);
    } else {
      const filtered = orders.filter(order => order.status === statusFilter);
      setFilteredOrders(filtered);
    }
  }, [orders, statusFilter]);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const userData = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    
    if (!token) {
      setError('Vui lòng đăng nhập!');
      setLoading(false);
      return;
    }

    if (userData) {
      const userInfo = JSON.parse(userData);
      if (userInfo.role !== 'admin') {
        setError('Chỉ admin mới được truy cập trang này!');
        setLoading(false);
        return;
      }
    }
    
    const fetchOrders = () => {
      fetch(`${API_URL}/api/orders/all`, {
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

    fetchOrders();
    
    const interval = setInterval(fetchOrders, 30000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!socket || !isAuthenticated) return;

    joinAdminRoom();

    socket.on('new_order_for_admin', (data: { order: Order; customerName: string; restaurantName: string }) => {
      setOrders(prev => [data.order, ...prev]);
    });

    socket.on('order_status_updated', (updatedOrder: Order) => {
      setOrders(prev => 
        prev.map(order => 
          order._id === updatedOrder._id ? updatedOrder : order
        )
      );
    });

    return () => {
      socket.off('new_order_for_admin');
      socket.off('order_status_updated');
    };
  }, [socket, isAuthenticated, joinAdminRoom]);

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

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        const updatedOrder = await response.json();
        setOrders(prev =>
          prev.map(order =>
            order._id === orderId ? updatedOrder : order
          )
        );
        toast.success('Cập nhật trạng thái đơn hàng thành công!');
      } else {
        toast.error('Cập nhật trạng thái đơn hàng thất bại!');
        console.error('Failed to update order status:', response.statusText);
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra khi cập nhật trạng thái!');
      console.error('Error updating order status:', error);
    }
  };

  const handleStatusFilterChange = (event: any) => {
    setStatusFilter(event.target.value);
  };

  const handleOrderStatusChange = (orderId: string, newStatus: string) => {
    updateOrderStatus(orderId, newStatus);
  };

  if (!mounted) return null;

  return (
    <Container maxWidth="lg" sx={{ py: 4, px: { xs: 0.5, sm: 2 } }}>
      <Typography variant="h4" mb={3} sx={{ fontSize: { xs: 22, sm: 32 } }}>Quản lý đơn hàng</Typography>
      <Box sx={{ mb: 3, px: { xs: 1, sm: 0 } }}>
        <FormControl sx={{ minWidth: { xs: 120, sm: 200 } }} size="small">
          <InputLabel id="status-filter-label">Lọc theo trạng thái</InputLabel>
          <Select
            labelId="status-filter-label"
            id="status-filter"
            value={statusFilter}
            label="Lọc theo trạng thái"
            onChange={handleStatusFilterChange}
          >
            <MenuItem value="all">Tất cả đơn hàng</MenuItem>
            <MenuItem value="pending">Chờ xác nhận</MenuItem>
            <MenuItem value="confirmed">Đã xác nhận</MenuItem>
            <MenuItem value="completed">Hoàn thành</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {loading && <CircularProgress />}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Paper elevation={2} sx={{ mt: 2, overflowX: 'auto' }}>
        <List sx={{ minWidth: 320 }}>
          {filteredOrders.length === 0 ? (
            <ListItem>
              <ListItemText primary={statusFilter === 'all' ? "Chưa có đơn hàng nào" : `Không có đơn hàng nào ở trạng thái \"${getStatusText(statusFilter)}\"`} />
            </ListItem>
          ) : (
            filteredOrders.map(order => (
              <ListItem key={order._id} divider sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: 1 }}>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', flexDirection: { xs: 'column', sm: 'row' } }}>
                      <Typography variant="h6" component="div" sx={{ fontSize: { xs: 16, sm: 20 } }}>
                        {order.createdAt ? new Date(order.createdAt).toLocaleString('vi-VN') : ''}
                      </Typography>
                      <Chip 
                        label={getStatusText(order.status)} 
                        color={getStatusColor(order.status) as any}
                        size="small"
                        variant="filled"
                        sx={{ fontSize: { xs: 12, sm: 14 } }}
                      />
                      {order.customer && (
                        <Chip 
                          label={`Khách: ${order.customer.name}`}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: { xs: 12, sm: 14 } }}
                        />
                      )}
                    </Box>
                  }
                />
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1, flex: 1, width: '100%' }}>
                  {order.restaurant && (
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'bold', fontSize: { xs: 13, sm: 16 } }}>
                      Quán: {order.restaurant.name}
                    </Typography>
                  )}
                  {order.items && order.items.length > 0 && (
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'bold', fontSize: { xs: 13, sm: 16 } }}>
                        Món ăn:
                      </Typography>
                      {order.items.map((item, index) => (
                        <Typography key={item.food._id + '-' + index} variant="body2" color="text.secondary" sx={{ ml: 2, mt: 0.5, fontSize: { xs: 12, sm: 14 } }}>
                          • {item.food.name} - {item.quantity} phần - {(item.price || 0).toLocaleString()}đ
                        </Typography>
                      ))}
                    </Box>
                  )}
                  {order.totalAmount && (
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'bold', fontSize: { xs: 13, sm: 16 } }}>
                      Tổng cộng: {(order.totalAmount || 0).toLocaleString()}đ
                    </Typography>
                  )}
                </Box>
                <Box sx={{ display: 'flex', flexDirection: { xs: 'row', sm: 'column' }, gap: 1, minWidth: { xs: 0, sm: 200 }, width: { xs: '100%', sm: 'auto' }, mt: { xs: 1, sm: 0 } }}>
                  <FormControl size="small" sx={{ minWidth: { xs: 100, sm: 120 } }}>
                    <InputLabel id={`order-status-${order._id}-label`}>Trạng thái</InputLabel>
                    <Select
                      labelId={`order-status-${order._id}-label`}
                      id={`order-status-${order._id}`}
                      value={order.status}
                      label="Trạng thái"
                      onChange={(e) => handleOrderStatusChange(order._id, e.target.value)}
                      sx={{ fontSize: { xs: 12, sm: 14 } }}
                    >
                      <MenuItem value="pending">Chờ xác nhận</MenuItem>
                      <MenuItem value="confirmed">Đã xác nhận</MenuItem>
                      <MenuItem value="completed">Hoàn thành</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </ListItem>
            ))
          )}
        </List>
      </Paper>
      <ToastContainer position="top-center" autoClose={4000} aria-label="toast-container" />
    </Container>
  );
} 