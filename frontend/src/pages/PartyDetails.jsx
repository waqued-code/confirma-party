import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  Paper,
  Tab,
  Tabs,
  CircularProgress,
  Tooltip,
  Link,
} from '@mui/material';
import {
  Upload as UploadIcon,
  Send as SendIcon,
  AutoAwesome as AIIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  WhatsApp as WhatsAppIcon,
  Dashboard as DashboardIcon,
  Refresh as RefreshIcon,
  PersonAdd as PersonAddIcon,
  FolderOpen as FolderIcon,
} from '@mui/icons-material';
import { partyService } from '../services/party.service';
import { guestService } from '../services/guest.service';
import UpgradeDialog from '../components/UpgradeDialog';

const statusConfig = {
  NAO_RESPONDEU: { label: 'Aguardando', color: '#f59e0b', bgColor: '#fef3c7', icon: '⏳' },
  CONFIRMOU_PRESENCA: { label: 'Confirmado', color: '#10b981', bgColor: '#d1fae5', icon: '✓' },
  RECUSOU_CONVITE: { label: 'Recusou', color: '#ef4444', bgColor: '#fee2e2', icon: '✗' },
  NECESSITA_CONVERSAR: { label: 'Conversar', color: '#6366f1', bgColor: '#e0e7ff', icon: '💬' },
};

const statusLabels = {
  NAO_RESPONDEU: { label: 'Aguardando', color: 'warning' },
  CONFIRMOU_PRESENCA: { label: 'Confirmado', color: 'success' },
  RECUSOU_CONVITE: { label: 'Recusou', color: 'error' },
  NECESSITA_CONVERSAR: { label: 'Precisa Conversar', color: 'info' },
};

