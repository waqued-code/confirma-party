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
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
        <IconButton onClick={() => navigate(`/parties/${id}`)}>
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4" fontWeight={600}>
            Dashboard - {party.name}
          </Typography>
          <Typography color="text.secondary">
            {party.partyType} • {new Date(party.date).toLocaleDateString('pt-BR')}
          </Typography>
        </Box>
        <IconButton onClick={loadDashboard}>
          <RefreshIcon />
        </IconButton>
      </Box>

      {/* Stats Overview */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Taxa de Confirmação
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                  <CircularProgress
                    variant="determinate"
                    value={confirmationRate}
                    size={80}
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
                    <Typography variant="h5" fontWeight={600}>
                      {confirmationRate}%
                    </Typography>
                  </Box>
                </Box>
                <Box>
                  <Typography variant="h3" fontWeight={700} color="success.main">
                    {stats.confirmados}
                  </Typography>
                  <Typography color="text.secondary">
                    de {stats.total} convidados
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Resumo de Status
              </Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                {Object.entries(statusConfig).map(([status, config]) => (
                  <Grid item xs={6} md={3} key={status}>
                    <Paper
                      sx={{
                        p: 2,
                        textAlign: 'center',
                        bgcolor: config.bgColor,
                        border: 'none',
                      }}
                      variant="outlined"
                    >
                      <Typography variant="h4" fontWeight={700} color={`${config.color}.main`}>
                        {stats[status === 'NAO_RESPONDEU' ? 'pendentes' :
                          status === 'CONFIRMOU_PRESENCA' ? 'confirmados' :
                          status === 'RECUSOU_CONVITE' ? 'recusados' :
                          'necessitaConversar']}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
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
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Progresso das Confirmações
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ flexGrow: 1 }}>
              <LinearProgress
                variant="determinate"
                value={(stats.confirmados / stats.total) * 100 || 0}
                sx={{
                  height: 20,
                  borderRadius: 2,
                  bgcolor: 'grey.200',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: 'success.main',
                  },
                }}
              />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 100 }}>
              {stats.confirmados} / {stats.total}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 3, mt: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 12, height: 12, bgcolor: 'success.main', borderRadius: '50%' }} />
              <Typography variant="caption">Confirmados ({stats.confirmados})</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 12, height: 12, bgcolor: 'warning.main', borderRadius: '50%' }} />
              <Typography variant="caption">Pendentes ({stats.pendentes})</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 12, height: 12, bgcolor: 'error.main', borderRadius: '50%' }} />
              <Typography variant="caption">Recusados ({stats.recusados})</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 12, height: 12, bgcolor: 'info.main', borderRadius: '50%' }} />
              <Typography variant="caption">Conversar ({stats.necessitaConversar})</Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Guest Lists by Status */}
      <Grid container spacing={3}>
        {Object.entries(statusConfig).map(([status, config]) => (
          <Grid item xs={12} md={6} key={status}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Chip
                    icon={config.icon}
                    label={config.label}
                    color={config.color}
                    size="small"
                  />
                  <Typography variant="body2" color="text.secondary">
                    ({guestsByStatus[status]?.length || 0})
                  </Typography>
                </Box>

                {guestsByStatus[status]?.length === 0 ? (
                  <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                    Nenhum convidado
                  </Typography>
                ) : (
                  <List dense sx={{ maxHeight: 300, overflow: 'auto' }}>
                    {guestsByStatus[status]?.map((guest) => (
                      <ListItem key={guest.id}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: `${config.color}.light` }}>
                            <PersonIcon color={config.color} />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={guest.name}
                          secondary={guest.phone}
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
      <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center' }}>
        <Button
          variant="outlined"
          onClick={() => navigate(`/parties/${id}`)}
        >
          Voltar aos Detalhes
        </Button>
        <Button
          variant="contained"
          onClick={() => window.print()}
        >
          Imprimir Dashboard
        </Button>
      </Box>
    </Box>
  );
}
