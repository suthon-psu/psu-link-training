export const isProd = import.meta.env.PROD;

// Get the current environment mode
export const mode = import.meta.env.MODE;

// Export other common environment variables as needed
export const baseUrl = import.meta.env.BASE_URL || '/';

// Helper to safely get window location origin
const getOrigin = () => {
    if (typeof window !== 'undefined') {
        return window.location.origin;
    }
    return baseUrl; // Fallback for SSR
};


export const appConfig = {
    apiUrl: import.meta.env.VITE_API_URL,
    oidcAuth: {
        enabled: true,
        config: {
            authority: import.meta.env.VITE_OIDC_AUTHORITY || '',
            client_id: import.meta.env.VITE_OIDC_CLIENT_ID || '',
            redirect_uri: `${getOrigin()}/auth/callback`,
            post_logout_redirect_uri: getOrigin(),
        }
    }
}