import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  IconButton,
  Chip,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Dashboard as DashboardIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material';
import { partyService } from '../services/party.service';

export default function Parties() {
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, party: null });
  const navigate = useNavigate();

  useEffect(() => {
    loadParties();
  }, []);

  const loadParties = async () => {
    try {
      const response = await partyService.getAll();
      setParties(response.data);
    } catch (error) {
      console.error('Erro ao carregar festas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await partyService.delete(deleteDialog.party.id);
      setParties(parties.filter((p) => p.id !== deleteDialog.party.id));
      setDeleteDialog({ open: false, party: null });
    } catch (error) {
      console.error('Erro ao excluir festa:', error);
    }
  };

  const getPartyTypeColor = (type) => {
    const colors = {
      Casamento: 'secondary',
      'Aniversário': 'primary',
      Corporativo: 'info',
      Formatura: 'success',
      'Chá de Bebê': 'warning',
    };
    return colors[type] || 'default';
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" fontWeight={600}>
          Minhas Festas
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/parties/new')}
        >
          Nova Festa
        </Button>
      </Box>

      {loading ? (
        <Grid container spacing={3}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Grid item xs={12} md={6} lg={4} key={i}>
              <Skeleton variant="rectangular" height={220} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      ) : parties.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Você ainda não tem festas cadastradas
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/parties/new')}
              sx={{ mt: 2 }}
            >
              Criar Primeira Festa
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {parties.map((party) => (
            <Grid item xs={12} md={6} lg={4} key={party.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Chip
                      label={party.partyType}
                      color={getPartyTypeColor(party.partyType)}
                      size="small"
                    />
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => setDeleteDialog({ open: true, party })}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>

                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    {party.name}
                  </Typography>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <CalendarIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                      {new Date(party.date).toLocaleDateString('pt-BR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </Typography>
                  </Box>

                  <Grid container spacing={1}>
                    <Grid item xs={3}>
                      <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
                        <Typography variant="h6" fontWeight={600}>
                          {party.stats.total}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Total
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={3}>
                      <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'success.light', borderRadius: 1 }}>
                        <Typography variant="h6" fontWeight={600} color="success.dark">
                          {party.stats.confirmados}
                        </Typography>
                        <Typography variant="caption" color="success.dark">
                          Sim
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={3}>
                      <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'warning.light', borderRadius: 1 }}>
                        <Typography variant="h6" fontWeight={600} color="warning.dark">
                          {party.stats.pendentes}
                        </Typography>
                        <Typography variant="caption" color="warning.dark">
                          Aguard.
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={3}>
                      <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'error.light', borderRadius: 1 }}>
                        <Typography variant="h6" fontWeight={600} color="error.dark">
                          {party.stats.recusados}
                        </Typography>
                        <Typography variant="caption" color="error.dark">
                          Não
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>

                <CardActions sx={{ px: 2, pb: 2 }}>
                  <Button
                    variant="outlined"
                    startIcon={<ViewIcon />}
                    onClick={() => navigate(`/parties/${party.id}`)}
                    fullWidth
                  >
                    Detalhes
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<DashboardIcon />}
                    onClick={() => navigate(`/parties/${party.id}/dashboard`)}
                    fullWidth
                  >
                    Dashboard
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, party: null })}
      >
        <DialogTitle>Excluir Festa</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Tem certeza que deseja excluir a festa "{deleteDialog.party?.name}"?
            Esta ação não pode ser desfeita e todos os convidados serão removidos.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, party: null })}>
            Cancelar
          </Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
