// src/pages/LoginPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useIntl } from 'react-intl';
import {
  Paper,
  Typography,
  FormControl,
  FormLabel,
  TextField,
  Button,
  Stack,
  Box,
  InputAdornment,
  Divider
} from '@mui/material';
import { LockOutlined, PersonOutline, Login as LoginIcon } from '@mui/icons-material';
import useAuthStore, { AUTH_ERRORS } from '../stores/auth';
import { useToastStore } from '~/stores/toast';

interface LocationState {
  from?: {
    pathname: string;
  };
}

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LocationState;
  const intl = useIntl();
  
  // Get state from auth store
  const { login, isAuthenticated, isLoading, clearError, isOidcEnabled, loginWithOidc } = useAuthStore();
  const showToast = useToastStore((state) => state.showToast);
  
  // Get the return URL from location state or default to home
  const from = locationState?.from?.pathname || "/";
  
  // Check if OIDC is enabled
  const oidcEnabled = isOidcEnabled();
  
  // If already authenticated, redirect to the return URL
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from, intl, showToast]);
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    
    // Basic validation
    if (!username.trim() || !password.trim()) {
      showToast(intl.formatMessage({ id: 'login.error.validation' }), 'warning');
      return;
    }
    
    // Try to login
    const success = await login(username, password);

    if (success) {
      console.log("Login successful, redirecting...");
    } else {
      // Login failed, get the error from the auth store
      const loginError = useAuthStore.getState().error; 
      
      // Check for specific error messages to translate
      const errorMessageId = loginError === AUTH_ERRORS.UNAUTHORIZED 
        ? 'login.error.unauthorized' 
        : 'login.error.generic';
      
      // Show translated error message
      showToast(intl.formatMessage({ id: errorMessageId }), 'error');
    }
  };

  // Handle OIDC login
  const handleOidcLogin = async () => {
    try {
      await loginWithOidc();
    } catch (error) {
      console.error('Failed to initiate OIDC login', error);
      showToast(intl.formatMessage({ id: 'login.error.oidc.initiate' }), 'error');
    }
  };
  
  return (
    <Box display="flex" justifyContent="center" alignItems="center" width="100%" height="80vh">
      <Paper elevation={3} sx={{ width: 400, maxWidth: '90%', p: 4 }}>
        <Typography variant="h5" component="h1" align="center" gutterBottom>
          {intl.formatMessage({ id: 'login.title' })}
        </Typography>
        
        <form onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <FormControl>
              <FormLabel htmlFor="username">
                {intl.formatMessage({ id: 'login.usernameLabel' })}
              </FormLabel>
              <TextField
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={intl.formatMessage({ id: 'login.usernamePlaceholder' })}
                fullWidth                
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonOutline />
                      </InputAdornment>
                    ),
                  },
                  htmlInput: {
                    'data-testid': 'username-input',
                  },
                }}
                autoFocus
              />
            </FormControl>
            
            <FormControl>
              <FormLabel htmlFor="password">
                {intl.formatMessage({ id: 'login.passwordLabel' })}
              </FormLabel>
              <TextField
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={intl.formatMessage({ id: 'login.passwordPlaceholder' })}
                fullWidth                
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockOutlined />
                      </InputAdornment>
                    ),
                  },
                  htmlInput: {
                    'data-testid': 'password-input',
                  },
                }}
              />
            </FormControl>
            
            <Button
              type="submit"
              variant="contained"
              disabled={isLoading}
              fullWidth
              data-testid="login-button"
            >
              {isLoading 
                ? intl.formatMessage({ id: 'login.loggingIn' })
                : intl.formatMessage({ id: 'login.submitButton' })
              }
            </Button>
            
            {oidcEnabled && (
              <>
                <Divider>
                  {intl.formatMessage({ id: 'login.or' })}
                </Divider>
                
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<LoginIcon />}
                  onClick={handleOidcLogin}
                  disabled={isLoading}
                >
                  {intl.formatMessage({ id: 'login.oidcButton' })}
                </Button>
              </>
            )}
          </Stack>
        </form>
      </Paper>
    </Box>
  );
};

export default LoginPage;