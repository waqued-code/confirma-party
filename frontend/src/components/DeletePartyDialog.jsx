import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Warning as WarningIcon,
  DeleteForever as DeleteIcon,
} from '@mui/icons-material';

export default function DeletePartyDialog({ open, onClose, party, onConfirm }) {
  const [confirmName, setConfirmName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isNameMatch = confirmName.trim().toLowerCase() === party?.name?.trim().toLowerCase();

  useEffect(() => {
    if (open) {
      setConfirmName('');
      setError('');
    }
  }, [open]);

  const handleDelete = async () => {
    if (!isNameMatch) {
      setError('O nome digitado não corresponde ao nome da festa');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao excluir festa');
    } finally {
      setLoading(false);
    }
  };

  const getPlanLabel = (plan) => {
    const labels = {
      GRATUITO: 'Gratuito',
      FESTA: 'Festa (R$ 37,00)',
      CELEBRACAO: 'Celebração (R$ 77,00)',
      PERSONALIZADO: 'Personalizado',
    };
    return labels[plan] || plan;
  };

  if (!party) return null;

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
          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          p: 3,
          color: 'white',
          textAlign: 'center',
        }}
      >
        <WarningIcon sx={{ fontSize: 48, mb: 1, opacity: 0.9 }} />
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Excluir Festa
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.9, mt: 1 }}>
          Esta ação é irreversível
        </Typography>
      </Box>

      <DialogContent sx={{ p: 3 }}>
        {/* Warning Box */}
        <Alert
          severity="error"
          icon={<DeleteIcon />}
          sx={{
            mb: 3,
            '& .MuiAlert-message': { width: '100%' }
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            Ao excluir esta festa, você perderá permanentemente:
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: 2 }}>
            <li>
              <Typography variant="body2">
                <strong>{party.guests?.length || 0} contatos</strong> salvos nesta festa
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                Todo o <strong>histórico de conversas</strong> e confirmações
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                A <strong>mensagem de convite</strong> personalizada
              </Typography>
            </li>
            {party.plan && party.plan !== 'GRATUITO' && (
              <li>
                <Typography variant="body2">
                  O <strong>plano {getPlanLabel(party.plan)}</strong> pago para esta festa
                  <Typography variant="caption" display="block" sx={{ color: 'error.dark', fontWeight: 600 }}>
                    (Não há reembolso para planos já utilizados)
                  </Typography>
                </Typography>
              </li>
            )}
          </Box>
        </Alert>

        {/* Party Info */}
        <Box
          sx={{
            bgcolor: 'grey.50',
            borderRadius: 2,
            p: 2,
            mb: 3,
          }}
        >
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            Festa a ser excluída:
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 600, color: 'grey.800' }}>
            {party.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {party.partyType} • {new Date(party.date).toLocaleDateString('pt-BR')}
          </Typography>
        </Box>

        {/* Confirmation Input */}
        <Typography variant="body2" sx={{ mb: 1.5, color: 'grey.700' }}>
          Para confirmar, digite o nome da festa: <strong>{party.name}</strong>
        </Typography>

        <TextField
          fullWidth
          value={confirmName}
          onChange={(e) => setConfirmName(e.target.value)}
          placeholder={`Digite "${party.name}" para confirmar`}
          error={confirmName.length > 0 && !isNameMatch}
          helperText={confirmName.length > 0 && !isNameMatch ? 'O nome não corresponde' : ''}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              '&:hover fieldset': { borderColor: '#ef4444' },
              '&.Mui-focused fieldset': { borderColor: '#ef4444' },
            },
            '& .MuiInputLabel-root.Mui-focused': { color: '#ef4444' },
          }}
        />

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 0 }}>
        <Button
          onClick={onClose}
          sx={{ color: 'grey.600' }}
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleDelete}
          disabled={!isNameMatch || loading}
          sx={{
            bgcolor: '#ef4444',
            px: 4,
            borderRadius: 2,
            '&:hover': {
              bgcolor: '#dc2626',
            },
            '&.Mui-disabled': { bgcolor: 'grey.200' },
          }}
        >
          {loading ? (
            <CircularProgress size={20} color="inherit" />
          ) : (
            'Excluir Festa Permanentemente'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
