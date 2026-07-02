import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';
import { setOnAuthFailure, setOnTokensRefreshed } from './lib/api';
import { useAuthStore } from './stores/auth.store';
import { usePlatformAuthStore } from './stores/platform-auth.store';

setOnTokensRefreshed(({ accessToken, refreshToken }) => {
  if (useAuthStore.getState().isImpersonating()) {
    useAuthStore.getState().applyTokens(accessToken, refreshToken);
    return;
  }
  if (usePlatformAuthStore.getState().isAuthenticated()) {
    usePlatformAuthStore.getState().applyTokens(accessToken, refreshToken);
    return;
  }
  useAuthStore.getState().applyTokens(accessToken, refreshToken);
});

setOnAuthFailure(() => {
  if (useAuthStore.getState().isImpersonating()) {
    useAuthStore.getState().exitImpersonation();
    return;
  }
  if (usePlatformAuthStore.getState().isAuthenticated()) {
    usePlatformAuthStore.getState().logout();
  } else {
    useAuthStore.getState().logout();
  }
});

createRoot(document.getElementById('root')!).render(  <StrictMode>
    <App />
  </StrictMode>
);
