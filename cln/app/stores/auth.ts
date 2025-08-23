// src/stores/authStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import axios from 'axios';
import type { AxiosInstance, AxiosError } from 'axios';
import { UserManager, User as OidcUser, WebStorageStateStore, Log } from 'oidc-client-ts';
import type { UserManagerSettings } from 'oidc-client-ts';
import { appConfig } from '~/config';

// API Configuration
export const API_URL = import.meta.env.VITE_API_URL;

// Auth Service Interface Types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
}

export interface User {
  id: string;
  username: string;
  email?: string;
  webAllowed?: boolean;
  isAdmin?: boolean;
}

export interface OidcVerifyTokenResponse {
  access_token: string;
  refresh_token: string;
}

// Helper to safely get window location origin
const getOrigin = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'http://localhost:5173'; // Fallback for SSR
};

// Disable debug logging in production
if (typeof window !== 'undefined' && import.meta.env.PROD) {
  Log.setLogger(console);
  Log.setLevel(Log.ERROR);
} else if (typeof window !== 'undefined') {
  // Enable detailed logging in development
  Log.setLogger(console);
  Log.setLevel(Log.INFO);
}

// Cache for OIDC metadata
let cachedMetadata: any = null;

// OIDC Configuration with metadata caching - now lazy
let oidcConfig: UserManagerSettings | null = null;

const getOidcConfig = (): UserManagerSettings => {
  if (!oidcConfig) {
    oidcConfig = {
      ...appConfig.oidcAuth.config,
      response_type: 'code',
      scope: 'openid profile email offline_access',
      automaticSilentRenew: true,
      silent_redirect_uri: `${getOrigin()}/silent-renew.html`,
      userStore: typeof window !== 'undefined' ? new WebStorageStateStore({ store: window.localStorage }) : undefined,
      metadataUrl: appConfig.oidcAuth.config.authority ? `${appConfig.oidcAuth.config.authority}/.well-known/openid-configuration` : undefined,
      loadUserInfo: false,
      monitorSession: false,
      // Add these to handle token validation issues
      validateSubOnSilentRenew: false,    
      filterProtocolClaims: false,
      response_mode: 'query'
    };
  }
  return oidcConfig;
};

// Create OIDC user manager only if enabled in config
let userManager: UserManager | null = null;

// Lazy initialization to prevent unnecessary configuration calls
const getUserManager = (): UserManager | null => {
  // Early return if running on server
  if (typeof window === 'undefined') {
    return null;
  }
  
  if (!appConfig.oidcAuth.enabled) {
    return null;
  }
  
  if (!userManager) {
    const config = getOidcConfig();
    userManager = new UserManager(config);
    
    // Add event listeners for debugging
    if (!import.meta.env.PROD) {
      userManager.events.addUserLoaded(() => {
        console.log('User loaded event');
      });
      userManager.events.addSilentRenewError((error) => {
        console.error('Silent renew error', error);
      });
      userManager.events.addUserSignedOut(() => {
        console.log('User signed out event');
      });
    }
    
    // Use cached metadata if available
    if (cachedMetadata && userManager.metadataService) {
      const metadataService = userManager.metadataService;
      metadataService.getMetadata = async () => {
        return cachedMetadata;
      };
    }
    
    // Cache metadata after first fetch
    if (userManager.metadataService) {
      const metadataService = userManager.metadataService;
      const originalGetMetadata = metadataService.getMetadata;
      metadataService.getMetadata = async () => {
        if (!cachedMetadata) {
          cachedMetadata = await originalGetMetadata.call(metadataService);
        }
        return cachedMetadata;
      };
    }
  }
  
  return userManager;
};

// Processing flag to prevent duplicate calls
let isProcessingCallback = false;

// Error constants
export const AUTH_ERRORS = {
  UNAUTHORIZED: 'Unauthorized',
  LOGIN_FAILED: 'LoginFailed'
};

