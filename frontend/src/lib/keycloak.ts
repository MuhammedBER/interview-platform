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
      // onLoad 'login-required' instead of 'check-sso': this cockpit has no
      // public content — every screen requires an authenticated recruiter —
      // so an unauthenticated visitor must be redirected straight to the
      // Keycloak login page rather than rendering an anonymous shell that
      // would only fail with 401s on its first API call.
      await keycloak.init({
        onLoad: 'login-required',
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
