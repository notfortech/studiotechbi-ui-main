import { Box, Card, CardContent, TextField, Button, Typography, Alert, Container } from '@mui/material';
import { useState, FormEvent } from 'react';
import { ROUTES } from '../../core/constants';
import { adminLogin } from '../../services/adminAuthService';

export const AdminLoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await adminLogin(email, password);
      window.location.href = ROUTES.ADMIN.DASHBOARD;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ py: 8, minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
        <Card sx={{ width: '100%' }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h5" fontWeight={600} gutterBottom>
              Admin Login
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Sign in to the admin portal
            </Typography>
            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                margin="normal"
                autoComplete="email"
              />
              <TextField
                fullWidth
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                margin="normal"
                autoComplete="current-password"
              />
              {error && (
                <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError('')}>
                  {error}
                </Alert>
              )}
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{ mt: 3 }}
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              <a href={ROUTES.LANDING}>Back to home</a>
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};
