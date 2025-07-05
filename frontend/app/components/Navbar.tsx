"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  Box, 
  Container, 
  Menu, 
  MenuItem, 
  IconButton, 
  Avatar, 
  Badge,
  List,
  ListItem,
  ListItemText,
  Divider,
  Typography as MuiTypography,
  Drawer,
} from '@mui/material';
import { ShoppingCart, Notifications, Menu as MenuIcon } from '@mui/icons-material';
import { useRouter } from 'next/navigation';

function getUserFromToken() {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('token');
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload;
  } catch {
    return null;
  }
}

function getUserFromLocalStorage() {
  if (typeof window === 'undefined') return null;
  const userData = localStorage.getItem('user');
  if (!userData) return null;
  try {
    return JSON.parse(userData);
  } catch {
    return null;
  }
}

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notificationAnchorEl, setNotificationAnchorEl] = useState<null | HTMLElement>(null);
  const [mounted, setMounted] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const updateUserState = () => {
    const userFromStorage = getUserFromLocalStorage();
    if (userFromStorage) {
      setUser(userFromStorage);
    } else {
      setUser(getUserFromToken());
    }
  };

  useEffect(() => {
    updateUserState();
    setMounted(true);
    
    const handleStorageChange = () => {
      updateUserState();
    };
    
    const handleAuthChange = () => {
      updateUserState();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('authStateChanged', handleAuthChange);
    
    const updateCartCount = () => {
      const cart = localStorage.getItem('cart');
      if (cart) {
        const cartItems = JSON.parse(cart);
        const count = cartItems.reduce((total: number, item: any) => total + item.quantity, 0);
        setCartCount(count);
      } else {
        setCartCount(0);
      }
    };
    
    updateCartCount();
    window.addEventListener('storage', updateCartCount);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('authStateChanged', handleAuthChange);
      window.removeEventListener('storage', updateCartCount);
    };
  }, []);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleClose = () => {
    setAnchorEl(null);
  };
  
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setAnchorEl(null);
    window.dispatchEvent(new Event('authStateChanged'));
    window.location.reload();
  };

  const handleNotificationMenu = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationAnchorEl(event.currentTarget);
  };
  
  const handleNotificationClose = () => {
    setNotificationAnchorEl(null);
  };

  const handleNotificationClick = (notificationId: string) => {
    if (user && user.role === 'admin') {
      router.push('/admin-orders');
    } else {
      router.push('/orders');
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const renderMenuItems = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 200, p: 2 }}>
      {(!mounted || !user || (user && user.role !== 'admin')) && (
        <>
          <Button color="inherit" component={Link} href="/restaurants" onClick={() => setMobileOpen(false)}>Quán ăn</Button>
          <Button color="inherit" component={Link} href="/categories" onClick={() => setMobileOpen(false)}>Loại món</Button>
          <Button color="inherit" component={Link} href="/foods" onClick={() => setMobileOpen(false)}>Món ăn</Button>
        </>
      )}
      {mounted && user && user.role !== 'admin' && (
        <>
          <Button color="inherit" component={Link} href="/cart" onClick={() => setMobileOpen(false)}>
            <Badge badgeContent={cartCount} color="secondary">
              <ShoppingCart />
            </Badge>
            &nbsp;Giỏ hàng
          </Button>
          <Button color="inherit" component={Link} href="/orders" onClick={() => setMobileOpen(false)}>Đơn hàng</Button>
          <Button color="inherit" component={Link} href="/chat" onClick={() => setMobileOpen(false)}>Chat</Button>
        </>
      )}
      {mounted && user && user.role === 'admin' && (
        <>
          <Button color="inherit" component={Link} href="/admin-orders" onClick={() => setMobileOpen(false)}>Quản lý đơn hàng</Button>
          <Button color="inherit" component={Link} href="/admin-chat" onClick={() => setMobileOpen(false)}>Admin Chat</Button>
        </>
      )}
      {mounted && user ? (
        <>
          <Button color="inherit" onClick={() => { handleLogout(); setMobileOpen(false); }}>Đăng xuất</Button>
        </>
      ) : (
        <>
          <Button color="inherit" component={Link} href="/login" onClick={() => setMobileOpen(false)}>Đăng nhập</Button>
          <Button color="inherit" component={Link} href="/register" onClick={() => setMobileOpen(false)}>Đăng ký</Button>
        </>
      )}
    </Box>
  );

  return (
    <AppBar position="static">
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>
              Foods
            </Link>
          </Typography>
          <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center' }}>
            <IconButton color="inherit" edge="start" onClick={handleDrawerToggle}>
              <MenuIcon />
            </IconButton>
          </Box>
          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1, alignItems: 'center' }}>
            {(!mounted || !user || (user && user.role !== 'admin')) && (
              <>
                <Button color="inherit" component={Link} href="/restaurants">Quán ăn</Button>
                <Button color="inherit" component={Link} href="/categories">Loại món</Button>
                <Button color="inherit" component={Link} href="/foods">Món ăn</Button>
              </>
            )}
            {mounted && user && user.role !== 'admin' && (
              <>
                <Button color="inherit" component={Link} href="/cart">
                  <Badge badgeContent={cartCount} color="secondary">
                    <ShoppingCart />
                  </Badge>
                </Button>
                <Button color="inherit" component={Link} href="/orders">Đơn hàng</Button>
                <Button color="inherit" component={Link} href="/chat">Chat</Button>
              </>
            )}
            {mounted && user && user.role === 'admin' && (
              <>
                <Button color="inherit" component={Link} href="/admin-orders">Quản lý đơn hàng</Button>
                <Button color="inherit" component={Link} href="/admin-chat">Admin Chat</Button>
              </>
            )}
            {mounted && user ? (
              <>
                <Button color="inherit" onClick={handleMenu}>
                  Xin chào {user.name}
                </Button>
                <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
                  <MenuItem onClick={handleLogout}>Đăng xuất</MenuItem>
                </Menu>
              </>
            ) : (
              <>
                <Button color="inherit" component={Link} href="/login">Đăng nhập</Button>
                <Button color="inherit" component={Link} href="/register">Đăng ký</Button>
              </>
            )}
          </Box>
        </Toolbar>
      </Container>
      <Drawer
        anchor="left"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 250 },
        }}
      >
        {renderMenuItems()}
      </Drawer>
    </AppBar>
  );
} 