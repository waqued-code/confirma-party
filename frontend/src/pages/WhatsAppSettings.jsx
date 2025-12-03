import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Chip,
  TextField,
  Snackbar,
} from '@mui/material';
import {
  WhatsApp as WhatsAppIcon,
  QrCode2 as QrCodeIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { whatsappService } from '../services/whatsapp.service';

export default function WhatsAppSettings() {
  const [status, setStatus] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    setLoading(true);
    try {
      const response = await whatsappService.getStatus();
      setStatus(response.data);
      setQrCode(null);
    } catch (error) {
      console.error('Erro ao verificar status:', error);
      setStatus({ state: 'disconnected' });
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const response = await whatsappService.connect();
      if (response.data.qrcode) {
        setQrCode(response.data.qrcode);
      }
      // Poll for connection
      const interval = setInterval(async () => {
        try {
          const statusRes = await whatsappService.getStatus();
          if (statusRes.data.state === 'open') {
            clearInterval(interval);
            setStatus(statusRes.data);
            setQrCode(null);
            setSnackbar({ open: true, message: 'WhatsApp conectado!', severity: 'success' });
          }
        } catch (e) {
          // ignore polling errors
        }
      }, 3000);

      // Stop polling after 2 minutes
      setTimeout(() => clearInterval(interval), 120000);
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.response?.data?.error || 'Erro ao conectar',
        severity: 'error',
      });
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await whatsappService.disconnect();
      setStatus({ state: 'disconnected' });
      setSnackbar({ open: true, message: 'WhatsApp desconectado', severity: 'info' });
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.response?.data?.error || 'Erro ao desconectar',
        severity: 'error',
      });
    }
  };

  const handleSetWebhook = async () => {
    if (!webhookUrl) {
      setSnackbar({ open: true, message: 'Informe a URL do webhook', severity: 'warning' });
      return;
    }

    try {
      await whatsappService.setWebhook(webhookUrl);
      setSnackbar({ open: true, message: 'Webhook configurado!', severity: 'success' });
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.response?.data?.error || 'Erro ao configurar webhook',
        severity: 'error',
      });
    }
  };

  const isConnected = status?.state === 'open';

  return (
    <Box>
      <Typography variant="h4" fontWeight={600} gutterBottom>
        Configurações do WhatsApp
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 4 }}>
        Conecte seu WhatsApp para enviar mensagens automaticamente
      </Typography>

      {/* Status Card */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <WhatsAppIcon sx={{ fontSize: 48, color: isConnected ? 'success.main' : 'grey.400' }} />
              <Box>
                <Typography variant="h6">Status da Conexão</Typography>
                {loading ? (
                  <CircularProgress size={20} />
                ) : (
                  <Chip
                    icon={isConnected ? <CheckIcon /> : <CloseIcon />}
                    label={isConnected ? 'Conectado' : 'Desconectado'}
                    color={isConnected ? 'success' : 'default'}
                    size="small"
                  />
                )}
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={checkStatus}
                disabled={loading}
              >
                Atualizar
              </Button>
              {isConnected ? (
                <Button
                  variant="outlined"
                  color="error"
                  onClick={handleDisconnect}
                >
                  Desconectar
                </Button>
              ) : (
                <Button
                  variant="contained"
                  color="success"
                  onClick={handleConnect}
                  disabled={connecting}
                  startIcon={connecting ? <CircularProgress size={20} color="inherit" /> : <QrCodeIcon />}
                >
                  {connecting ? 'Conectando...' : 'Conectar'}
                </Button>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* QR Code */}
      {qrCode && (
        <Card sx={{ mb: 4 }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              Escaneie o QR Code com seu WhatsApp
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Abra o WhatsApp no seu celular, vá em Configurações {'>'} Aparelhos conectados {'>'} Conectar um aparelho
            </Typography>
            <Box
              component="img"
              src={qrCode.base64 || `data:image/png;base64,${qrCode}`}
              alt="QR Code"
              sx={{
                maxWidth: 300,
                width: '100%',
                border: '1px solid',
                borderColor: 'grey.300',
                borderRadius: 2,
              }}
            />
            <Alert severity="info" sx={{ mt: 3, maxWidth: 400, mx: 'auto' }}>
              O QR Code expira em 60 segundos. Se expirar, clique em "Conectar" novamente.
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Webhook Configuration */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Configuração de Webhook
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Configure o webhook para receber respostas dos convidados automaticamente
          </Typography>

          <Alert severity="info" sx={{ mb: 3 }}>
            O webhook deve apontar para: <strong>https://seu-dominio.com/api/webhook/evolution</strong>
          </Alert>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              fullWidth
              label="URL do Webhook"
              placeholder="https://seu-dominio.com/api/webhook/evolution"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
            />
            <Button variant="contained" onClick={handleSetWebhook}>
              Salvar
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card sx={{ mt: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Como funciona?
          </Typography>
          <Box component="ol" sx={{ pl: 2 }}>
            <li>
              <Typography sx={{ mb: 1 }}>
                <strong>Conecte seu WhatsApp:</strong> Escaneie o QR Code para vincular seu número
              </Typography>
            </li>
            <li>
              <Typography sx={{ mb: 1 }}>
                <strong>Crie uma festa:</strong> Cadastre os dados do evento e importe a lista de convidados
              </Typography>
            </li>
            <li>
              <Typography sx={{ mb: 1 }}>
                <strong>Gere a mensagem:</strong> A IA criará uma mensagem personalizada para o seu evento
              </Typography>
            </li>
            <li>
              <Typography sx={{ mb: 1 }}>
                <strong>Envie para todos:</strong> Com um clique, envie o convite para todos os convidados
              </Typography>
            </li>
            <li>
              <Typography>
                <strong>Acompanhe as respostas:</strong> A IA processa as respostas e atualiza o status automaticamente
              </Typography>
            </li>
          </Box>
        </CardContent>
      </Card>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
