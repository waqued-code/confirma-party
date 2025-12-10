import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Link,
  Alert,
  InputAdornment,
  IconButton,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email as EmailIcon,
  Lock as LockIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao fazer login');
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
        background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
        p: 2,
        position: 'relative',
      }}
    >
      {/* Link para voltar à landing */}
      <Box
        component="a"
        href="https://confirma.party"
        sx={{
          position: 'absolute',
          top: 24,
          left: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          color: 'white',
          textDecoration: 'none',
          fontSize: '0.875rem',
          fontWeight: 500,
          opacity: 0.9,
          '&:hover': { opacity: 1 },
        }}
      >
        <ArrowBackIcon fontSize="small" />
        Voltar ao site
      </Box>

      <Card sx={{ maxWidth: 420, width: '100%', borderRadius: 3 }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box
              component="img"
              src="/app/logo.svg"
              alt="Confirma.Party"
              sx={{ height: 40, mb: 2 }}
            />
            <Typography color="text.secondary">
              Entre na sua conta
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              margin="normal"
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              fullWidth
              label="Senha"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
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
                mb: 2,
                background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                borderRadius: '100px',
                py: 1.5,
                '&:hover': {
                  background: 'linear-gradient(135deg, #db2777, #7c3aed)',
                },
              }}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <Typography align="center" color="text.secondary">
            Não tem uma conta?{' '}
            <Link
              component={RouterLink}
              to="/register"
              sx={{ color: '#ec4899', fontWeight: 600 }}
            >
              Cadastre-se
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
