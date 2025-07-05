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
  Chip,
  Tabs,
  Tab,
  Card,
  CardContent,
  Badge
} from '@mui/material';
import { Send, Person, AdminPanelSettings, Chat } from '@mui/icons-material';
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

type Conversation = {
  userId: string;
  userName: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function AdminChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState<any>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  const { socket, isConnected, isAuthenticated, joinCustomerChat } = useSocket();

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
    const userData = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    
    if (!token) {
      setError('Vui lòng đăng nhập!');
      setLoading(false);
      router.push('/login');
      return;
    }

    if (userData) {
      const userInfo = JSON.parse(userData);
      setUser(userInfo);
      
      if (userInfo.role !== 'admin') {
        setError('Chỉ admin mới được truy cập trang này!');
        setLoading(false);
        return;
      }
    } else {
      setError('Không tìm thấy thông tin user!');
      setLoading(false);
      return;
    }

    fetch(`${API_URL}/api/messages/all`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) {
          throw new Error('Không thể tải tin nhắn!');
        }
        return res.json();
      })
      .then(data => {
        setAllMessages(data);
        
        updateConversations(data, unreadCounts);
        
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Không thể tải tin nhắn!');
        setLoading(false);
      });
  }, [router]);

  useEffect(() => {
    if (!socket) return;

    socket.on('new_message', (message: Message) => {
      if (String(message.sender._id) === String(user?.id)) {
        return;
      }
      
      const messageExists = allMessages.some(msg => msg._id === message._id);
      if (messageExists) {
        return;
      }
      
      setAllMessages(prev => {
        const existsInAll = prev.some(msg => msg._id === message._id);
        if (existsInAll) {
          return prev;
        }
        const updated = [...prev, message];
        updateConversations(updated, unreadCounts);
        return updated;
      });
      
      if (selectedUser && 
          ((String(message.sender._id) === String(selectedUser) && String(message.receiver._id) === String(user?.id)) ||
           (String(message.sender._id) === String(user?.id) && String(message.receiver._id) === String(selectedUser)))) {
        setMessages(prev => {
          const existsInCurrent = prev.some(msg => msg._id === message._id);
          if (existsInCurrent) {
            return prev;
          }
          const uniqueMessages = [...prev, message].filter((msg, index, self) => 
            index === self.findIndex(m => m._id === msg._id)
          );
          return uniqueMessages;
        });
      }
      
      if (message.sender.role !== 'admin' && String(selectedUser) !== String(message.sender._id)) {
        setUnreadCounts(prev => {
          const updated = {
            ...prev,
            [message.sender._id]: (prev[message.sender._id] || 0) + 1
          };
          return updated;
        });
      }
    });

    socket.on('new_customer_message', (data: { message: Message; customerId: string }) => {
      const messageExists = allMessages.some(msg => msg._id === data.message._id);
      if (messageExists) {
        return;
      }
      
      setAllMessages(prev => {
        const existsInAll = prev.some(msg => msg._id === data.message._id);
        if (existsInAll) {
          return prev;
        }
        const updated = [...prev, data.message];
        updateConversations(updated, unreadCounts);
        return updated;
      });
      
      if (selectedUser && String(data.customerId) === String(selectedUser)) {
        setMessages(prev => {
          const existsInCurrent = prev.some(msg => msg._id === data.message._id);
          if (existsInCurrent) {
            return prev;
          }
          const uniqueMessages = [...prev, data.message].filter((msg, index, self) => 
            index === self.findIndex(m => m._id === msg._id)
          );
          return uniqueMessages;
        });
      }
      
      if (String(selectedUser) !== String(data.customerId)) {
        setUnreadCounts(prev => {
          const updated = {
            ...prev,
            [data.customerId]: (prev[data.customerId] || 0) + 1
          };
          return updated;
        });
      }
    });

    socket.on('user_typing', (data: { userId: string; userName: string }) => {
      if (selectedUser && String(data.userId) === String(selectedUser)) {
        setIsTyping(true);
        setTypingUser(data.userName);
      }
    });

    socket.on('user_stop_typing', (data: { userId: string }) => {
      if (selectedUser && String(data.userId) === String(selectedUser)) {
        setIsTyping(false);
        setTypingUser('');
      }
    });

    return () => {
      socket.off('new_message');
      socket.off('new_customer_message');
      socket.off('user_typing');
      socket.off('user_stop_typing');
    };
  }, [socket, selectedUser, user?.id]);

  const loadMessagesForUser = async (userId: string) => {
    const filteredMessages = allMessages.filter((msg: Message) => {
      const senderMatch = String(msg.sender._id) === String(userId) && String(msg.receiver._id) === String(user?.id);
      const receiverMatch = String(msg.sender._id) === String(user?.id) && String(msg.receiver._id) === String(userId);
      
      return senderMatch || receiverMatch;
    });
    
    const uniqueMessages = filteredMessages.filter((msg, index, self) => 
      index === self.findIndex(m => m._id === msg._id)
    );
    
    const sortedMessages = uniqueMessages.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    setMessages(sortedMessages);
  };

  const handleUserSelect = (userId: string) => {
    setSelectedUser(userId);
    loadMessagesForUser(userId);
    
    setUnreadCounts(prev => ({ ...prev, [userId]: 0 }));
    
    if (isAuthenticated && user?.role === 'admin') {
      joinCustomerChat(userId);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending || !selectedUser) return;

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
    if (socket && selectedUser) {
      socket.emit('typing_stop', { receiverId: selectedUser });
    }

    try {
      const response = await fetch(`${API_URL}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          receiver: selectedUser,
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
      
      setAllMessages(prev => {
        const existsInAll = prev.some(msg => msg._id === data._id);
        if (existsInAll) {
          return prev;
        }
        const updated = [...prev, data];
        updateConversations(updated, unreadCounts);
        return updated;
      });
      setInput('');
    } catch (err: any) {
      setError(err.message || 'Gửi tin nhắn thất bại!');
    } finally {
      setSending(false);
    }
  };

  const isOwnMessage = (message: Message) => {
    return String(message.sender._id) === String(user?.id);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const updateConversations = (messages: Message[], unreadMap: Record<string, number> = unreadCounts) => {
    const conversationMap = new Map<string, Conversation>();
    
    messages.forEach((message: Message) => {
      const otherUser = message.sender.role === 'admin' ? message.receiver : message.sender;
      const key = otherUser._id;
      
      if (!conversationMap.has(key)) {
        conversationMap.set(key, {
          userId: otherUser._id,
          userName: otherUser.name,
          lastMessage: message.content,
          lastMessageTime: message.createdAt,
          unreadCount: unreadMap[key] || 0
        });
      } else {
        const conv = conversationMap.get(key)!;
        if (new Date(message.createdAt) > new Date(conv.lastMessageTime)) {
          conv.lastMessage = message.content;
          conv.lastMessageTime = message.createdAt;
        }
      }
    });
    
    if (unreadMap) {
      for (const [userId, count] of Object.entries(unreadMap)) {
        if (conversationMap.has(userId)) {
          conversationMap.get(userId)!.unreadCount = count;
        }
      }
    }
    
    const conversationsList = Array.from(conversationMap.values());
    setConversations(conversationsList);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    
    if (socket && selectedUser) {
      socket.emit('typing_start', { receiverId: selectedUser });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (socket && selectedUser) {
        socket.emit('typing_stop', { receiverId: selectedUser });
      }
    }, 1000);
  };

  if (!mounted) return null;

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (user?.role !== 'admin') {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">Chỉ admin mới được truy cập trang này!</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Typography variant="h4">Admin Chat</Typography>
        <Chip 
          icon={<AdminPanelSettings />} 
          label={`${conversations.length} cuộc hội thoại`} 
          color="primary" 
          variant="outlined"
        />
      </Box>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      <Box sx={{ display: 'flex', gap: 2, height: { xs: 'auto', md: '70vh' }, flexDirection: { xs: 'column', md: 'row' } }}>
        <Paper elevation={2} sx={{ width: { xs: '100%', md: 300 }, mb: { xs: 2, md: 0 }, overflowY: 'auto' }}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="h6">Cuộc hội thoại</Typography>
          </Box>
          <List sx={{ p: 0 }}>
            {conversations.length === 0 ? (
              <ListItem>
                <ListItemText 
                  primary="Chưa có cuộc hội thoại nào"
                  secondary="Chờ khách hàng gửi tin nhắn"
                />
              </ListItem>
            ) : (
              conversations.map((conv) => (
                <Box 
                  key={conv.userId}
                  onClick={() => handleUserSelect(conv.userId)}
                  sx={{ 
                    borderBottom: 1, 
                    borderColor: 'divider',
                    cursor: 'pointer',
                    backgroundColor: selectedUser === conv.userId ? 'action.selected' : 'transparent',
                    '&:hover': {
                      backgroundColor: 'action.hover'
                    }
                  }}
                >
                  <ListItem>
                    <ListItemAvatar>
                      <Badge badgeContent={conv.unreadCount > 0 ? conv.unreadCount : undefined} color="error">
                        <Avatar>
                          <Person />
                        </Avatar>
                      </Badge>
                    </ListItemAvatar>
                    <ListItemText
                      primary={conv.userName}
                      secondary={
                        <>
                          <Typography component="span" variant="body2" sx={{ 
                            display: 'block',
                            fontSize: '0.875rem',
                            lineHeight: 1.43,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {conv.lastMessage}
                          </Typography>
                          <Typography component="span" variant="caption" sx={{ 
                            display: 'block',
                            fontSize: '0.75rem',
                            lineHeight: 1.66,
                            color: 'text.secondary'
                          }}>
                            {formatDate(conv.lastMessageTime)}
                          </Typography>
                        </>
                      }
                    />
                  </ListItem>
                </Box>
              ))
            )}
          </List>
        </Paper>

        <Paper elevation={2} sx={{ flex: 1, width: { xs: '100%', md: 'auto' }, display: 'flex', flexDirection: 'column' }}>
          {selectedUser ? (
            <>
              <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="h6">
                  Chat với {conversations.find(c => c.userId === selectedUser)?.userName}
                </Typography>
              </Box>

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
                      Bắt đầu cuộc trò chuyện!
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
                              <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
                                <Person />
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
                              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                                <AdminPanelSettings />
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
                          <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
                            <Person />
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
            </>
          ) : (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              height: '100%',
              color: 'text.secondary'
            }}>
              <Badge badgeContent={Object.values(unreadCounts).reduce((sum, n) => sum + n, 0) > 0 ? Object.values(unreadCounts).reduce((sum, n) => sum + n, 0) : undefined} color="error">
                <Chat sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
              </Badge>
              <Typography variant="h6" gutterBottom>
                Chọn cuộc hội thoại
              </Typography>
              <Typography variant="body2">
                Chọn một cuộc hội thoại từ danh sách bên trái để bắt đầu chat
              </Typography>
            </Box>
          )}
        </Paper>
      </Box>
    </Container>
  );
} 