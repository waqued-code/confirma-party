import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import {
  Rocket as RocketIcon,
  CheckCircle as CheckIcon,
  Star as StarIcon,
} from '@mui/icons-material';
import { paymentService } from '../services/payment.service';

const PLAN_INFO = {
  GRATUITO: { name: 'Gratuito', limit: 15, price: 0 },
  FESTA: { name: 'Festa', limit: 50, price: 3700 },
  CELEBRACAO: { name: 'Celebração', limit: 150, price: 7700 },
  PERSONALIZADO: { name: 'Personalizado', limit: 9999, price: null },
};

const PLAN_FEATURES = [
  'Convites ilimitados por chat',
  'Mensagens personalizadas com IA',
  'Dashboard em tempo real',
  'Confirmação automática',
  'Suporte por WhatsApp',
];

export default function UpgradeDialog({ open, onClose, party, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [upgradeInfo, setUpgradeInfo] = useState(null);
  const [error, setError] = useState('');

  const currentPlan = party?.plan || 'GRATUITO';
  const currentLimit = party?.guestLimit || 15;

  useEffect(() => {
    if (open) {
      setSelectedPlan(null);
      setUpgradeInfo(null);
      setError('');
    }
  }, [open]);

  const availablePlans = Object.entries(PLAN_INFO)
    .filter(([key]) => {
      const planLimit = PLAN_INFO[key].limit;
      return planLimit > currentLimit && key !== 'PERSONALIZADO';
    })
    .map(([key, value]) => ({ id: key, ...value }));

  const handleSelectPlan = async (planId) => {
    setSelectedPlan(planId);
    setError('');
    setLoading(true);

    try {
      const response = await paymentService.calculateUpgrade(party.id, planId);
      setUpgradeInfo(response.data);
    } catch (err) {
      if (err.response?.data?.error === 'CONTACT_REQUIRED') {
        setError('Entre em contato conosco para planos personalizados.');
      } else {
        setError(err.response?.data?.error || 'Erro ao calcular upgrade');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (!selectedPlan || !upgradeInfo) return;

    setLoading(true);
    setError('');

    try {
      const successUrl = `${window.location.origin}/app/payment/success?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${window.location.origin}/parties/${party.id}`;

      const response = await paymentService.createCheckout(
        party.id,
        selectedPlan,
        successUrl,
        cancelUrl
      );

      // Redirect to Stripe Checkout
      if (response.data.checkoutUrl) {
        window.location.href = response.data.checkoutUrl;
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao iniciar pagamento');
      setLoading(false);
    }
  };

  const handleContact = () => {
    window.open('https://wa.me/5511999999999?text=Olá! Gostaria de saber mais sobre o plano personalizado do Confirma.Party', '_blank');
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 4, overflow: 'hidden' }
      }}
    >
      {/* Header */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
          p: 3,
          color: 'white',
          textAlign: 'center',
        }}
      >
        <RocketIcon sx={{ fontSize: 48, mb: 1, opacity: 0.9 }} />
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Limite de Convidados Atingido
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.9, mt: 1 }}>
          Faça upgrade do seu plano para adicionar mais convidados
        </Typography>
      </Box>

      <DialogContent sx={{ p: 3 }}>
        {/* Current Plan Info */}
        <Box
          sx={{
            bgcolor: 'grey.50',
            borderRadius: 2,
            p: 2,
            mb: 3,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Box>
            <Typography variant="body2" color="text.secondary">
              Plano Atual
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {PLAN_INFO[currentPlan]?.name}
            </Typography>
          </Box>
          <Chip
            label={`${currentLimit} famílias`}
            size="small"
            sx={{
              bgcolor: 'white',
              fontWeight: 600,
              border: '1px solid',
              borderColor: 'grey.200',
            }}
          />
        </Box>

        {/* Available Plans */}
        <Typography variant="subtitle2" sx={{ mb: 2, color: 'grey.600' }}>
          Escolha seu novo plano:
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {availablePlans.map((plan) => (
            <Box
              key={plan.id}
              onClick={() => handleSelectPlan(plan.id)}
              sx={{
                border: '2px solid',
                borderColor: selectedPlan === plan.id ? '#ec4899' : 'grey.200',
                borderRadius: 3,
                p: 2.5,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                bgcolor: selectedPlan === plan.id ? '#fdf2f8' : 'white',
                '&:hover': {
                  borderColor: '#ec4899',
                  bgcolor: '#fdf2f8',
                },
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {plan.name}
                    </Typography>
                    {plan.id === 'CELEBRACAO' && (
                      <Chip
                        label="Popular"
                        size="small"
                        icon={<StarIcon sx={{ fontSize: 14 }} />}
                        sx={{
                          bgcolor: '#fef3c7',
                          color: '#d97706',
                          fontWeight: 600,
                          fontSize: '0.7rem',
                          '& .MuiChip-icon': { color: '#d97706' },
                        }}
                      />
                    )}
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Até {plan.limit} famílias convidadas
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 700,
                      color: selectedPlan === plan.id ? '#ec4899' : 'grey.800',
                    }}
                  >
                    R$ {(plan.price / 100).toFixed(2).replace('.', ',')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    por festa
                  </Typography>
                </Box>
              </Box>
            </Box>
          ))}

          {/* Custom Plan */}
          <Box
            onClick={handleContact}
            sx={{
              border: '2px dashed',
              borderColor: 'grey.300',
              borderRadius: 3,
              p: 2.5,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              '&:hover': {
                borderColor: '#8b5cf6',
                bgcolor: '#f5f3ff',
              },
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Personalizado
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Para festas com mais de 150 famílias
                </Typography>
              </Box>
              <Typography variant="body1" sx={{ fontWeight: 600, color: '#8b5cf6' }}>
                Fale Conosco
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Features */}
        {selectedPlan && (
          <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1.5, color: 'grey.700' }}>
              Incluso em todos os planos:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {PLAN_FEATURES.map((feature, index) => (
                <Chip
                  key={index}
                  icon={<CheckIcon sx={{ fontSize: 16, color: '#10b981 !important' }} />}
                  label={feature}
                  size="small"
                  sx={{
                    bgcolor: 'white',
                    fontSize: '0.75rem',
                  }}
                />
              ))}
            </Box>
          </Box>
        )}

        {/* Upgrade Info */}
        {upgradeInfo && (
          <Box
            sx={{
              mt: 3,
              p: 2,
              bgcolor: '#ecfdf5',
              borderRadius: 2,
              border: '1px solid',
              borderColor: '#a7f3d0',
            }}
          >
            <Typography variant="body2" sx={{ color: '#065f46', fontWeight: 500 }}>
              Valor do upgrade: <strong>{upgradeInfo.amountToPayFormatted}</strong>
            </Typography>
            <Typography variant="caption" sx={{ color: '#047857' }}>
              De {upgradeInfo.currentLimit} para {upgradeInfo.newLimit} famílias
            </Typography>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 0 }}>
        <Button onClick={onClose} sx={{ color: 'grey.600' }}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleCheckout}
          disabled={!selectedPlan || !upgradeInfo || loading}
          sx={{
            background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
            px: 4,
            borderRadius: 2,
            '&:hover': {
              background: 'linear-gradient(135deg, #db2777 0%, #7c3aed 100%)',
            },
            '&.Mui-disabled': { bgcolor: 'grey.200' },
          }}
        >
          {loading ? (
            <CircularProgress size={20} color="inherit" />
          ) : (
            `Fazer Upgrade${upgradeInfo ? ` - ${upgradeInfo.amountToPayFormatted}` : ''}`
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
