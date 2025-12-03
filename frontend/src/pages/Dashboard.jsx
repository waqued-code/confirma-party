import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Skeleton,
} from '@mui/material';
import {
  Celebration as CelebrationIcon,
  People as PeopleIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { partyService } from '../services/party.service';
import { useAuth } from '../contexts/AuthContext';

export default function Dashboard() {
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
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

  const stats = parties.reduce(
    (acc, party) => ({
      totalParties: acc.totalParties + 1,
      totalGuests: acc.totalGuests + party.stats.total,
      confirmed: acc.confirmed + party.stats.confirmados,
      declined: acc.declined + party.stats.recusados,
    }),
    { totalParties: 0, totalGuests: 0, confirmed: 0, declined: 0 }
  );

  const StatCard = ({ title, value, icon, color }) => (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              bgcolor: `${color}.light`,
              color: `${color}.main`,
              display: 'flex',
            }}
          >
            {icon}
          </Box>
          <Box>
            <Typography color="text.secondary" variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" fontWeight={600}>
              {loading ? <Skeleton width={50} /> : value}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight={600}>
            Olá, {user?.name?.split(' ')[0]}!
          </Typography>
          <Typography color="text.secondary">
            Bem-vindo ao seu painel de festas
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/parties/new')}
        >
          Nova Festa
        </Button>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total de Festas"
            value={stats.totalParties}
            icon={<CelebrationIcon />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total de Convidados"
            value={stats.totalGuests}
            icon={<PeopleIcon />}
            color="secondary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Confirmados"
            value={stats.confirmed}
            icon={<CheckCircleIcon />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Recusados"
            value={stats.declined}
            icon={<CancelIcon />}
            color="error"
          />
        </Grid>
      </Grid>

      <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
        Próximas Festas
      </Typography>

      {loading ? (
        <Grid container spacing={3}>
          {[1, 2, 3].map((i) => (
            <Grid item xs={12} md={4} key={i}>
              <Skeleton variant="rectangular" height={180} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      ) : parties.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <CelebrationIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Nenhuma festa cadastrada
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Crie sua primeira festa e comece a confirmar presenças!
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/parties/new')}
            >
              Criar Festa
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {parties.slice(0, 6).map((party) => (
            <Grid item xs={12} md={4} key={party.id}>
              <Card
                sx={{
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  },
                }}
                onClick={() => navigate(`/parties/${party.id}`)}
              >
                <CardContent>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    {party.name}
                  </Typography>
                  <Typography color="text.secondary" variant="body2" gutterBottom>
                    {party.partyType} •{' '}
                    {new Date(party.date).toLocaleDateString('pt-BR')}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                    <Box>
                      <Typography variant="h5" color="success.main" fontWeight={600}>
                        {party.stats.confirmados}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Confirmados
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="h5" color="warning.main" fontWeight={600}>
                        {party.stats.pendentes}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Pendentes
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="h5" color="error.main" fontWeight={600}>
                        {party.stats.recusados}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Recusados
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