export default function PartyDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [party, setParty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Dialog states
  const [messageDialog, setMessageDialog] = useState(false);
  const [addGuestDialog, setAddGuestDialog] = useState(false);
  const [regenerateDialog, setRegenerateDialog] = useState(false);
  const [upgradeDialog, setUpgradeDialog] = useState(false);

  // Form states
  const [newGuests, setNewGuests] = useState([{ name: '', phone: '', contactMethod: 'WHATSAPP' }]);
  const [regenerateInstructions, setRegenerateInstructions] = useState('');
  const [generatingMessage, setGeneratingMessage] = useState(false);
  const [sendingMessages, setSendingMessages] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    loadParty();
  }, [id]);

  const loadParty = async () => {
    try {
      const response = await partyService.getById(id);
      setParty(response.data);
    } catch (error) {
      console.error('Erro ao carregar festa:', error);
      setSnackbar({ open: true, message: 'Erro ao carregar festa', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await processFile(file);
    if (event.target) event.target.value = '';
  };

  const processFile = async (file) => {
    setUploadingFile(true);
    try {
      const response = await partyService.uploadGuests(id, file);
      setSnackbar({ open: true, message: response.data.message, severity: 'success' });
      loadParty();
    } catch (error) {
      const errorCode = error.response?.data?.error;
      if (errorCode === 'PLAN_LIMIT_EXCEEDED' || errorCode === 'PLAN_LIMIT_REACHED') {
        setUpgradeDialog(true);
      } else {
        setSnackbar({
          open: true,
          message: error.response?.data?.message || error.response?.data?.error || 'Erro ao importar convidados',
          severity: 'error',
        });
      }
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      const validTypes = ['.xlsx', '.xls', '.csv'];
      const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
      if (validTypes.includes(fileExtension)) {
        processFile(file);
      } else {
        setSnackbar({
          open: true,
          message: 'Formato inválido. Use .xlsx, .xls ou .csv',
          severity: 'error',
        });
      }
    }
  }, [id]);

  const handleGenerateMessage = async () => {
    setGeneratingMessage(true);
    try {
      const response = await partyService.generateInviteMessage(id);
      setParty({ ...party, inviteMessage: response.data.inviteMessage });
      setSnackbar({ open: true, message: 'Mensagem gerada com sucesso!', severity: 'success' });
      setMessageDialog(true);
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.response?.data?.error || 'Erro ao gerar mensagem',
        severity: 'error',
      });
    } finally {
      setGeneratingMessage(false);
    }
  };

  const handleRegenerateMessage = async () => {
    setGeneratingMessage(true);
    try {
      const response = await partyService.regenerateInviteMessage(id, regenerateInstructions);
      setParty({ ...party, inviteMessage: response.data.inviteMessage });
      setSnackbar({ open: true, message: 'Mensagem regenerada!', severity: 'success' });
      setRegenerateDialog(false);
      setRegenerateInstructions('');
      setMessageDialog(true);
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.response?.data?.error || 'Erro ao regenerar mensagem',
        severity: 'error',
      });
    } finally {
      setGeneratingMessage(false);
    }
  };

  const handleSendToAll = async () => {
    if (!party.inviteMessage) {
      setSnackbar({ open: true, message: 'Gere uma mensagem primeiro', severity: 'warning' });
      return;
    }

    setSendingMessages(true);
    try {
      const response = await partyService.sendToAllGuests(id);
      setSnackbar({ open: true, message: response.data.message, severity: 'success' });
      loadParty();
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.response?.data?.error || 'Erro ao enviar mensagens',
        severity: 'error',
      });
    } finally {
      setSendingMessages(false);
    }
  };

  const handleSendTest = async () => {
    if (!party.inviteMessage) {
      setSnackbar({ open: true, message: 'Gere uma mensagem primeiro', severity: 'warning' });
      return;
    }

    setSendingTest(true);
    try {
      const response = await partyService.sendTestMessage(id);
      setSnackbar({ open: true, message: response.data.message, severity: 'success' });
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.response?.data?.error || 'Erro ao enviar mensagem de teste',
        severity: 'error',
      });
    } finally {
      setSendingTest(false);
    }
  };

  const handleAddGuest = async () => {
    const validGuests = newGuests.filter(g => g.name.trim() && g.phone.trim());
    if (validGuests.length === 0) {
      setSnackbar({ open: true, message: 'Preencha pelo menos um convidado', severity: 'warning' });
      return;
    }

    try {
      for (const guest of validGuests) {
        await guestService.create({ ...guest, partyId: id });
      }
      setSnackbar({
        open: true,
        message: validGuests.length === 1 ? 'Convidado adicionado!' : `${validGuests.length} convidados adicionados!`,
        severity: 'success'
      });
      setAddGuestDialog(false);
      setNewGuests([{ name: '', phone: '', contactMethod: 'WHATSAPP' }]);
      loadParty();
    } catch (error) {
      const errorCode = error.response?.data?.error;
      if (errorCode === 'PLAN_LIMIT_REACHED' || errorCode === 'PLAN_LIMIT_EXCEEDED') {
        setAddGuestDialog(false);
        setUpgradeDialog(true);
      } else {
        setSnackbar({
          open: true,
          message: error.response?.data?.message || error.response?.data?.error || 'Erro ao adicionar convidado',
          severity: 'error',
        });
      }
    }
  };

  const handleAddGuestRow = () => {
    setNewGuests([...newGuests, { name: '', phone: '', contactMethod: 'WHATSAPP' }]);
  };

  const handleRemoveGuestRow = (index) => {
    if (newGuests.length > 1) {
      setNewGuests(newGuests.filter((_, i) => i !== index));
    }
  };

  const handleGuestChange = (index, field, value) => {
    const updated = [...newGuests];
    updated[index][field] = value;
    setNewGuests(updated);
  };

  const handleDeleteGuest = async (guestId) => {
    try {
      await guestService.delete(guestId);
      setSnackbar({ open: true, message: 'Convidado removido', severity: 'success' });
      loadParty();
    } catch (error) {
      setSnackbar({ open: true, message: 'Erro ao remover convidado', severity: 'error' });
    }
  };

  const handleUpdateStatus = async (guestId, status) => {
    try {
      await guestService.updateStatus(guestId, status);
      loadParty();
    } catch (error) {
      setSnackbar({ open: true, message: 'Erro ao atualizar status', severity: 'error' });
    }
  };

  const filteredGuests = () => {
    if (!party?.guests) return [];
    const statusFilter = ['all', 'NAO_RESPONDEU', 'CONFIRMOU_PRESENCA', 'RECUSOU_CONVITE', 'NECESSITA_CONVERSAR'][tab];
    if (statusFilter === 'all') return party.guests;
    return party.guests.filter((g) => g.status === statusFilter);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!party) {
    return (
      <Alert severity="error">Festa não encontrada</Alert>
    );
  }

  return (
    <Box sx={{ pb: 4 }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 4,
          pb: 3,
          borderBottom: '1px solid',
          borderColor: 'grey.100'
        }}
      >
        <Box>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: 'grey.800',
              mb: 1
            }}
          >
            {party.name}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
            <Chip
              label={party.partyType}
              size="small"
              sx={{
                bgcolor: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
                background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
                color: 'white',
                fontWeight: 600,
                fontSize: '0.75rem'
              }}
            />
            <Typography variant="body2" color="text.secondary">
              📅 {new Date(party.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </Typography>
            <Chip
              label={`${party.guests?.length || 0}/${party.guestLimit || 15} famílias`}
              size="small"
              onClick={() => setUpgradeDialog(true)}
              sx={{
                bgcolor: (party.guests?.length || 0) >= (party.guestLimit || 15) ? '#fee2e2' : '#dcfce7',
                color: (party.guests?.length || 0) >= (party.guestLimit || 15) ? '#dc2626' : '#16a34a',
                fontWeight: 600,
                fontSize: '0.75rem',
                cursor: 'pointer',
                '&:hover': {
                  bgcolor: (party.guests?.length || 0) >= (party.guestLimit || 15) ? '#fecaca' : '#bbf7d0',
                }
              }}
            />
          </Box>
        </Box>
        <Button
          variant="contained"
          startIcon={<DashboardIcon />}
          onClick={() => navigate(`/parties/${id}/dashboard`)}
          sx={{
            background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
            boxShadow: '0 4px 14px rgba(139, 92, 246, 0.3)',
            borderRadius: 3,
            px: 3,
            '&:hover': {
              background: 'linear-gradient(135deg, #db2777 0%, #7c3aed 100%)',
              boxShadow: '0 6px 20px rgba(139, 92, 246, 0.4)',
            }
          }}
        >
          Ver Dashboard
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {Object.entries(statusConfig).map(([status, config]) => {
          const count = party.guests?.filter((g) => g.status === status).length || 0;
          return (
            <Grid item xs={6} md={3} key={status}>
              <Box
                sx={{
                  bgcolor: 'white',
                  borderRadius: 4,
                  p: 3,
                  textAlign: 'center',
                  border: '1px solid',
                  borderColor: 'grey.100',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                  '&:hover': {
                    borderColor: config.color,
                    boxShadow: `0 4px 20px ${config.color}20`,
                    transform: 'translateY(-2px)'
                  }
                }}
                onClick={() => {
                  const tabIndex = ['NAO_RESPONDEU', 'CONFIRMOU_PRESENCA', 'RECUSOU_CONVITE', 'NECESSITA_CONVERSAR'].indexOf(status) + 1;
                  setTab(tabIndex);
                }}
              >
                <Typography
                  variant="h3"
                  sx={{
                    fontWeight: 700,
                    color: config.color,
                    mb: 0.5
                  }}
                >
                  {count}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: 'grey.600',
                    fontWeight: 500
                  }}
                >
                  {config.label}
                </Typography>
              </Box>
            </Grid>
          );
        })}
      </Grid>

      {/* Two Column Layout: Import + Message */}
      <Grid container spacing={4} sx={{ mb: 4 }}>
        {/* Left Column: Import Guests Dropzone */}
        <Grid item xs={12} md={6}>
          <Box
            sx={{
              bgcolor: 'white',
              borderRadius: 4,
              p: 3,
              border: '1px solid',
              borderColor: 'grey.100',
              height: '100%'
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: 'grey.800' }}>
                Importar Convidados
              </Typography>
              <Link
                component="button"
                variant="body2"
                onClick={() => setAddGuestDialog(true)}
                sx={{
                  color: 'grey.500',
                  textDecoration: 'none',
                  cursor: 'pointer',
                  fontWeight: 500,
                  transition: 'color 0.2s',
                  '&:hover': { color: '#ec4899' }
                }}
              >
                Adicionar manualmente
              </Link>
            </Box>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".xlsx,.xls,.csv"
              style={{ display: 'none' }}
            />

            <Box
              onClick={() => !uploadingFile && fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              sx={{
                border: '2px dashed',
                borderColor: isDragging ? '#ec4899' : '#e5e7eb',
                borderRadius: 3,
                py: 5,
                px: 4,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: uploadingFile ? 'wait' : 'pointer',
                bgcolor: isDragging ? '#fdf2f8' : '#fafafa',
                transition: 'all 0.2s ease',
                minHeight: 200,
                '&:hover': {
                  borderColor: '#ec4899',
                  bgcolor: '#fdf2f8',
                },
              }}
            >
              {uploadingFile ? (
                <CircularProgress size={40} sx={{ mb: 2, color: '#ec4899' }} />
              ) : (
                <Box
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: 3,
                    bgcolor: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 2,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                  }}
                >
                  <FolderIcon sx={{ fontSize: 32, color: '#9ca3af' }} />
                </Box>
              )}
              <Typography
                variant="body1"
                sx={{
                  color: 'grey.600',
                  fontWeight: 500,
                  mb: 0.5
                }}
              >
                {uploadingFile ? 'Importando...' : 'Arraste sua planilha aqui'}
              </Typography>
              <Typography variant="body2" sx={{ color: 'grey.400' }}>
                {uploadingFile ? 'Aguarde o processamento' : 'ou clique para selecionar'}
              </Typography>
            </Box>
          </Box>
        </Grid>

        {/* Right Column: Message */}
        <Grid item xs={12} md={6}>
          <Box
            sx={{
              bgcolor: 'white',
              borderRadius: 4,
              p: 3,
              border: '1px solid',
              borderColor: 'grey.100',
              height: '100%'
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: 'grey.800' }}>
                Mensagem de Convite
              </Typography>
              <Tooltip title={party.inviteMessage ? 'Regenerar mensagem' : 'Gerar mensagem com IA'}>
                <IconButton
                  onClick={handleGenerateMessage}
                  disabled={generatingMessage}
                  size="small"
                  sx={{
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                    color: 'white',
                    width: 36,
                    height: 36,
                    '&:hover': {
                      background: 'linear-gradient(135deg, #7c3aed 0%, #db2777 100%)',
                    },
                    '&.Mui-disabled': { bgcolor: 'grey.200', color: 'grey.400' }
                  }}
                >
                  {generatingMessage ? <CircularProgress size={18} color="inherit" /> : <AIIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
            </Box>

            <Box
              sx={{
                border: '1px solid',
                borderColor: '#e5e7eb',
                borderRadius: 3,
                p: 2.5,
                bgcolor: 'white',
                minHeight: 200,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  whiteSpace: 'pre-wrap',
                  color: 'grey.600',
                  flex: 1,
                  mb: 2,
                  lineHeight: 1.8
                }}
              >
                {party.inviteMessage || `Olá, você é meu convidado para ${party.name}, no dia ${new Date(party.date).toLocaleDateString('pt-BR')} gostaria de saber se posso confirmar sua presença.`}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setRegenerateDialog(true)}
                  sx={{
                    borderRadius: 2,
                    borderColor: 'grey.300',
                    color: 'grey.600',
                    '&:hover': { borderColor: 'grey.400', bgcolor: 'grey.50' }
                  }}
                >
                  Editar
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={sendingTest ? <CircularProgress size={14} color="inherit" /> : <WhatsAppIcon />}
                  onClick={handleSendTest}
                  disabled={sendingTest || !party.inviteMessage}
                  sx={{
                    borderRadius: 2,
                    borderColor: '#25D366',
                    color: '#25D366',
                    '&:hover': { borderColor: '#128C7E', bgcolor: '#dcfce7' },
                    '&.Mui-disabled': { borderColor: 'grey.200', color: 'grey.400' }
                  }}
                >
                  Testar
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={sendingMessages ? <CircularProgress size={14} color="inherit" /> : <SendIcon />}
                  onClick={handleSendToAll}
                  disabled={sendingMessages || party.stats?.pendentes === 0}
                  sx={{
                    borderRadius: 2,
                    bgcolor: '#10b981',
                    '&:hover': { bgcolor: '#059669' },
                    '&.Mui-disabled': { bgcolor: 'grey.200' }
                  }}
                >
                  Enviar ({party.stats?.pendentes || 0})
                </Button>
              </Box>
            </Box>
          </Box>
        </Grid>
      </Grid>

      {/* Guests Table */}
      <Box
        sx={{
          bgcolor: 'white',
          borderRadius: 4,
          p: 3,
          border: '1px solid',
          borderColor: 'grey.100'
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: 'grey.800' }}>
            Convidados ({party.guests?.length || 0})
          </Typography>
          <IconButton
            onClick={loadParty}
            size="small"
            sx={{
              color: 'grey.400',
              '&:hover': { color: '#ec4899', bgcolor: '#fdf2f8' }
            }}
          >
            <RefreshIcon />
          </IconButton>
        </Box>

        <Tabs
          value={tab}
          onChange={(e, v) => setTab(v)}
          sx={{
            mb: 3,
            '& .MuiTabs-indicator': {
              bgcolor: '#ec4899',
              height: 3,
              borderRadius: 2
            },
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 500,
              color: 'grey.500',
              minWidth: 'auto',
              px: 2,
              '&.Mui-selected': {
                color: '#ec4899'
              }
            }
          }}
        >
          <Tab label={`Todos (${party.guests?.length || 0})`} />
          <Tab label={`Aguardando (${party.stats?.pendentes || 0})`} />
          <Tab label={`Confirmados (${party.stats?.confirmados || 0})`} />
          <Tab label={`Recusados (${party.stats?.recusados || 0})`} />
          <Tab label={`Conversar (${party.stats?.necessitaConversar || 0})`} />
        </Tabs>

        <TableContainer sx={{ borderRadius: 2, border: '1px solid', borderColor: 'grey.100' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 600, color: 'grey.600', borderBottom: '1px solid', borderColor: 'grey.100' }}>Nome</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'grey.600', borderBottom: '1px solid', borderColor: 'grey.100' }}>Telefone</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'grey.600', borderBottom: '1px solid', borderColor: 'grey.100' }}>Contato</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'grey.600', borderBottom: '1px solid', borderColor: 'grey.100' }}>Status</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, color: 'grey.600', borderBottom: '1px solid', borderColor: 'grey.100' }}>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredGuests().length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6, border: 'none' }}>
                    <Box sx={{ color: 'grey.400' }}>
                      <Typography variant="body2">
                        Nenhum convidado nesta categoria
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                filteredGuests().map((guest, index) => (
                  <TableRow
                    key={guest.id}
                    sx={{
                      '&:hover': { bgcolor: 'grey.50' },
                      '& td': {
                        borderBottom: index === filteredGuests().length - 1 ? 'none' : '1px solid',
                        borderColor: 'grey.100'
                      }
                    }}
                  >
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500, color: 'grey.800' }}>
                        {guest.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: 'grey.600' }}>
                        {guest.phone}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={guest.contactMethod}
                        size="small"
                        icon={<WhatsAppIcon sx={{ fontSize: 16 }} />}
                        sx={{
                          bgcolor: '#dcfce7',
                          color: '#16a34a',
                          fontWeight: 500,
                          fontSize: '0.75rem',
                          '& .MuiChip-icon': { color: '#16a34a' }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={statusConfig[guest.status]?.label}
                        size="small"
                        sx={{
                          bgcolor: statusConfig[guest.status]?.bgColor,
                          color: statusConfig[guest.status]?.color,
                          fontWeight: 500,
                          fontSize: '0.75rem'
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                        <Tooltip title="Confirmar">
                          <IconButton
                            size="small"
                            onClick={() => handleUpdateStatus(guest.id, 'CONFIRMOU_PRESENCA')}
                            sx={{
                              color: '#10b981',
                              '&:hover': { bgcolor: '#d1fae5' }
                            }}
                          >
                            <span style={{ fontSize: 14 }}>✓</span>
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Recusar">
                          <IconButton
                            size="small"
                            onClick={() => handleUpdateStatus(guest.id, 'RECUSOU_CONVITE')}
                            sx={{
                              color: '#ef4444',
                              '&:hover': { bgcolor: '#fee2e2' }
                            }}
                          >
                            <span style={{ fontSize: 14 }}>✗</span>
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Remover">
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteGuest(guest.id)}
                            sx={{
                              color: 'grey.400',
                              '&:hover': { bgcolor: '#fee2e2', color: '#ef4444' }
                            }}
                          >
                            <DeleteIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Message Dialog */}
      <Dialog
        open={messageDialog}
        onClose={() => setMessageDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 }
        }}
      >
        <DialogTitle sx={{ fontWeight: 600, color: 'grey.800' }}>
          Mensagem de Convite
        </DialogTitle>
        <DialogContent>
          <Box
            sx={{
              p: 2.5,
              mt: 1,
              bgcolor: 'grey.50',
              borderRadius: 2,
              whiteSpace: 'pre-wrap',
              color: 'grey.700',
              lineHeight: 1.7
            }}
          >
            {party.inviteMessage}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={() => setRegenerateDialog(true)}
            sx={{ color: 'grey.600' }}
          >
            Regenerar
          </Button>
          <Button
            onClick={() => setMessageDialog(false)}
            variant="contained"
            sx={{
              background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
              borderRadius: 2
            }}
          >
            Fechar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Regenerate Dialog */}
      <Dialog
        open={regenerateDialog}
        onClose={() => setRegenerateDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 }
        }}
      >
        <DialogTitle sx={{ fontWeight: 600, color: 'grey.800' }}>
          Regenerar Mensagem
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Instruções adicionais"
            placeholder="Ex: Seja mais formal, inclua informações sobre estacionamento..."
            value={regenerateInstructions}
            onChange={(e) => setRegenerateInstructions(e.target.value)}
            sx={{
              mt: 2,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                '&:hover fieldset': { borderColor: '#ec4899' },
                '&.Mui-focused fieldset': { borderColor: '#ec4899' }
              },
              '& .MuiInputLabel-root.Mui-focused': { color: '#ec4899' }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={() => setRegenerateDialog(false)}
            sx={{ color: 'grey.600' }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleRegenerateMessage}
            variant="contained"
            disabled={generatingMessage}
            sx={{
              background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
              borderRadius: 2,
              '&.Mui-disabled': { bgcolor: 'grey.200' }
            }}
          >
            {generatingMessage ? 'Gerando...' : 'Regenerar com IA'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Guest Dialog */}
      <Dialog
        open={addGuestDialog}
        onClose={() => {
          setAddGuestDialog(false);
          setNewGuests([{ name: '', phone: '', contactMethod: 'WHATSAPP' }]);
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 }
        }}
      >
        <DialogTitle sx={{ fontWeight: 600, color: 'grey.800' }}>
          Adicionar Convidado
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            {newGuests.map((guest, index) => (
              <Box key={index} sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
                <TextField
                  label="Nome"
                  value={guest.name}
                  onChange={(e) => handleGuestChange(index, 'name', e.target.value)}
                  sx={{
                    flex: 1,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      '&:hover fieldset': { borderColor: '#ec4899' },
                      '&.Mui-focused fieldset': { borderColor: '#ec4899' }
                    },
                    '& .MuiInputLabel-root.Mui-focused': { color: '#ec4899' }
                  }}
                  size="small"
                />
                <TextField
                  label="Telefone"
                  value={guest.phone}
                  onChange={(e) => handleGuestChange(index, 'phone', e.target.value)}
                  placeholder="(11) 99999-9999"
                  sx={{
                    flex: 1,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      '&:hover fieldset': { borderColor: '#ec4899' },
                      '&.Mui-focused fieldset': { borderColor: '#ec4899' }
                    },
                    '& .MuiInputLabel-root.Mui-focused': { color: '#ec4899' }
                  }}
                  size="small"
                />
                {newGuests.length > 1 && (
                  <IconButton
                    size="small"
                    onClick={() => handleRemoveGuestRow(index)}
                    sx={{
                      color: 'grey.400',
                      '&:hover': { color: '#ef4444', bgcolor: '#fee2e2' }
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>
            ))}
            </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, justifyContent: 'space-between' }}>
          <IconButton
            onClick={handleAddGuestRow}
            size="small"
            sx={{
              width: 36,
              height: 36,
              border: '2px dashed',
              borderColor: 'grey.300',
              borderRadius: '50%',
              color: 'grey.500',
              '&:hover': {
                borderColor: '#ec4899',
                color: '#ec4899',
                bgcolor: '#fdf2f8'
              }
            }}
          >
            <span style={{ fontSize: 22, fontWeight: 300, lineHeight: 1 }}>+</span>
          </IconButton>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              onClick={() => {
                setAddGuestDialog(false);
                setNewGuests([{ name: '', phone: '', contactMethod: 'WHATSAPP' }]);
              }}
              sx={{ color: 'grey.600' }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAddGuest}
              variant="contained"
              sx={{
                background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
                borderRadius: 2
              }}
            >
              Adicionar
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Upgrade Dialog */}
      <UpgradeDialog
        open={upgradeDialog}
        onClose={() => setUpgradeDialog(false)}
        party={party}
        onSuccess={() => {
          setUpgradeDialog(false);
          loadParty();
        }}
      />

      {/* Snackbar */}
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
