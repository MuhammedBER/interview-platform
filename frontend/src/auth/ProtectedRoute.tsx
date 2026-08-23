import type { PropsWithChildren } from 'react';
import { keycloak } from '../lib/keycloak';

export default function ProtectedRoute({ children }: PropsWithChildren) {
  if (keycloak.authenticated) {
    return <>{children}</>;
  }

  void keycloak.login();
  return null;
}
