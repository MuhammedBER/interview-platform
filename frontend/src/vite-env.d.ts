/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GATEWAY_URL?: string;
  readonly VITE_KEYCLOAK_URL?: string;
  readonly VITE_ZEGO_APP_ID?: string;
  readonly VITE_ZEGO_SERVER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
