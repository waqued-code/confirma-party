import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  MenuItem,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Grid,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { partyService } from '../services/party.service';

const partyTypes = [
  'Casamento',
  'Aniversário',
  'Corporativo',
  'Formatura',
  'Chá de Bebê',
  'Chá de Panela',
  'Confraternização',
  'Outro',
];

const steps = ['Informações Básicas', 'Detalhes', 'Confirmação'];

export default function CreateParty() {
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    date: null,
    contactDate: null,
    partyType: '',
    observations: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (field) => (e) => {
    setFormData({ ...formData, [field]: e.target.value });
  };

  const handleDateChange = (field) => (value) => {
    setFormData({ ...formData, [field]: value });
  };

  const validateStep = () => {
    if (activeStep === 0) {
      if (!formData.name || !formData.partyType) {
        setError('Preencha o nome e tipo da festa');
        return false;
      }
    }
    if (activeStep === 1) {
      if (!formData.date || !formData.contactDate) {
        setError('Selecione as datas');
        return false;
      }
      if (dayjs(formData.contactDate).isAfter(formData.date)) {
        setError('A data de contato deve ser anterior à data da festa');
        return false;
      }
    }
    setError('');
    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
    setError('');
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await partyService.create({
        ...formData,
        date: formData.date.toISOString(),
        contactDate: formData.contactDate.toISOString(),
      });
      navigate(`/parties/${response.data.party.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao criar festa');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              label="Nome da Festa"
              value={formData.name}
              onChange={handleChange('name')}
              fullWidth
              placeholder="Ex: Casamento de João e Maria"
            />
            <TextField
              select
              label="Tipo de Festa"
              value={formData.partyType}
              onChange={handleChange('partyType')}
              fullWidth
            >
              {partyTypes.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        );

      case 1:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <DatePicker
              label="Data da Festa"
              value={formData.date}
              onChange={handleDateChange('date')}
              format="DD/MM/YYYY"
              minDate={dayjs()}
              slotProps={{
                textField: { fullWidth: true },
              }}
            />
            <DatePicker
              label="Data para Iniciar Contato"
              value={formData.contactDate}
              onChange={handleDateChange('contactDate')}
              format="DD/MM/YYYY"
              minDate={dayjs()}
              maxDate={formData.date || undefined}
              slotProps={{
                textField: {
                  fullWidth: true,
                  helperText: 'A IA começará a enviar convites nesta data',
                },
              }}
            />
            <TextField
              label="Observações (opcional)"
              value={formData.observations}
              onChange={handleChange('observations')}
              fullWidth
              multiline
              rows={4}
              placeholder="Informações adicionais sobre a festa..."
            />
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Confirme os dados da sua festa:
            </Typography>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={6}>
                <Typography color="text.secondary" variant="body2">
                  Nome
                </Typography>
                <Typography fontWeight={500}>{formData.name}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography color="text.secondary" variant="body2">
                  Tipo
                </Typography>
                <Typography fontWeight={500}>{formData.partyType}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography color="text.secondary" variant="body2">
                  Data da Festa
                </Typography>
                <Typography fontWeight={500}>
                  {formData.date?.format('DD/MM/YYYY')}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography color="text.secondary" variant="body2">
                  Início dos Contatos
                </Typography>
                <Typography fontWeight={500}>
                  {formData.contactDate?.format('DD/MM/YYYY')}
                </Typography>
              </Grid>
              {formData.observations && (
                <Grid item xs={12}>
                  <Typography color="text.secondary" variant="body2">
                    Observações
                  </Typography>
                  <Typography fontWeight={500}>{formData.observations}</Typography>
                </Grid>
              )}
            </Grid>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h4" fontWeight={600} gutterBottom>
        Criar Nova Festa
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 4 }}>
        Preencha as informações da sua festa
      </Typography>

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Card>
        <CardContent sx={{ p: 4 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {renderStepContent()}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button
              onClick={handleBack}
              disabled={activeStep === 0}
              variant="outlined"
            >
              Voltar
            </Button>

            {activeStep === steps.length - 1 ? (
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? 'Criando...' : 'Criar Festa'}
              </Button>
            ) : (
              <Button variant="contained" onClick={handleNext}>
                Próximo
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
