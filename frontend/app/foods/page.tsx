"use client";
import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Container, Typography, Card, CardContent, CardMedia, CircularProgress, Alert, Button, TextField, Box } from '@mui/material';
import Grid from '@mui/material/Grid';

type Food = {
  _id: string;
  name: string;
  image?: string;
  price?: number;
  description?: string;
  restaurant?: {
    _id: string;
    name: string;
  };
  category?: {
    _id: string;
    name: string;
  };
};

type Restaurant = {
  _id: string;
  name: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

function FoodsContent() {
  const [foods, setFoods] = useState<Food[]>([]);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quantities, setQuantities] = useState<{ [key: string]: number }>({});
  const searchParams = useSearchParams();
  const restaurantId = searchParams.get('restaurantId');
  const categoryId = searchParams.get('categoryId');
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    let url = '';
    if (restaurantId) {
      url = `${API_URL}/api/foods?restaurantId=${restaurantId}`;
    } else if (categoryId) {
      url = `${API_URL}/api/foods?categoryId=${categoryId}`;
    } else {
      url = `${API_URL}/api/foods`;
    }

    fetch(url)
      .then(res => res.json())
      .then(data => {
        setFoods(data);
        setLoading(false);
      })
      .catch(() => {
        setError('Không thể tải danh sách món ăn!');
        setLoading(false);
      });

    if (restaurantId) {
      fetch(`${API_URL}/api/restaurants/${restaurantId}`)
        .then(res => res.json())
        .then(data => setRestaurant(data))
        .catch(() => setRestaurant(null));
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    setIsLoggedIn(!!token);
  }, [restaurantId, categoryId]);

  const handleQuantityChange = (foodId: string, value: string) => {
    const numValue = parseInt(value) || 1;
    setQuantities(prev => ({
      ...prev,
      [foodId]: Math.max(1, numValue)
    }));
  };

  const addToCart = (food: Food) => {
    const quantity = quantities[food._id] || 1;
    const cartItem = {
      _id: food._id,
      name: food.name,
      price: food.price || 0,
      quantity: quantity,
      image: food.image,
      restaurant: restaurantId || food.restaurant?._id,
      restaurantName: restaurant?.name || food.restaurant?.name || ''
    };

    const currentCart = localStorage.getItem('cart');
    let cartItems = currentCart ? JSON.parse(currentCart) : [];

    const existingItemIndex = cartItems.findIndex((item: any) => item._id === food._id);
    
    if (existingItemIndex >= 0) {
      cartItems[existingItemIndex].quantity += quantity;
    } else {
      cartItems.push(cartItem);
    }

    localStorage.setItem('cart', JSON.stringify(cartItems));
    
    if (restaurantId) {
      localStorage.setItem('currentRestaurant', restaurantId);
    }
    
    window.dispatchEvent(new Event('storage'));
    
    alert(`Đã thêm ${quantity} ${food.name} vào giỏ hàng!`);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" mb={3}>
        {restaurantId && restaurant 
          ? `Món ăn của quán ${restaurant.name}`
          : restaurantId 
            ? 'Món ăn của quán'
            : categoryId
              ? 'Món ăn theo loại'
              : 'Danh sách món ăn'
        }
      </Typography>
      {loading && <CircularProgress />}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Grid container spacing={3}>
        {foods.map(food => (
          <Grid key={food._id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
            <Card>
              {food.image && (
                <CardMedia component="img" height="160" image={food.image} alt={food.name} />
              )}
              <CardContent>
                <Typography variant="h6">{food.name}</Typography>
                {food.price && <Typography color="text.secondary">Giá: {food.price.toLocaleString()}đ</Typography>}
                {food.description && <Typography variant="body2" color="text.secondary">{food.description}</Typography>}
                {food.category && (
                  <Typography variant="caption" color="text.secondary">
                    Loại: {food.category.name} <br/>
                  </Typography>
                )}
                {food.restaurant && !restaurantId && (
                  <Typography variant="caption" color="text.secondary">Quán: {food.restaurant.name}</Typography>
                )}
                
                <Box sx={{ mt: 2, display: 'flex', gap: 1, alignItems: 'center' }}>
                  {isLoggedIn ? (
                    <>
                      <TextField
                        type="number"
                        label="Số lượng"
                        size="small"
                        value={quantities[food._id] || 1}
                        onChange={(e) => handleQuantityChange(food._id, e.target.value)}
                        inputProps={{ min: 1 }}
                        sx={{ width: 100 }}
                      />
                      <Button 
                        variant="contained" 
                        color="primary" 
                        size="small"
                        onClick={() => addToCart(food)}
                        sx={{ flex: 1 }}
                      >
                        Thêm vào giỏ
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="contained"
                      color="warning"
                      size="small"
                      sx={{ flex: 1 }}
                      onClick={() => router.push('/login')}
                    >
                      Vui lòng đăng nhập 
                    </Button>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}

export default function FoodsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <FoodsContent />
    </Suspense>
  );
} 