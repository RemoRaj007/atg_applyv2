import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AtgAuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import AppRoutes from './routes/atg_index';
import { Toaster } from 'react-hot-toast';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster 
            position="top-right" 
            toastOptions={{
              duration: 4000,
              style: {
                background: '#0f172a',
                color: '#f8fafc',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '1rem',
                padding: '12px 18px',
                fontSize: '13px',
                fontWeight: '600',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
                backdropFilter: 'blur(12px)',
              },
              success: {
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#0f172a',
                },
                style: {
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                },
              },
              error: {
                iconTheme: {
                  primary: '#f43f5e',
                  secondary: '#0f172a',
                },
                style: {
                  border: '1px solid rgba(244, 63, 94, 0.3)',
                },
              },
            }}
          />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
