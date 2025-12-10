import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { SentimentDissatisfied as SadIcon } from '@mui/icons-material';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
        p: 3,
        textAlign: 'center',
      }}
    >
      <SadIcon sx={{ fontSize: 80, color: 'white', mb: 2, opacity: 0.9 }} />
      <Typography
        variant="h1"
        sx={{
          fontSize: { xs: '4rem', md: '6rem' },
          fontWeight: 700,
          color: 'white',
          mb: 1,
        }}
      >
        404
      </Typography>
      <Typography
        variant="h5"
        sx={{
          color: 'rgba(255,255,255,0.9)',
          mb: 1,
          fontWeight: 500,
        }}
      >
        Ops! Página não encontrada
      </Typography>
      <Typography
        sx={{
          color: 'rgba(255,255,255,0.7)',
          mb: 4,
          maxWidth: 400,
        }}
      >
        A página que você está procurando não existe ou foi movida.
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Button
          variant="contained"
          onClick={() => navigate(-1)}
          sx={{
            bgcolor: 'white',
            color: '#ec4899',
            px: 4,
            py: 1.5,
            borderRadius: '100px',
            fontWeight: 600,
            '&:hover': {
              bgcolor: 'rgba(255,255,255,0.9)',
            },
          }}
        >
          Voltar
        </Button>
        <Button
          variant="outlined"
          onClick={() => navigate('/dashboard')}
          sx={{
            borderColor: 'white',
            color: 'white',
            px: 4,
            py: 1.5,
            borderRadius: '100px',
            fontWeight: 600,
            '&:hover': {
              bgcolor: 'rgba(255,255,255,0.1)',
              borderColor: 'white',
            },
          }}
        >
          Ir para o Dashboard
        </Button>
      </Box>
    </Box>
  );
}
