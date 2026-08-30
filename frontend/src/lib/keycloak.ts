import Keycloak from 'keycloak-js';

const DEFAULT_KEYCLOAK_URL = 'http://localhost:8180';

export const keycloak = new Keycloak({
  url: (import.meta.env.VITE_KEYCLOAK_URL as string | undefined) || DEFAULT_KEYCLOAK_URL,
  realm: 'interview-platform',
  clientId: 'interview-web',
});

let initPromise: Promise<void> | null = null;

export function initKeycloak(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      // onLoad 'check-sso' instead of 'login-required': the app has public
      // content now — an unauthenticated candidate route (/join/:token) must
      // render without being redirected to the recruiter login page — so the
      // init call silently detects an existing session instead of forcing one.
      await keycloak.init({
        onLoad: 'check-sso',
        pkceMethod: 'S256',
        checkLoginIframe: false,
      });

      keycloak.onTokenExpired = () => {
        void updateToken();
      };
    })();
  }
  return initPromise;
}

export function getToken(): string | undefined {
  return keycloak.token;
}

export async function updateToken(): Promise<string | undefined> {
  await keycloak.updateToken(30);
  return keycloak.token;
}

export function logout(): void {
  void keycloak.logout({ redirectUri: window.location.origin });
}
