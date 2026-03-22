import { useState, FormEvent } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Container,
  InputAdornment,
  IconButton,
  Tabs,
  Tab,
} from '@mui/material';
import { Visibility, VisibilityOff, Business } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { APP_NAME, ROUTES } from '../core/constants';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`login-tabpanel-${index}`}
      aria-labelledby={`login-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export const LoginPage = () => {
  const [tabValue, setTabValue] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setEmail('');
    setPassword('');
    setError('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!email || !password) {
        throw new Error('Please enter both email and password');
      }

      const role = tabValue === 0 ? ('client' as const) : ('accountant' as const);
      await login(email, password, role);

      const redirectPath = role === 'client' ? ROUTES.CLIENT.DASHBOARD : ROUTES.ACCOUNTANT.DASHBOARD;
      navigate(redirectPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
      }}
    >
      <Container maxWidth="sm">
        <Card
          elevation={12}
          sx={{
            borderRadius: 3,
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
              p: 4,
              textAlign: 'center',
              color: 'white',
            }}
          >
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2,
              }}
            >
              <Business sx={{ fontSize: 32 }} />
            </Box>
            <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
              {APP_NAME}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              Your Trusted Reporting Partner
            </Typography>
          </Box>

          <CardContent sx={{ p: 4 }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              aria-label="Login type"
              sx={{
                mb: 3,
                borderBottom: 1,
                borderColor: 'divider',
                '& .MuiTabs-indicator': {
                  height: 3,
                },
              }}
            >
              <Tab
                label="Customer"
                id="login-tab-0"
                aria-controls="login-tabpanel-0"
                sx={{
                  textTransform: 'none',
                  fontSize: '1rem',
                  fontWeight: 600,
                }}
              />
              <Tab
                label="Accountant"
                id="login-tab-1"
                aria-controls="login-tabpanel-1"
                sx={{
                  textTransform: 'none',
                  fontSize: '1rem',
                  fontWeight: 600,
                }}
              />
            </Tabs>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <TabPanel value={tabValue} index={0}>
              <Box component="form" onSubmit={handleSubmit}>
                <TextField
                  fullWidth
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  margin="normal"
                  autoComplete="email"
                  autoFocus
                  required
                  disabled={loading}
                />

                <TextField
                  fullWidth
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  margin="normal"
                  autoComplete="current-password"
                  required
                  disabled={loading}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          disabled={loading}
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={loading}
                  sx={{
                    mt: 3,
                    py: 1.5,
                    textTransform: 'none',
                    fontSize: '1rem',
                    fontWeight: 600,
                  }}
                >
                  {loading ? 'Signing in...' : 'Sign In as Customer'}
                </Button>
              </Box>
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              <Box component="form" onSubmit={handleSubmit}>
                <TextField
                  fullWidth
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  margin="normal"
                  autoComplete="email"
                  autoFocus
                  required
                  disabled={loading}
                />

                <TextField
                  fullWidth
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  margin="normal"
                  autoComplete="current-password"
                  required
                  disabled={loading}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          disabled={loading}
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={loading}
                  sx={{
                    mt: 3,
                    py: 1.5,
                    textTransform: 'none',
                    fontSize: '1rem',
                    fontWeight: 600,
                  }}
                >
                  {loading ? 'Signing in...' : 'Sign In as Accountant'}
                </Button>
              </Box>
            </TabPanel>

            <Box sx={{ textAlign: 'center', mt: 3 }}>
              <Typography variant="body2" color="text.secondary">
                Sign in with your registered email and password
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};
