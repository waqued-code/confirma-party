import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Avatar,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Switch,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import {
  People as PeopleIcon,
  Celebration as CelebrationIcon,
  Message as MessageIcon,
  WhatsApp as WhatsAppIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  AdminPanelSettings as AdminIcon,
  TrendingUp as TrendingIcon,
} from '@mui/icons-material';
import { adminService } from '../services/admin.service';
import { useAuth } from '../contexts/AuthContext';

// Componente de Card de Estatística
function StatCard({ title, value, icon, color, subtitle }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography color="text.secondary" variant="body2" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" fontWeight={600}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          <Avatar sx={{ bgcolor: `${color}.light`, color: `${color}.main`, width: 56, height: 56 }}>
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );
}

// Formatar status de convidado
const guestStatusLabels = {
  NAO_RESPONDEU: { label: 'Não respondeu', color: 'default' },
  CONFIRMOU_PRESENCA: { label: 'Confirmado', color: 'success' },
  RECUSOU_CONVITE: { label: 'Recusou', color: 'error' },
  NECESSITA_CONVERSAR: { label: 'Precisa conversar', color: 'warning' },
};

// Formatar plano
const planLabels = {
  GRATUITO: { label: 'Gratuito', color: 'default' },
  FESTA: { label: 'Festa', color: 'primary' },
  CELEBRACAO: { label: 'Celebração', color: 'secondary' },
  PERSONALIZADO: { label: 'Personalizado', color: 'success' },
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [users, setUsers] = useState([]);
  const [parties, setParties] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [adminDialog, setAdminDialog] = useState({ open: false, user: null });

  // Redireciona se não for admin
  useEffect(() => {
    if (user && !user.isAdmin) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Carrega dados
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashboardRes, usersRes, partiesRes] = await Promise.all([
        adminService.getDashboard(),
        adminService.getAllUsers(),
        adminService.getAllParties(),
      ]);
      setDashboard(dashboardRes.data);
      setUsers(usersRes.data);
      setParties(partiesRes.data);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setError(err.response?.data?.error || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAdmin = async (targetUser) => {
    try {
      await adminService.toggleUserAdmin(targetUser.id, !targetUser.isAdmin);
      setUsers(users.map(u =>
        u.id === targetUser.id ? { ...u, isAdmin: !u.isAdmin } : u
      ));
      setAdminDialog({ open: false, user: null });
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao atualizar admin');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
        <Button onClick={loadData} sx={{ ml: 2 }}>Tentar novamente</Button>
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            Painel Administrativo
          </Typography>
          <Typography color="text.secondary">
            Visão geral da plataforma Confirma.Party
          </Typography>
        </Box>
        <Tooltip title="Atualizar dados">
          <IconButton onClick={loadData}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Cards de estatísticas */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total de Usuários"
            value={dashboard?.overview?.totalUsers || 0}
            icon={<PeopleIcon />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total de Festas"
            value={dashboard?.overview?.totalParties || 0}
            icon={<CelebrationIcon />}
            color="secondary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total de Convidados"
            value={dashboard?.overview?.totalGuests || 0}
            icon={<PeopleIcon />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Mensagens Enviadas"
            value={dashboard?.overview?.totalMessages || 0}
            icon={<MessageIcon />}
            color="info"
            subtitle={`${dashboard?.overview?.messagesLastWeek || 0} nos últimos 7 dias`}
          />
        </Grid>
      </Grid>

      {/* Status do WhatsApp */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <WhatsAppIcon sx={{
              fontSize: 40,
              color: dashboard?.whatsappStatus?.status === 'connected' ? 'success.main' : 'grey.400'
            }} />
            <Box>
              <Typography variant="h6">Status do WhatsApp</Typography>
              <Chip
                icon={dashboard?.whatsappStatus?.status === 'connected' ? <CheckIcon /> : <CloseIcon />}
                label={dashboard?.whatsappStatus?.status === 'connected' ? 'Conectado' : 'Desconectado'}
                color={dashboard?.whatsappStatus?.status === 'connected' ? 'success' : 'default'}
                size="small"
              />
              {dashboard?.whatsappStatus?.phoneNumber && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Número: {dashboard.whatsappStatus.phoneNumber}
                </Typography>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Estatísticas de Convidados por Status */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Convidados por Status
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2 }}>
                {Object.entries(dashboard?.guestStats?.byStatus || {}).map(([status, count]) => (
                  <Chip
                    key={status}
                    label={`${guestStatusLabels[status]?.label || status}: ${count}`}
                    color={guestStatusLabels[status]?.color || 'default'}
                    variant="outlined"
                  />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Festas por Plano
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2 }}>
                {Object.entries(dashboard?.planStats || {}).map(([plan, count]) => (
                  <Chip
                    key={plan}
                    label={`${planLabels[plan]?.label || plan}: ${count}`}
                    color={planLabels[plan]?.color || 'default'}
                    variant="outlined"
                  />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs de Detalhes */}
      <Card>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label={`Usuários (${users.length})`} />
          <Tab label={`Festas (${parties.length})`} />
          <Tab label="Usuários Recentes" />
        </Tabs>

        {/* Tab Usuários */}
        {activeTab === 0 && (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Usuário</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Telefone</TableCell>
                  <TableCell align="center">Festas</TableCell>
                  <TableCell align="center">Convidados</TableCell>
                  <TableCell align="center">Admin</TableCell>
                  <TableCell>Cadastro</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                          {u.name?.charAt(0).toUpperCase()}
                        </Avatar>
                        {u.name}
                      </Box>
                    </TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{u.phone || '-'}</TableCell>
                    <TableCell align="center">{u.partyCount}</TableCell>
                    <TableCell align="center">{u.totalGuests}</TableCell>
                    <TableCell align="center">
                      <Tooltip title={u.isAdmin ? 'Remover admin' : 'Tornar admin'}>
                        <Switch
                          checked={u.isAdmin}
                          onChange={() => setAdminDialog({ open: true, user: u })}
                          color="primary"
                          size="small"
                        />
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Tab Festas */}
        {activeTab === 1 && (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Festa</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Usuário</TableCell>
                  <TableCell align="center">Plano</TableCell>
                  <TableCell align="center">Convidados</TableCell>
                  <TableCell align="center">Mensagens</TableCell>
                  <TableCell>Data</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {parties.map((p) => (
                  <TableRow key={p.id} hover>
                    <TableCell>
                      <Typography fontWeight={500}>{p.name}</Typography>
                    </TableCell>
                    <TableCell>{p.partyType}</TableCell>
                    <TableCell>
                      <Typography variant="body2">{p.userName}</Typography>
                      <Typography variant="caption" color="text.secondary">{p.userEmail}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={planLabels[p.plan]?.label || p.plan}
                        color={planLabels[p.plan]?.color || 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      {p.guestCount} / {p.guestLimit}
                    </TableCell>
                    <TableCell align="center">{p.messageCount}</TableCell>
                    <TableCell>
                      {new Date(p.date).toLocaleDateString('pt-BR')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Tab Usuários Recentes */}
        {activeTab === 2 && (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Usuário</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Cadastrado em</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {dashboard?.recentUsers?.map((u) => (
                  <TableRow key={u.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'success.main' }}>
                          {u.name?.charAt(0).toUpperCase()}
                        </Avatar>
                        {u.name}
                      </Box>
                    </TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      {new Date(u.createdAt).toLocaleString('pt-BR')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      {/* Dialog de confirmação de admin */}
      <Dialog open={adminDialog.open} onClose={() => setAdminDialog({ open: false, user: null })}>
        <DialogTitle>
          {adminDialog.user?.isAdmin ? 'Remover Admin' : 'Tornar Admin'}
        </DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja {adminDialog.user?.isAdmin ? 'remover o status de admin de' : 'tornar admin o usuário'}{' '}
            <strong>{adminDialog.user?.name}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdminDialog({ open: false, user: null })}>
            Cancelar
          </Button>
          <Button
            onClick={() => handleToggleAdmin(adminDialog.user)}
            color={adminDialog.user?.isAdmin ? 'error' : 'primary'}
            variant="contained"
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
