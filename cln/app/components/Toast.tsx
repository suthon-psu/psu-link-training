import React, { useEffect } from 'react';
import { useToastStore } from '../stores/toast';
import type { ToastSeverity, ToastPosition } from '../stores/toast';
import { Box, Typography } from '@mui/material';
import CheckCircleOutline from '@mui/icons-material/CheckCircleOutline';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import WarningAmberOutlined from '@mui/icons-material/WarningAmberOutlined';
import ErrorOutline from '@mui/icons-material/ErrorOutline';
import type { SxProps, Theme } from '@mui/material/styles';

const Toast: React.FC = () => {
  const { open, message, severity, position, hideToast } = useToastStore();

  useEffect(() => {
    let timerId: NodeJS.Timeout | undefined;
    if (open) {
        // Optional: Auto-hide after a delay if store doesn't handle it
        // timerId = setTimeout(hideToast, 5000); 
    }
    return () => {
      if (timerId) clearTimeout(timerId);
      // Consider if hideToast needs calling on unmount regardless of timer
      // hideToast();
    };
  }, [open, hideToast]);

  if (!open || !severity) return null;

  const getIcon = () => {
    switch (severity) {
      case 'success':
        return <CheckCircleOutline sx={{ color: 'white', fontSize: 20 }} />;
      case 'info':
        return <InfoOutlined sx={{ color: 'white', fontSize: 20 }} />;
      case 'warning':
        return <WarningAmberOutlined sx={{ color: 'white', fontSize: 20 }} />;
      case 'error':
        return <ErrorOutline sx={{ color: 'white', fontSize: 20 }} />;
      default:
        return null;
    }
  };

  const bgColor: Record<ToastSeverity, string> = {
    success: '#4caf50',
    info: '#2196f3',
    warning: '#ff9800',
    error: '#f44336'
  };

  const getPositionStyles = (pos: ToastPosition): SxProps<Theme> => {
    const baseStyles: SxProps<Theme> = {
        position: 'fixed',
        zIndex: (theme) => theme.zIndex.snackbar, 
        padding: (theme) => theme.spacing(1, 2), 
        borderRadius: (theme) => theme.shape.borderRadius, 
        boxShadow: (theme) => theme.shadows[3], 
        color: 'white',
        minWidth: '250px',
        maxWidth: '80%',
        display: 'flex',
        alignItems: 'center',
        cursor: 'pointer'
    };
    
    switch (pos) {
        case 'top-left':
            return { ...baseStyles, top: 20, left: 20 };
        case 'top-center':
            return { ...baseStyles, top: 20, left: '50%', transform: 'translateX(-50%)' };
        case 'top-right':
            return { ...baseStyles, top: 20, right: 20 };
        case 'bottom-left':
            return { ...baseStyles, bottom: 20, left: 20 };
        case 'bottom-center':
            return { ...baseStyles, bottom: 20, left: '50%', transform: 'translateX(-50%)' };
        case 'bottom-right':
        default:
            return { ...baseStyles, bottom: 20, right: 20 };
    }
  };

  return (
    <Box
      sx={{
        ...getPositionStyles(position), 
        backgroundColor: bgColor[severity], 
      }}
      onClick={hideToast}
    >
      <Box sx={{ mr: 1.5, display: 'flex', alignItems: 'center' }}>
        {getIcon()}
      </Box>
      <Typography variant="body2" fontWeight="bold">
        {message}
      </Typography>
    </Box>
  );
};

export default Toast; 