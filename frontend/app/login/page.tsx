"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Box, Typography, TextField, Button, Paper, Alert } from '@mui/material';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Đăng nhập thất bại!');
      } else {
        setSuccess('Đăng nhập thành công!');
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        window.dispatchEvent(new Event('authStateChanged'));
        
        router.push('/')
      }
    } catch {
      setError('Không thể kết nối máy chủ!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
        <Box display='flex' flexDirection='column' alignItems='center'>
          <Typography variant='h4' mb={2}>Đăng nhập</Typography>
          <Box component="form" onSubmit={handleSubmit} width="100%">
            <TextField label='Email' fullWidth margin='normal' value={email} onChange={e => setEmail(e.target.value)} required/>
            <TextField label='Mật khẩu' type='password' fullWidth margin='normal' value={password} onChange={e => setPassword(e.target.value)} required/>
            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}
            <Button type="submit" variant='contained' color='primary' fullWidth sx={{ mt: 2 }} disabled={loading}>{loading ? 'Đang đăng nhập...' : 'Đăng nhập'}</Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
} 