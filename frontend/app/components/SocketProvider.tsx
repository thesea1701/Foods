"use client";
import React, { useEffect } from 'react';
import { useSocket } from '../../hooks/useSocket';

export default function SocketProvider({ children }: { children: React.ReactNode }) {
  const { socket, isConnected, isAuthenticated, joinUserRoom } = useSocket();

  return <>{children}</>;
} 