// Create API client factory
const createApiClient = (onAuthFailed: () => void): AxiosInstance => {
  const client = axios.create({
    baseURL: API_URL,
    headers: {
      'Content-Type': 'application/json',
    },
    withCredentials: true, // Enable cookies
  });

  // Add interceptor for handling auth failures
  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      if (!error.config) {
        return Promise.reject(error);
      }

      const originalRequest = error.config;

      // If error is 401 and we haven't tried refreshing yet
      if (error.response?.status === 401 && !(originalRequest as any)._retry) {
        (originalRequest as any)._retry = true;

        try {
          // Try to refresh the token using cookies
          await axios.post(`${API_URL}/auth/refresh`, {}, {
            withCredentials: true
          });

          // Retry the original request
          return client(originalRequest);
        } catch (refreshError) {
          // If refresh failed, handle auth failure
          onAuthFailed();
          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(error);
    }
  );

  return client;
};

// Define types
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  loadUserProfile: () => Promise<User | null>;
  getProfile: () => Promise<User | null>;
  logout: () => Promise<void>;
  clearError: () => void;
  // OIDC methods
  isOidcEnabled: () => boolean;
  loginWithOidc: () => Promise<void>;
  handleOidcCallback: () => Promise<{
    user: OidcUser;
    access_token: string;
    refresh_token?: string;
  }>;
  setTokens: (accessToken: string, refreshToken: string) => void;
}

