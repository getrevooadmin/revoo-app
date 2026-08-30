"use client";

import React from 'react';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';

interface ToastProps {
  notification: { message: string; type: 'success' | 'error' } | null;
}

export default function ToastNotification({ notification }: ToastProps) {
  if (!notification) return null;

  return (
    <div className={`fixed top-4 right-4 z-[9999] flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border transition-all duration-300 animate-in fade-in slide-in-from-top-2 ${
      notification.type === 'success' 
        ? 'bg-[#f0f7f4] border-[#b2dbcd] text-[#153e35] font-semibold' 
        : 'bg-red-50 border-red-200 text-red-800 font-semibold'
    }`}>
      {notification.type === 'success' ? (
        <CheckCircleIcon fontSize="small" className="text-[#153e35]" />
      ) : (
        <WarningIcon fontSize="small" className="text-red-600" />
      )}
      <span className="text-sm font-bold">{notification.message}</span>
    </div>
  );
}
