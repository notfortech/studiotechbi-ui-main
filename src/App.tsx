import { BrowserRouter, useRoutes } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { AuthProvider } from './auth/AuthContext';
import { routes } from './core/routes';

const theme = createTheme({
  palette: {
    primary: {
      // Royal purple
      main: '#6D28D9',
      dark: '#5B21B6',
      light: '#8B5CF6',
    },
    secondary: {
      // Warm yellow / amber
      main: '#F59E0B',
      dark: '#D97706',
      light: '#FBBF24',
    },
    background: {
      default: '#f5f7fa',
    },
    text: {
      // Softer than pure black for a modern feel.
      primary: '#111827', // slate-900
      secondary: '#475569', // slate-600
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 10,
        },
      },
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 8,
  },
});

function AppRoutes() {
  return useRoutes(routes);
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
