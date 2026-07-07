import { BrowserRouter, useRoutes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { AuthProvider } from './auth/AuthContext';
import { routes } from './core/routes';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: (failureCount, error) => {
        const status = (error as { response?: { status?: number } })?.response?.status;
        if (status != null && status >= 400 && status < 500) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
  },
});

const theme = createTheme({
  palette: {
    primary: {
      main:  '#4F46E5', // vibrant indigo
      dark:  '#3730A3', // deep indigo — navbars, dark surfaces
      light: '#818CF8', // soft indigo highlight
    },
    secondary: {
      main:  '#0D9488', // vivid teal
      dark:  '#115E59', // deep teal
      light: '#5EEAD4', // bright teal highlight
    },
    background: {
      default: '#F8FAFC', // cool slate-white
      paper:   '#FFFFFF',
    },
    text: {
      primary:   '#0F172A', // near-black slate
      secondary: '#475569', // slate grey
    },
    divider: '#E2E8F0',
    success: { main: '#16A34A' },
    warning: { main: '#F59E0B' },
    error:   { main: '#DC2626' },
    info:    { main: '#0EA5E9' },
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
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
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
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
