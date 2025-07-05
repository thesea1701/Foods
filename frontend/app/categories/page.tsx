"use client";
import React, { useEffect, useState } from 'react';
import { Container, Box, Typography, Chip, Stack, CircularProgress, Alert } from '@mui/material';
import { useRouter } from 'next/navigation';

type Category = { _id: string; name: string };

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  useEffect(() => {
    fetch(`${API_URL}/api/categories`)
      .then(res => res.json())
      .then(data => {
        setCategories(data);
        setLoading(false);
      })
      .catch(() => {
        setError('Không thể tải danh sách loại món!');
        setLoading(false);
      });
  }, []);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" mb={3}>Danh sách loại món</Typography>
      {loading && <CircularProgress />}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Stack direction="row" spacing={2} flexWrap="wrap">
        {categories.map((cat) => (
          <Chip 
            key={cat._id} 
            label={cat.name} 
            sx={{ mb: 2 }} 
            clickable
            onClick={() => router.push(`/foods?categoryId=${cat._id}`)}
          />
        ))}
      </Stack>
    </Container>
  );
} 