import { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Chip,
  Collapse,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Schedule as ScheduleIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import { followupService } from '../services/followup.service';

const scheduleTypeLabels = {
  SPECIFIC_DATE: 'Data específica',
  DAYS_BEFORE_PARTY: 'Dias antes da festa',
  DAYS_AFTER_INVITE: 'Dias após o convite',
};

const statusLabels = {
  PENDING: { label: 'Aguardando', color: '#f59e0b', bgColor: '#fef3c7' },
  SENT: { label: 'Enviado', color: '#10b981', bgColor: '#d1fae5' },
  FAILED: { label: 'Falhou', color: '#ef4444', bgColor: '#fee2e2' },
};

export default function FollowUpSection({ party, followUps = [], onUpdate }) {
  const [expanded, setExpanded] = useState(true);
  const [editingOrder, setEditingOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    message: '',
    scheduleType: 'DAYS_AFTER_INVITE',
    scheduledDate: '',
    daysOffset: 3,
  });

  const resetForm = () => {
    setFormData({
      message: '',
      scheduleType: 'DAYS_AFTER_INVITE',
      scheduledDate: '',
      daysOffset: 3,
    });
    setEditingOrder(null);
    setError(null);
  };

  const handleEdit = (followUp) => {
    setFormData({
      message: followUp.message,
      scheduleType: followUp.scheduleType,
      scheduledDate: followUp.scheduledDate ? new Date(followUp.scheduledDate).toISOString().split('T')[0] : '',
      daysOffset: followUp.daysOffset || 3,
    });
    setEditingOrder(followUp.order);
    setError(null);
  };

  const handleAdd = (order) => {
    resetForm();
    setEditingOrder(order);
  };

  const handleSave = async () => {
    if (!formData.message.trim()) {
      setError('A mensagem é obrigatória');
      return;
    }

    if (formData.scheduleType === 'SPECIFIC_DATE' && !formData.scheduledDate) {
      setError('A data é obrigatória para agendamento por data específica');
      return;
    }

    if (formData.scheduleType !== 'SPECIFIC_DATE' && (!formData.daysOffset || formData.daysOffset < 1)) {
      setError('O número de dias deve ser maior que 0');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await followupService.upsert(party.id, {
        order: editingOrder,
        message: formData.message,
        scheduleType: formData.scheduleType,
        scheduledDate: formData.scheduleType === 'SPECIFIC_DATE' ? formData.scheduledDate : null,
        daysOffset: formData.scheduleType !== 'SPECIFIC_DATE' ? formData.daysOffset : null,
      });
      resetForm();
      onUpdate();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar follow-up');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (order) => {
    if (!confirm('Tem certeza que deseja excluir este follow-up?')) return;

    setLoading(true);
    try {
      await followupService.delete(party.id, order);
      onUpdate();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao excluir follow-up');
    } finally {
      setLoading(false);
    }
  };

  const getScheduleDescription = (followUp) => {
    switch (followUp.scheduleType) {
      case 'SPECIFIC_DATE':
        return new Date(followUp.scheduledDate).toLocaleDateString('pt-BR');
      case 'DAYS_BEFORE_PARTY':
        return `${followUp.daysOffset} dias antes da festa`;
      case 'DAYS_AFTER_INVITE':
        return `${followUp.daysOffset} dias após o convite`;
      default:
        return '';
    }
  };

  const existingOrders = followUps.map(f => f.order);
  const canAddFollowUp1 = !existingOrders.includes(1);
  const canAddFollowUp2 = !existingOrders.includes(2);

  return (
    <Box
      sx={{
        bgcolor: 'white',
        borderRadius: 4,
        p: 3,
        border: '1px solid',
        borderColor: 'grey.100',
        mb: 4,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <ScheduleIcon sx={{ color: '#8b5cf6' }} />
          <Typography variant="h6" sx={{ fontWeight: 600, color: 'grey.800' }}>
            Follow-ups
          </Typography>
          <Chip
            label={`${followUps.length}/2`}
            size="small"
            sx={{
              bgcolor: '#f3e8ff',
              color: '#8b5cf6',
              fontWeight: 600,
              fontSize: '0.75rem',
            }}
          />
        </Box>
        <IconButton size="small">
          {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ mt: 3 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Follow-up Cards */}
          {[1, 2].map((order) => {
            const followUp = followUps.find(f => f.order === order);
            const isEditing = editingOrder === order;

            return (
              <Box
                key={order}
                sx={{
                  border: '1px solid',
                  borderColor: isEditing ? '#8b5cf6' : 'grey.200',
                  borderRadius: 3,
                  p: 2.5,
                  mb: 2,
                  bgcolor: isEditing ? '#faf5ff' : 'white',
                  transition: 'all 0.2s',
                }}
              >
                {/* Card Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: isEditing ? 2 : 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'grey.700' }}>
                      Follow-up {order}
                    </Typography>
                    {followUp && !isEditing && (
                      <Chip
                        label={statusLabels[followUp.status]?.label}
                        size="small"
                        sx={{
                          bgcolor: statusLabels[followUp.status]?.bgColor,
                          color: statusLabels[followUp.status]?.color,
                          fontWeight: 500,
                          fontSize: '0.7rem',
                        }}
                      />
                    )}
                  </Box>

                  {followUp && !isEditing && (
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(followUp);
                        }}
                        sx={{ color: 'grey.500', '&:hover': { color: '#8b5cf6', bgcolor: '#f3e8ff' } }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(order);
                        }}
                        sx={{ color: 'grey.400', '&:hover': { color: '#ef4444', bgcolor: '#fee2e2' } }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  )}
                </Box>

                {/* Content */}
                {isEditing ? (
                  // Edit Form
                  <Box>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      label="Mensagem do Follow-up"
                      placeholder="Ex: Olá {nome_convidado}, gostaria de confirmar sua presença..."
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      sx={{
                        mb: 2,
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          bgcolor: 'white',
                          '&:hover fieldset': { borderColor: '#8b5cf6' },
                          '&.Mui-focused fieldset': { borderColor: '#8b5cf6' },
                        },
                        '& .MuiInputLabel-root.Mui-focused': { color: '#8b5cf6' },
                      }}
                    />

                    <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                      <FormControl sx={{ minWidth: 200 }} size="small">
                        <InputLabel>Quando enviar</InputLabel>
                        <Select
                          value={formData.scheduleType}
                          label="Quando enviar"
                          onChange={(e) => setFormData({ ...formData, scheduleType: e.target.value })}
                          sx={{
                            borderRadius: 2,
                            bgcolor: 'white',
                            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#8b5cf6' },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#8b5cf6' },
                          }}
                        >
                          <MenuItem value="DAYS_AFTER_INVITE">Dias após o convite</MenuItem>
                          <MenuItem value="DAYS_BEFORE_PARTY">Dias antes da festa</MenuItem>
                          <MenuItem value="SPECIFIC_DATE">Data específica</MenuItem>
                        </Select>
                      </FormControl>

                      {formData.scheduleType === 'SPECIFIC_DATE' ? (
                        <TextField
                          type="date"
                          label="Data"
                          value={formData.scheduledDate}
                          onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                          InputLabelProps={{ shrink: true }}
                          size="small"
                          sx={{
                            minWidth: 180,
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 2,
                              bgcolor: 'white',
                              '&:hover fieldset': { borderColor: '#8b5cf6' },
                              '&.Mui-focused fieldset': { borderColor: '#8b5cf6' },
                            },
                            '& .MuiInputLabel-root.Mui-focused': { color: '#8b5cf6' },
                          }}
                        />
                      ) : (
                        <TextField
                          type="number"
                          label="Dias"
                          value={formData.daysOffset}
                          onChange={(e) => setFormData({ ...formData, daysOffset: parseInt(e.target.value) || 0 })}
                          inputProps={{ min: 1, max: 365 }}
                          size="small"
                          sx={{
                            width: 100,
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 2,
                              bgcolor: 'white',
                              '&:hover fieldset': { borderColor: '#8b5cf6' },
                              '&.Mui-focused fieldset': { borderColor: '#8b5cf6' },
                            },
                            '& .MuiInputLabel-root.Mui-focused': { color: '#8b5cf6' },
                          }}
                        />
                      )}
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                      <Button
                        size="small"
                        onClick={resetForm}
                        sx={{ color: 'grey.600' }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={handleSave}
                        disabled={loading}
                        sx={{
                          background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                          borderRadius: 2,
                          '&.Mui-disabled': { bgcolor: 'grey.200' },
                        }}
                      >
                        {loading ? <CircularProgress size={16} color="inherit" /> : 'Salvar'}
                      </Button>
                    </Box>
                  </Box>
                ) : followUp ? (
                  // Display existing follow-up
                  <Box sx={{ mt: 1 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        color: 'grey.600',
                        whiteSpace: 'pre-wrap',
                        lineHeight: 1.6,
                        mb: 1.5,
                      }}
                    >
                      {followUp.message.length > 150
                        ? followUp.message.substring(0, 150) + '...'
                        : followUp.message}
                    </Typography>
                    <Chip
                      icon={<ScheduleIcon sx={{ fontSize: 14 }} />}
                      label={getScheduleDescription(followUp)}
                      size="small"
                      sx={{
                        bgcolor: '#f3f4f6',
                        color: 'grey.600',
                        fontWeight: 500,
                        fontSize: '0.7rem',
                        '& .MuiChip-icon': { color: 'grey.500' },
                      }}
                    />
                  </Box>
                ) : (
                  // Add new follow-up button
                  <Button
                    fullWidth
                    startIcon={<AddIcon />}
                    onClick={() => handleAdd(order)}
                    sx={{
                      mt: 1,
                      py: 1.5,
                      border: '2px dashed',
                      borderColor: 'grey.300',
                      borderRadius: 2,
                      color: 'grey.500',
                      '&:hover': {
                        borderColor: '#8b5cf6',
                        color: '#8b5cf6',
                        bgcolor: '#faf5ff',
                      },
                    }}
                  >
                    Adicionar Follow-up {order}
                  </Button>
                )}
              </Box>
            );
          })}

          {/* Helper text */}
          <Typography variant="caption" sx={{ color: 'grey.400', display: 'block', mt: 1 }}>
            Use {'{nome_convidado}'} na mensagem para personalizar com o nome de cada convidado.
          </Typography>
        </Box>
      </Collapse>
    </Box>
  );
}
