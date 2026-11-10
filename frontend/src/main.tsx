import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from './theme/theme';
import { AuthProvider } from './auth/AuthContext';
import { ToastProvider } from './components/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import App from './App';

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 15_000, retry: 2 } } });

ReactDOM.createRoot(document.getElementById('root')!).render(
  //this finds the element with id root and then mounts react in it
  <React.StrictMode>{/* React.StrictMode caatches common bugs and creates warnings in deprracted method */}
    <ErrorBoundary>
      <ThemeProvider theme={theme}> {/*fixed theme in this  */}
        <CssBaseline/>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <BrowserRouter>
              <AuthProvider>
                <App />
              </AuthProvider>
            </BrowserRouter>
          </ToastProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
