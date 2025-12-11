import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  IconButton,
  CircularProgress,
  Button,
  Paper,
  LinearProgress,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Person as PersonIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  HourglassEmpty as PendingIcon,
  QuestionAnswer as TalkIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { partyService } from '../services/party.service';

const statusConfig = {
  NAO_RESPONDEU: {
    label: 'Aguardando Resposta',
    color: 'warning',
    icon: <PendingIcon />,
    bgColor: '#fff3e0',
  },
  CONFIRMOU_PRESENCA: {
    label: 'Confirmaram Presença',
    color: 'success',
    icon: <CheckCircleIcon />,
    bgColor: '#e8f5e9',
  },
  RECUSOU_CONVITE: {
    label: 'Recusaram Convite',
    color: 'error',
    icon: <CancelIcon />,
    bgColor: '#ffebee',
  },
  NECESSITA_CONVERSAR: {
    label: 'Precisam Conversar',
    color: 'info',
    icon: <TalkIcon />,
    bgColor: '#e3f2fd',
  },
};

export default function PartyDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, [id]);

  const loadDashboard = async () => {
    try {
      const response = await partyService.getDashboard(id);
      setDashboard(response.data);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!dashboard) {
    return (
      <Typography color="error">Erro ao carregar dashboard</Typography>
    );
  }

  const { party, stats, guestsByStatus } = dashboard;
  const confirmationRate = stats.total > 0
    ? Math.round((stats.confirmados / stats.total) * 100)
    : 0;

  return (
    <Box sx={{ overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 3 }}>
        <IconButton onClick={() => navigate(`/parties/${id}`)} sx={{ mt: 0.5 }}>
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography
            variant="h5"
            fontWeight={600}
            sx={{
              fontSize: { xs: '1.25rem', sm: '1.5rem' },
              wordBreak: 'break-word'
            }}
          >
            Dashboard - {party.name}
          </Typography>
          <Typography color="text.secondary" variant="body2">
            {party.partyType} • {new Date(party.date).toLocaleDateString('pt-BR')}
          </Typography>
        </Box>
        <IconButton onClick={loadDashboard}>
          <RefreshIcon />
        </IconButton>
      </Box>

      {/* Stats Overview */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <Card>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Taxa de Confirmação
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                  <CircularProgress
                    variant="determinate"
                    value={confirmationRate}
                    size={60}
                    thickness={4}
                    color="success"
                  />
                  <Box
                    sx={{
                      top: 0,
                      left: 0,
                      bottom: 0,
                      right: 0,
                      position: 'absolute',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Typography variant="body1" fontWeight={600}>
                      {confirmationRate}%
                    </Typography>
                  </Box>
                </Box>
                <Box>
                  <Typography variant="h4" fontWeight={700} color="success.main">
                    {stats.confirmados}
                  </Typography>
                  <Typography color="text.secondary" variant="body2">
                    de {stats.total} convidados
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Resumo de Status
              </Typography>
              <Grid container spacing={1.5}>
                {Object.entries(statusConfig).map(([status, config]) => (
                  <Grid item xs={6} sm={3} key={status}>
                    <Paper
                      sx={{
                        p: 1.5,
                        textAlign: 'center',
                        bgcolor: config.bgColor,
                        border: 'none',
                      }}
                      variant="outlined"
                    >
                      <Typography
                        variant="h5"
                        fontWeight={700}
                        color={`${config.color}.main`}
                        sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}
                      >
                        {stats[status === 'NAO_RESPONDEU' ? 'pendentes' :
                          status === 'CONFIRMOU_PRESENCA' ? 'confirmados' :
                          status === 'RECUSOU_CONVITE' ? 'recusados' :
                          'necessitaConversar']}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}
                      >
                        {config.label.split(' ')[0]}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Progress Bar */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Progresso das Confirmações
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ flexGrow: 1 }}>
              <LinearProgress
                variant="determinate"
                value={(stats.confirmados / stats.total) * 100 || 0}
                sx={{
                  height: 16,
                  borderRadius: 2,
                  bgcolor: 'grey.200',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: 'success.main',
                  },
                }}
              />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 60, textAlign: 'right' }}>
              {stats.confirmados}/{stats.total}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 1.5, sm: 3 }, mt: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 10, height: 10, bgcolor: 'success.main', borderRadius: '50%' }} />
              <Typography variant="caption" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                Confirmados ({stats.confirmados})
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 10, height: 10, bgcolor: 'warning.main', borderRadius: '50%' }} />
              <Typography variant="caption" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                Pendentes ({stats.pendentes})
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 10, height: 10, bgcolor: 'error.main', borderRadius: '50%' }} />
              <Typography variant="caption" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                Recusados ({stats.recusados})
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 10, height: 10, bgcolor: 'info.main', borderRadius: '50%' }} />
              <Typography variant="caption" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                Conversar ({stats.necessitaConversar})
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Guest Lists by Status */}
      <Grid container spacing={2}>
        {Object.entries(statusConfig).map(([status, config]) => (
          <Grid item xs={12} sm={6} key={status}>
            <Card>
              <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Chip
                    icon={config.icon}
                    label={config.label}
                    color={config.color}
                    size="small"
                    sx={{ fontSize: { xs: '0.7rem', sm: '0.8125rem' } }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    ({guestsByStatus[status]?.length || 0})
                  </Typography>
                </Box>

                {guestsByStatus[status]?.length === 0 ? (
                  <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }} variant="body2">
                    Nenhum convidado
                  </Typography>
                ) : (
                  <List dense sx={{ maxHeight: 250, overflow: 'auto' }}>
                    {guestsByStatus[status]?.map((guest) => (
                      <ListItem key={guest.id} sx={{ px: 0 }}>
                        <ListItemAvatar sx={{ minWidth: 40 }}>
                          <Avatar sx={{ bgcolor: `${config.color}.light`, width: 32, height: 32 }}>
                            <PersonIcon color={config.color} sx={{ fontSize: 18 }} />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={guest.name}
                          secondary={guest.phone}
                          primaryTypographyProps={{ variant: 'body2' }}
                          secondaryTypographyProps={{ variant: 'caption' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Actions */}
      <Box sx={{ mt: 3, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, justifyContent: 'center' }}>
        <Button
          variant="outlined"
          onClick={() => navigate(`/parties/${id}`)}
          fullWidth
          sx={{ maxWidth: { sm: 200 } }}
        >
          Voltar aos Detalhes
        </Button>
        <Button
          variant="contained"
          onClick={() => window.print()}
          fullWidth
          sx={{ maxWidth: { sm: 200 } }}
        >
          Imprimir Dashboard
        </Button>
      </Box>
    </Box>
  );
}
