"use client";
import React, { useEffect, useState, useRef } from 'react';
import { 
  Container, 
  Typography, 
  Paper, 
  TextField, 
  Button, 
  Box, 
  CircularProgress, 
  Alert,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  Chip
} from '@mui/material';
import { Send, Person, AdminPanelSettings } from '@mui/icons-material';
import { useSocket } from '../../hooks/useSocket';
import { useRouter } from 'next/navigation';

type Message = {
  _id: string;
  sender: {
    _id: string;
    name: string;
    role: string;
  };
  receiver: {
    _id: string;
    name: string;
    role: string;
  };
  content: string;
  createdAt: string;
};

type User = {
  id: string;
  name: string;
  role: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [admin, setAdmin] = useState<any>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  const { socket, isConnected, isAuthenticated, joinAdminChat } = useSocket();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  useEffect(() => {
    const userData = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    
    if (userData) {
      setUser(JSON.parse(userData));
    }

    fetch(`${API_URL}/api/messages/admin`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) {
          throw new Error('Không thể tải tin nhắn!');
        }
        return res.json();
      })
      .then(data => {
        setMessages(data);
        if (data.length > 0) {
          const firstMessage = data[0];
          const adminUser = firstMessage.sender.role === 'admin' ? firstMessage.sender : firstMessage.receiver;
          setAdmin(adminUser);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Không thể tải tin nhắn!');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!socket) return;

    if (isAuthenticated) {
      joinAdminChat();
    }

    socket.on('new_message', (message: Message) => {
      if (String(message.sender._id) === String(user?.id)) {
        return;
      }
      
      const messageExists = messages.some(msg => msg._id === message._id);
      if (messageExists) {
        return;
      }
      
      setMessages(prev => {
        const uniqueMessages = [...prev, message].filter((msg, index, self) => 
          index === self.findIndex(m => m._id === msg._id)
        );
        return uniqueMessages;
      });
    });

    socket.on('user_typing', (data: { userId: string; userName: string }) => {
      if (data.userId !== user?.id) {
        setIsTyping(true);
        setTypingUser(data.userName);
      }
    });

    socket.on('user_stop_typing', (data: { userId: string }) => {
      if (data.userId !== user?.id) {
        setIsTyping(false);
        setTypingUser('');
      }
    });

    return () => {
      socket.off('new_message');
      socket.off('user_typing');
      socket.off('user_stop_typing');
    };
  }, [socket, isAuthenticated, user?.id, joinAdminChat]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    
    if (socket && admin?._id) {
      socket.emit('typing_start', { receiverId: admin._id });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (socket && admin?._id) {
        socket.emit('typing_stop', { receiverId: admin._id });
      }
    }, 1000);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Vui lòng đăng nhập để gửi tin nhắn!');
      return;
    }

    setSending(true);
    setError('');

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (socket && admin?._id) {
      socket.emit('typing_stop', { receiverId: admin._id });
    }

    try {
      let adminId = admin?._id;
      if (!adminId) {
        const adminResponse = await fetch(`${API_URL}/api/auth/admin`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (adminResponse.ok) {
          const adminData = await adminResponse.json();
          adminId = adminData._id;
          setAdmin(adminData);
        }
      }

      if (!adminId) {
        throw new Error('Không tìm thấy admin!');
      }

      const response = await fetch(`${API_URL}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          receiver: adminId,
          content: input.trim()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Gửi tin nhắn thất bại!');
      }

      setMessages(prev => {
        const existsInCurrent = prev.some(msg => msg._id === data._id);
        if (existsInCurrent) {
          return prev;
        }
        const uniqueMessages = [...prev, data].filter((msg, index, self) => 
          index === self.findIndex(m => m._id === msg._id)
        );
        return uniqueMessages;
      });
      setInput('');
    } catch (err: any) {
      setError(err.message || 'Gửi tin nhắn thất bại!');
    } finally {
      setSending(false);
    }
  };

  const isOwnMessage = (message: Message) => {
    return message.sender._id === user?.id;
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!mounted) return null;

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Typography variant="h4">Chat với Admin</Typography>
        {admin && (
          <Chip 
            icon={<AdminPanelSettings />} 
            label={admin.name} 
            color="primary" 
            variant="outlined"
          />
        )}
      </Box>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      <Paper elevation={3} sx={{ height: '60vh', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ 
          flex: 1, 
          overflowY: 'auto', 
          p: 2,
          backgroundColor: '#f5f5f5'
        }}>
          {messages.length === 0 ? (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              height: '100%',
              color: 'text.secondary'
            }}>
              <Typography variant="h6" gutterBottom>
                Chưa có tin nhắn nào
              </Typography>
              <Typography variant="body2">
                Bắt đầu cuộc trò chuyện với admin!
              </Typography>
            </Box>
          ) : (
            <List sx={{ p: 0 }}>
              {messages.map((message, index) => (
                <React.Fragment key={message._id}>
                  <ListItem 
                    sx={{ 
                      flexDirection: 'column',
                      alignItems: isOwnMessage(message) ? 'flex-end' : 'flex-start',
                      p: 1
                    }}
                  >
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'flex-end',
                      gap: 1,
                      maxWidth: '70%',
                      flexDirection: isOwnMessage(message) ? 'row-reverse' : 'row'
                    }}>
                      {!isOwnMessage(message) && (
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                          <AdminPanelSettings />
                        </Avatar>
                      )}
                      
                      <Box sx={{
                        backgroundColor: isOwnMessage(message) ? 'primary.main' : 'white',
                        color: isOwnMessage(message) ? 'white' : 'text.primary',
                        borderRadius: 2,
                        p: 1.5,
                        boxShadow: 1,
                        maxWidth: '100%',
                        wordBreak: 'break-word'
                      }}>
                        <Typography variant="body2">
                          {message.content}
                        </Typography>
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            opacity: 0.7,
                            display: 'block',
                            mt: 0.5,
                            textAlign: isOwnMessage(message) ? 'right' : 'left'
                          }}
                        >
                          {formatTime(message.createdAt)}
                        </Typography>
                      </Box>
                      
                      {isOwnMessage(message) && (
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
                          <Person />
                        </Avatar>
                      )}
                    </Box>
                  </ListItem>
                  {index < messages.length - 1 && <Divider />}
                </React.Fragment>
              ))}
              
              {isTyping && (
                <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start', p: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
                    <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                      <AdminPanelSettings />
                    </Avatar>
                    <Box sx={{
                      backgroundColor: 'white',
                      borderRadius: 2,
                      p: 1.5,
                      boxShadow: 1
                    }}>
                      <Typography variant="body2" color="text.secondary">
                        {typingUser} đang nhập...
                      </Typography>
                    </Box>
                  </Box>
                </ListItem>
              )}
              
              <div ref={messagesEndRef} />
            </List>
          )}
        </Box>
        
        <Box component="form" onSubmit={handleSend} sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              placeholder="Nhập tin nhắn..."
              value={input}
              onChange={handleInputChange}
              disabled={sending}
              variant="outlined"
              size="small"
            />
            <Button 
              type="submit" 
              variant="contained" 
              disabled={sending || !input.trim()}
              sx={{ minWidth: 'auto', px: 2 }}
            >
              {sending ? <CircularProgress size={20} /> : <Send />}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
} 