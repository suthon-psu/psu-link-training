import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { CircularProgress, Box, Typography, Button } from '@mui/material';
import { useIntl } from 'react-intl';
import useAuthStore from '../stores/auth';
import { useToastStore } from '~/stores/toast';

const OidcCallbackPage: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(true);
  const processedRef = useRef<boolean>(false);
  const navigate = useNavigate();
  const intl = useIntl();
  const { setTokens, handleOidcCallback, loadUserProfile } = useAuthStore();
  const showToast = useToastStore((state) => state.showToast);
  const [searchParams] = useSearchParams();
  
  useEffect(() => {
    // Prevent duplicate processing
    if (processedRef.current) {
      return;
    }
    
    const processCallback = async () => {
      // Skip if no code parameter in URL
      if (!searchParams.get('code')) {
        setError(intl.formatMessage({ id: 'login.error.oidc.nocode' }));
        setIsProcessing(false);
        return;
      }

      try {
        // Mark as processing to prevent duplicate calls
        processedRef.current = true;
                
        // Process the OIDC callback
        const { access_token, refresh_token } = await handleOidcCallback();
        
        if (!access_token) {
          setError(intl.formatMessage({ id: 'login.error.oidc.notoken' }));
          setIsProcessing(false);
          return;
        }
        
        // Set tokens in auth store
        if (refresh_token) {
          setTokens(access_token, refresh_token);
        } else {
          // If no refresh token, just set the access token
          setTokens(access_token, '');
        }
        
        // Load user profile
        await loadUserProfile();
        
        // Show success message
        showToast(intl.formatMessage({ id: 'login.success.oidc' }), 'success');
        
        // Clear the URL parameters to prevent re-processing
        // Use replace:true to prevent browser back button from returning to callback page
        navigate('/', { replace: true });
      } catch (err) {
        console.error('OIDC callback error:', err);
        setError(intl.formatMessage({ id: 'login.error.oidc.callback' }));
        showToast(intl.formatMessage({ id: 'login.error.oidc.callback' }), 'error');
        setIsProcessing(false);
        // Mark as not processed so user can try again
        processedRef.current = false;
      }
    };
    
    processCallback();
    
    // Cleanup function to ensure we don't process after unmount
    return () => {
      processedRef.current = true;
    };
  }, [navigate, setTokens, handleOidcCallback, loadUserProfile, intl, showToast, searchParams]);

  // Handle redirect back to login
  const handleBackToLogin = () => {
    navigate('/login', { replace: true });
  };
  
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        gap: 2
      }}
    >
      {error ? (
        <>
          <Typography color="error" variant="h6" align="center">
            {error}
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={handleBackToLogin}
            sx={{ mt: 2 }}
          >
            {intl.formatMessage({ id: 'login.backToLogin' })}
          </Button>
        </>
      ) : (
        <>
          <CircularProgress size={40} />
          <Typography variant="body1" align="center">
            {intl.formatMessage({ id: 'login.oidc.processing' })}
          </Typography>
        </>
      )}
    </Box>
  );
};

export default OidcCallbackPage; 