import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  CircularProgress,
  Button,
  Alert,
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Celebration as CelebrationIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { paymentService } from '../services/payment.service';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // loading, success, error
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [error, setError] = useState('');

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (sessionId) {
      verifyPayment();
    } else {
      setStatus('error');
      setError('Sessão de pagamento não encontrada');
    }
  }, [sessionId]);

  const verifyPayment = async () => {
    try {
      const response = await paymentService.verifySession(sessionId);

      if (response.data.success) {
        setStatus('success');
        setPaymentInfo(response.data);
      } else {
        setStatus('error');
        setError('Pagamento não confirmado. Tente novamente.');
      }
    } catch (err) {
      setStatus('error');
      setError(err.response?.data?.error || 'Erro ao verificar pagamento');
    }
  };

  const getPlanName = (plan) => {
    const names = {
      FESTA: 'Festa',
      CELEBRACAO: 'Celebração',
      PERSONALIZADO: 'Personalizado',
    };
    return names[plan] || plan;
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #fdf2f8 0%, #f5f3ff 100%)',
        p: 3,
      }}
    >
      <Box
        sx={{
          bgcolor: 'white',
          borderRadius: 4,
          p: 5,
          maxWidth: 480,
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
        }}
      >
        {status === 'loading' && (
          <>
            <CircularProgress size={60} sx={{ color: '#ec4899', mb: 3 }} />
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
              Verificando pagamento...
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Aguarde enquanto confirmamos seu pagamento
            </Typography>
          </>
        )}

        {status === 'success' && (
          <>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                bgcolor: '#dcfce7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 3,
              }}
            >
              <CheckIcon sx={{ fontSize: 48, color: '#10b981' }} />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 2 }}>
              <CelebrationIcon sx={{ color: '#ec4899', fontSize: 28 }} />
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'grey.800' }}>
                Pagamento Confirmado!
              </Typography>
              <CelebrationIcon sx={{ color: '#8b5cf6', fontSize: 28 }} />
            </Box>

            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
              Seu plano foi atualizado com sucesso
            </Typography>

            {paymentInfo && (
              <Box
                sx={{
                  bgcolor: 'grey.50',
                  borderRadius: 3,
                  p: 3,
                  mb: 4,
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Novo Plano
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {getPlanName(paymentInfo.newPlan)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    Limite de Famílias
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: '#10b981' }}>
                    {paymentInfo.newLimit} famílias
                  </Typography>
                </Box>
              </Box>
            )}

            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={() => navigate('/parties')}
              sx={{
                background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
                py: 1.5,
                borderRadius: 3,
                fontWeight: 600,
                '&:hover': {
                  background: 'linear-gradient(135deg, #db2777 0%, #7c3aed 100%)',
                },
              }}
            >
              Voltar para Minhas Festas
            </Button>
          </>
        )}

        {status === 'error' && (
          <>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                bgcolor: '#fee2e2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 3,
              }}
            >
              <ErrorIcon sx={{ fontSize: 48, color: '#ef4444' }} />
            </Box>

            <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
              Ops! Algo deu errado
            </Typography>

            <Alert severity="error" sx={{ mb: 4, textAlign: 'left' }}>
              {error}
            </Alert>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => navigate('/parties')}
                sx={{
                  py: 1.5,
                  borderRadius: 3,
                  borderColor: 'grey.300',
                  color: 'grey.600',
                  '&:hover': {
                    borderColor: 'grey.400',
                    bgcolor: 'grey.50',
                  },
                }}
              >
                Voltar
              </Button>
              <Button
                variant="contained"
                fullWidth
                onClick={() => window.location.reload()}
                sx={{
                  background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
                  py: 1.5,
                  borderRadius: 3,
                  '&:hover': {
                    background: 'linear-gradient(135deg, #db2777 0%, #7c3aed 100%)',
                  },
                }}
              >
                Tentar Novamente
              </Button>
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
}
