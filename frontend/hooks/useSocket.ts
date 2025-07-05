import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  isAuthenticated: boolean;
  connect: () => void;
  disconnect: () => void;
  joinAdminChat: () => void;
  joinCustomerChat: (customerId: string) => void;
  joinOrderChat: (orderId: string) => void;
  leaveOrderChat: (orderId: string) => void;
  joinAdminRoom: () => void;
  joinUserRoom: (userId: string) => void;
  sendTypingStart: (data: { receiverId?: string; orderId?: string }) => void;
  sendTypingStop: (data: { receiverId?: string; orderId?: string }) => void;
}

interface AuthenticatedData {
  success: boolean;
  error?: string;
}

export const useSocket = (): UseSocketReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const connect = () => {
    if (socketRef.current?.connected) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const socket = io(apiUrl, {
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      setIsConnected(true);
      
      socket.emit('authenticate', token);
    });

    socket.on('authenticated', (data: AuthenticatedData) => {
      if (data.success) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      setIsAuthenticated(false);
    });

    socket.on('connect_error', (error: Error) => {
      setIsConnected(false);
      setIsAuthenticated(false);
    });

    socketRef.current = socket;
  };

  const disconnect = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      setIsAuthenticated(false);
    }
  };

  const joinAdminChat = () => {
    if (socketRef.current?.connected && isAuthenticated) {
      socketRef.current.emit('join_admin_chat');
    }
  };

  const joinCustomerChat = (customerId: string) => {
    if (socketRef.current?.connected && isAuthenticated) {
      socketRef.current.emit('join_customer_chat', customerId);
    }
  };

  const joinOrderChat = (orderId: string) => {
    if (socketRef.current?.connected && isAuthenticated) {
      socketRef.current.emit('join_order', orderId);
    }
  };

  const leaveOrderChat = (orderId: string) => {
    if (socketRef.current?.connected && isAuthenticated) {
      socketRef.current.emit('leave_order', orderId);
    }
  };

  const joinAdminRoom = () => {
    if (socketRef.current?.connected && isAuthenticated) {
      socketRef.current.emit('join_admin_room');
    }
  };

  const joinUserRoom = (userId: string) => {
    if (socketRef.current?.connected && isAuthenticated) {
      socketRef.current.emit('join_user_room', userId);
    }
  };

  const sendTypingStart = (data: { receiverId?: string; orderId?: string }) => {
    if (socketRef.current?.connected && isAuthenticated) {
      socketRef.current.emit('typing_start', data);
    }
  };

  const sendTypingStop = (data: { receiverId?: string; orderId?: string }) => {
    if (socketRef.current?.connected && isAuthenticated) {
      socketRef.current.emit('typing_stop', data);
    }
  };

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    isAuthenticated,
    connect,
    disconnect,
    joinAdminChat,
    joinCustomerChat,
    joinOrderChat,
    leaveOrderChat,
    joinAdminRoom,
    joinUserRoom,
    sendTypingStart,
    sendTypingStop
  };
}; 