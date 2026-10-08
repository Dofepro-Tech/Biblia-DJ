// Clave API para Gemini (rellena con tu clave real o usa variable de entorno)
export const GEMINI_API_KEY = '';
function sanitizeBaseUrl(value: string) {
  return value.replace(/\/+$/, '');
}

const DEFAULT_PUBLIC_API_BASE_URL = 'https://biblia-ng.onrender.com';

export function getConfiguredApiBaseUrl() {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  // Only use fallback if not using same-origin API
  const fallbackBaseUrl = shouldUseSameOriginApi() ? undefined : (import.meta.env.PROD ? DEFAULT_PUBLIC_API_BASE_URL : undefined);
  const resolvedBaseUrl = configuredBaseUrl || fallbackBaseUrl;
  return resolvedBaseUrl ? sanitizeBaseUrl(resolvedBaseUrl) : undefined;
}

export function shouldUseSameOriginApi() {
  if (import.meta.env.VITE_USE_SAME_ORIGIN_API !== 'true') {
    return false;
  }

  if (typeof window === 'undefined') {
    return true;
  }

  const protocol = window.location.protocol.trim().toLowerCase();
  return protocol === 'http:' || protocol === 'https:';
}

export function canUseLocalProxyApi() {
  if (!import.meta.env.DEV || typeof window === 'undefined') {
    return false;
  }

  const hostname = window.location.hostname.trim().toLowerCase();
  // Accept localhost, 127.0.0.1, and local IP addresses (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
  return hostname === 'localhost' ||
         hostname === '127.0.0.1' ||
         /^192\.168\.\d+\.\d+$/.test(hostname) ||
         /^10\.\d+\.\d+\.\d+$/.test(hostname) ||
         /^172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+$/.test(hostname);
}

export function canUseConfiguredApi() {
  return Boolean(getConfiguredApiBaseUrl()) || shouldUseSameOriginApi() || canUseLocalProxyApi();
}

export function resolveConfiguredApiUrl(path: string) {
  const configuredBaseUrl = getConfiguredApiBaseUrl();
  return configuredBaseUrl ? `${configuredBaseUrl}${path}` : path;
}