"use client"

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Box, Typography, TextField, Button, Paper, Alert } from '@mui/material';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (password !== confirmPassword) {
      setError('Mật khẩu không khớp!');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, password })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Đăng ký thất bại!');
      } else {
        setSuccess('Đăng ký thành công! Chuyển sang trang đăng nhập...');
        
        window.dispatchEvent(new Event('authStateChanged'));
        
        router.push('/login')
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
          <Typography variant='h4' mb={2}>Đăng ký</Typography>
          <Box component="form" onSubmit={handleSubmit} width="100%">
            <TextField label='Email' fullWidth margin='normal' value={email} onChange={e => setEmail(e.target.value)} required/>
            <TextField label='Name' fullWidth margin='normal' value={name} onChange={e => setName(e.target.value)} required/>
            <TextField label='Mật khẩu' type='password' fullWidth margin='normal' value={password} onChange={e => setPassword(e.target.value)} required/>
            <TextField label='Xác nhận mật khẩu' type='password' fullWidth margin='normal' value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required/>
            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}
            <Button type="submit" variant='contained' color='primary' fullWidth sx={{ mt: 2 }} disabled={loading}>{loading ? 'Đang đăng ký...' : 'Đăng ký'}</Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
} 