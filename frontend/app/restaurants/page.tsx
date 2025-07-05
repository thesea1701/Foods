"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Typography, Grid, Card, CardContent, CardMedia, CircularProgress, Alert, Button } from '@mui/material';

type Restaurant = {
  _id: string;
  name: string;
  image?: string;
  address?: string;
  description?: string;
};

export default function RestaurantsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  useEffect(() => {
    fetch(`${API_URL}/api/restaurants`)
      .then(res => res.json())
      .then(data => {
        setRestaurants(data);
        setLoading(false);
      })
      .catch(() => {
        setError('Không thể tải danh sách quán ăn!');
        setLoading(false);
      });
  }, []);

  const handleViewFoods = (restaurantId: string) => {
    router.push(`/foods?restaurantId=${restaurantId}`);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" mb={3}>Danh sách quán ăn</Typography>
      {loading && <CircularProgress />}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Grid container spacing={3}>
        {restaurants.map(restaurant => (
          <Grid key={restaurant._id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
            <Card>
              {restaurant.image && (
                <CardMedia component="img" height="160" image={restaurant.image} alt={restaurant.name} />
              )}
              <CardContent>
                <Typography variant="h6">{restaurant.name}</Typography>
                {restaurant.address && <Typography color="text.secondary">Địa chỉ: {restaurant.address}</Typography>}
                {restaurant.description && <Typography variant="body2" color="text.secondary">{restaurant.description}</Typography>}
                <Button 
                  variant="contained" 
                  color="primary" 
                  fullWidth 
                  sx={{ mt: 2 }}
                  onClick={() => handleViewFoods(restaurant._id)}
                >
                  Xem món ăn
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
} 