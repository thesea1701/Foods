"use client";
import React, { useEffect, useRef } from 'react';
import { useSocket } from '../../hooks/useSocket';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function SocketProvider({ children }: { children: React.ReactNode }) {
  const { socket, isConnected, isAuthenticated, joinUserRoom } = useSocket();
  const orderStatusHandlerRef = useRef<any>(null);

  useEffect(() => {
    if (!socket || !isAuthenticated) return;
    const userData = localStorage.getItem('user');
    if (!userData) return;
    const user = JSON.parse(userData);
    joinUserRoom(user._id);

    const handleOrderStatus = (data: any) => {
      if (user.role !== 'customer') return;
      console.log(`Đơn hàng đã được cập nhật trạng thái: ${data.statusText}`)
      toast.info(`Đơn hàng đã được cập nhật trạng thái: ${data.statusText}`, {
        toastId: `order-status-${data.orderId || data._id || ''}` // Ngăn duplicate toast cho cùng 1 đơn hàng
      });
    };
    orderStatusHandlerRef.current = handleOrderStatus;

    socket.off('order_status'); // Remove ALL previous listeners trước khi đăng ký mới
    socket.on('order_status', handleOrderStatus);

    return () => {
      if (orderStatusHandlerRef.current) {
        socket.off('order_status', orderStatusHandlerRef.current);
      }
    };
  }, [socket, isConnected, isAuthenticated, joinUserRoom]);

  return (
    <>
      {children}
      <ToastContainer position="top-center" autoClose={4000} aria-label="toast-container" />
    </>
  );
} 