// Create auth store with Zustand
const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => {
      // Create API client with auth failure handler
      const api = createApiClient(() => {
        console.log('Authentication failed');
        get().logout().catch(console.error);
      });

      return {
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        
        // Login action
        login: async (username: string, password: string) => {
          set({ isLoading: true, error: null });
          
          try {
            // First authenticate (tokens will be set as cookies by server)
            await api.post<LoginResponse>('/auth/login', { username, password });
            
            // Load user profile to verify authentication
            const user = await get().loadUserProfile();
            
            // Check if the user has web access
            if (!user || user.webAllowed === false) {
              // User doesn't have web access permission
              set({
                isAuthenticated: false,
                isLoading: false,
                error: AUTH_ERRORS.UNAUTHORIZED,
                user: null
              });
              return false;
            }
            
            // User has web access, complete login
            set({
              isAuthenticated: true,
              isLoading: false,
              error: null
            });
            
            return true;
          } catch (error: any) {
            set({
              isLoading: false,
              error: error.response?.data?.message || AUTH_ERRORS.LOGIN_FAILED,
              isAuthenticated: false,
            });
            return false;
          }
        },
      
        // Load user profile
        loadUserProfile: async () => {
          try {          
            const response = await api.get('/auth/me/info');
            const user = response.data.data;
            set({ user });
            return user;
          } catch (error) {
            console.error('Failed to load user profile', error);
            return null;
          }
        },
      
        // Get user profile and verify authentication
        getProfile: async () => {
          try {
            const response = await api.get('/auth/me/info');
            const user = response.data.data;
            
            if (user) {
              set({ 
                isAuthenticated: true, 
                user,
                error: null
              });
              return user;
            } else {
              set({ 
                isAuthenticated: false, 
                user: null
              });
              return null;
            }
          } catch (error) {
            console.error('Get profile failed', error);
            set({ 
              isAuthenticated: false, 
              user: null
            });
            return null;
          }
        },
      
        // Logout action
        logout: async () => {
          try {
            // Call server logout to clear cookies
            await api.post('/auth/logout', {});
          } catch (error) {
            console.error('Server logout failed, but continuing with client logout', error);
          }
          
          set({
            user: null,
            isAuthenticated: false,
            error: null
          });
          
          // Clear any potential redirect data from sessionStorage
          // This prevents the router from trying to redirect to protected routes
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('router-last-location');
            sessionStorage.removeItem('auth-storage');
          }
        },
        
        // Clear error
        clearError: () => set({ error: null }),
        
        // OIDC methods
        isOidcEnabled: () => {
          return appConfig.oidcAuth.enabled && typeof window !== 'undefined';
        },
        
        loginWithOidc: async () => {
          const manager = getUserManager();
          if (!manager) {
            throw new Error('OIDC authentication is not enabled');
          }
          await manager.signinRedirect();
        },
        
        handleOidcCallback: async () => {
          const manager = getUserManager();
          if (!manager) {
            throw new Error('OIDC authentication is not enabled');
          }
          
          // Prevent duplicate processing
          if (isProcessingCallback) {
            throw new Error('OIDC callback is already being processed');
          }
          
          isProcessingCallback = true;
          
          try {
            // Extract token from URL manually if needed
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');
            const state = urlParams.get('state');
            
            if (!code || !state) {
              throw new Error('Invalid authorization response. Missing code or state parameter.');
            }
            
            let user: OidcUser;
            
            try {
              // Try the standard callback processing
              user = await manager.signinRedirectCallback();                
            } catch (tokenError: any) {
              console.error('Token validation error:', tokenError);
              
              // If the error is related to invalid JWT format, try to get tokens in a different way
              if (tokenError.message && tokenError.message.includes('Invalid token')) {
                // Default scope value
                const defaultScope = 'openid profile email';
                
                // Create minimal user object with the code
                user = {
                  id_token: '',
                  access_token: code, // Temporarily use code as access token
                  token_type: 'Bearer',
                  scope: defaultScope,
                  profile: {},
                  expires_at: 0,
                  state: state
                } as OidcUser;
                
                console.log('Created fallback user object due to token validation issues');
              } else {
                // Re-throw other errors
                throw tokenError;
              }
            }
            
            // For fallback scenario, modify request to include the authorization code
            const requestParams: Record<string, string> = {
              access_token: user.access_token
            };
            
            if (user.id_token) {
              requestParams.id_token = user.id_token;
            }
            
            // If this is the fallback flow, add the code parameter
            if (!user.id_token && code) {
              requestParams.code = code;
              requestParams.state = state || '';
            }
            
            // Verify the OIDC token or code with our application server
            const { data } = await api.post<OidcVerifyTokenResponse>(
              '/auth/openid/verify-token', 
              requestParams
            );
            
            // Add additional data to help debug
            console.log('OIDC flow completed, received application tokens');
            
            return {
              user,
              access_token: data.access_token,
              refresh_token: data.refresh_token,
            };
          } catch (error) {
            console.error('OIDC callback error:', error);
            throw error;
          } finally {
            // Reset processing flag
            isProcessingCallback = false;
          }
        },
        
        // Set tokens manually (for OIDC callback compatibility)
        setTokens: (accessToken: string, refreshToken: string) => {
          // Since we're using cookies, this method doesn't need to store tokens
          // but we'll keep it for backward compatibility with OIDC callback
          set({
            isAuthenticated: true
          });
        }
      };
    },
    {
      name: 'auth-storage',
      version: 1,
      storage: createJSONStorage(() => {
        // Use localStorage for better UX (persists across browser sessions)
        // Fall back to sessionStorage in SSR or if localStorage is not available
        if (typeof window === 'undefined') {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {}
          };
        }
        
        try {
          // Test if localStorage is available and working
          localStorage.setItem('__test', 'test');
          localStorage.removeItem('__test');
          return localStorage;
        } catch {
          // Fall back to sessionStorage if localStorage is blocked
          return sessionStorage;
        }
      }),
      // Only persist essential auth state, exclude loading states and errors
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated
        // Exclude: isLoading, error (should not persist across sessions)
      }),
      // Skip hydration on server side
      skipHydration: typeof window === 'undefined'
    }
  )
);

// Export as window property for debugging
if (typeof window !== 'undefined' && import.meta.env.MODE === 'development') {
  (window as any).authStore = useAuthStore;
}

export default useAuthStore;