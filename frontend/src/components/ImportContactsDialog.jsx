import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Checkbox,
  CircularProgress,
  Alert,
  Divider,
  Chip,
} from '@mui/material';
import {
  ContactPhone as ContactPhoneIcon,
  Google as GoogleIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Warning as WarningIcon,
  FileUpload as FileUploadIcon,
} from '@mui/icons-material';
import { validatePhone } from '../utils/phoneValidator';

// Google API configuration - these should be set in your environment
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

export default function ImportContactsDialog({ open, onClose, onImport }) {
  const [step, setStep] = useState('select'); // 'select', 'loading', 'contacts'
  const [contacts, setContacts] = useState([]);
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [source, setSource] = useState(null);
  const fileInputRef = useRef(null);

  // Check if Contact Picker API is available (only Chrome Android)
  const hasContactPicker = 'contacts' in navigator && 'ContactsManager' in window;

  // Detect iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  useEffect(() => {
    if (!open) {
      // Reset state when dialog closes
      setStep('select');
      setContacts([]);
      setSelectedContacts([]);
      setError(null);
      setSource(null);
    }
  }, [open]);

  // Import from device contacts using Contact Picker API
  const handleDeviceContacts = async () => {
    if (!hasContactPicker) {
      setError('Seu navegador não suporta acesso aos contatos do dispositivo. Use o Chrome no Android ou adicione contatos manualmente.');
      return;
    }

    setLoading(true);
    setError(null);
    setSource('device');

    try {
      const props = ['name', 'tel'];
      const opts = { multiple: true };
      const pickedContacts = await navigator.contacts.select(props, opts);

      const formattedContacts = pickedContacts
        .filter(contact => contact.tel && contact.tel.length > 0)
        .map((contact, index) => {
          const phoneResult = formatAndValidatePhone(contact.tel[0]);
          return {
            id: `device-${index}`,
            name: contact.name?.[0] || 'Sem nome',
            phone: phoneResult.phone,
            phoneFormatted: phoneResult.formatted,
            phoneValid: phoneResult.valid,
            phoneError: phoneResult.error,
            source: 'device',
          };
        });

      if (formattedContacts.length === 0) {
        setError('Nenhum contato com telefone foi selecionado.');
        setStep('select');
      } else {
        setContacts(formattedContacts);
        setStep('contacts');
      }
    } catch (err) {
      console.error('Error picking contacts:', err);
      if (err.name === 'TypeError') {
        setError('Acesso aos contatos não disponível neste navegador.');
      } else {
        setError('Erro ao acessar contatos do dispositivo.');
      }
      setStep('select');
    } finally {
      setLoading(false);
    }
  };

  // Import from Google Contacts
  const handleGoogleContacts = async () => {
    if (!GOOGLE_CLIENT_ID) {
      setError('Google API não configurada. Entre em contato com o suporte.');
      return;
    }

    setLoading(true);
    setError(null);
    setSource('google');

    try {
      // Load Google Identity Services
      await loadGoogleScript();

      // Initialize token client
      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/contacts.readonly',
        callback: async (response) => {
          if (response.error) {
            setError('Erro na autenticação com Google.');
            setLoading(false);
            setStep('select');
            return;
          }

          try {
            // Fetch contacts from People API
            const contactsResponse = await fetch(
              'https://people.googleapis.com/v1/people/me/connections?' +
              'personFields=names,phoneNumbers&pageSize=1000',
              {
                headers: {
                  Authorization: `Bearer ${response.access_token}`,
                },
              }
            );

            const data = await contactsResponse.json();

            if (!data.connections || data.connections.length === 0) {
              setError('Nenhum contato encontrado na sua conta Google.');
              setStep('select');
              return;
            }

            const formattedContacts = data.connections
              .filter(person => person.phoneNumbers && person.phoneNumbers.length > 0)
              .map((person, index) => {
                const phoneResult = formatAndValidatePhone(person.phoneNumbers[0].value);
                return {
                  id: `google-${index}`,
                  name: person.names?.[0]?.displayName || 'Sem nome',
                  phone: phoneResult.phone,
                  phoneFormatted: phoneResult.formatted,
                  phoneValid: phoneResult.valid,
                  phoneError: phoneResult.error,
                  source: 'google',
                };
              });

            if (formattedContacts.length === 0) {
              setError('Nenhum contato com telefone encontrado.');
              setStep('select');
            } else {
              setContacts(formattedContacts);
              setStep('contacts');
            }
          } catch (fetchError) {
            console.error('Error fetching contacts:', fetchError);
            setError('Erro ao buscar contatos do Google.');
            setStep('select');
          } finally {
            setLoading(false);
          }
        },
      });

      tokenClient.requestAccessToken();
    } catch (err) {
      console.error('Error with Google auth:', err);
      setError('Erro ao conectar com Google.');
      setLoading(false);
      setStep('select');
    }
  };

  // Load Google Identity Services script
  const loadGoogleScript = () => {
    return new Promise((resolve, reject) => {
      if (window.google?.accounts) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = resolve;
      script.onerror = reject;
      document.body.appendChild(script);
    });
  };

  // Parse VCF (vCard) file
  const parseVCF = (vcfText) => {
    const contacts = [];
    const vcards = vcfText.split('END:VCARD');

    vcards.forEach((vcard, index) => {
      if (!vcard.includes('BEGIN:VCARD')) return;

      let name = 'Sem nome';
      let phone = null;

      // Extract name (FN field has priority, then N field)
      const fnMatch = vcard.match(/FN[;:][^\r\n]*?:?([^\r\n]+)/i);
      if (fnMatch) {
        name = fnMatch[1].trim();
      } else {
        const nMatch = vcard.match(/^N[;:][^\r\n]*?:?([^\r\n]+)/im);
        if (nMatch) {
          const nameParts = nMatch[1].split(';');
          name = [nameParts[1], nameParts[0]].filter(Boolean).join(' ').trim() || 'Sem nome';
        }
      }

      // Extract phone (TEL field)
      const telMatch = vcard.match(/TEL[;:][^\r\n]*?:?([+\d\s\-()]+)/i);
      if (telMatch) {
        phone = telMatch[1].trim();
      }

      if (phone) {
        const phoneResult = formatAndValidatePhone(phone);
        contacts.push({
          id: `vcf-${index}`,
          name: name,
          phone: phoneResult.phone,
          phoneFormatted: phoneResult.formatted,
          phoneValid: phoneResult.valid,
          phoneError: phoneResult.error,
          source: 'vcf',
        });
      }
    });

    return contacts;
  };

  // Handle VCF file upload
  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setSource('vcf');

    try {
      const text = await file.text();
      const parsedContacts = parseVCF(text);

      if (parsedContacts.length === 0) {
        setError('Nenhum contato com telefone encontrado no arquivo.');
        setStep('select');
      } else {
        setContacts(parsedContacts);
        setStep('contacts');
      }
    } catch (err) {
      console.error('Error parsing VCF:', err);
      setError('Erro ao ler o arquivo. Verifique se é um arquivo .vcf válido.');
      setStep('select');
    } finally {
      setLoading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleToggleContact = (contact) => {
    // Don't allow selecting invalid contacts
    if (!contact.phoneValid) return;

    const isSelected = selectedContacts.some(c => c.id === contact.id);
    if (isSelected) {
      setSelectedContacts(selectedContacts.filter(c => c.id !== contact.id));
    } else {
      setSelectedContacts([...selectedContacts, contact]);
    }
  };

  const handleSelectAll = () => {
    const validContacts = contacts.filter(c => c.phoneValid);
    if (selectedContacts.length === validContacts.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts([...validContacts]);
    }
  };

  const handleImport = () => {
    // Only import valid contacts
    const validContacts = selectedContacts.filter(c => c.phoneValid);
    const formattedGuests = validContacts.map(contact => ({
      name: contact.name,
      phone: contact.phone,
      contactMethod: 'WHATSAPP',
    }));

    onImport(formattedGuests);
    onClose();
  };

  // Count valid and invalid contacts
  const validContactsCount = contacts.filter(c => c.phoneValid).length;
  const invalidContactsCount = contacts.length - validContactsCount;
  const selectedValidCount = selectedContacts.filter(c => c.phoneValid).length;

  // Format and validate phone number
  const formatAndValidatePhone = (phone) => {
    const validation = validatePhone(phone);
    return {
      phone: validation.valid ? validation.phone : phone.replace(/\D/g, ''),
      formatted: validation.formatted || phone,
      valid: validation.valid,
      error: validation.error
    };
  };

  const renderSelectStep = () => (
    <>
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, color: 'grey.800' }}>
          Importar Contatos
        </Typography>
        <Typography variant="body2" sx={{ color: 'grey.500', mt: 0.5 }}>
          Escolha de onde deseja importar seus contatos
        </Typography>
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Hidden file input for VCF */}
        <input
          type="file"
          ref={fileInputRef}
          accept=".vcf,text/vcard,text/x-vcard"
          style={{ display: 'none' }}
          onChange={handleFileUpload}
        />

        <List sx={{ pt: 0 }}>
          {/* VCF File Import - Works everywhere including iOS */}
          <ListItem disablePadding sx={{ mb: 1 }}>
            <ListItemButton
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              sx={{
                borderRadius: 2,
                border: '2px solid',
                borderColor: isIOS ? '#ec4899' : 'grey.200',
                bgcolor: isIOS ? '#fdf2f8' : 'transparent',
                '&:hover': {
                  borderColor: '#ec4899',
                  bgcolor: '#fdf2f8',
                },
              }}
            >
              <ListItemIcon>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    bgcolor: '#fce7f3',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <FileUploadIcon sx={{ color: '#ec4899', fontSize: 24 }} />
                </Box>
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography variant="body1" sx={{ fontWeight: 600, color: 'grey.800' }}>
                    Arquivo de Contatos
                  </Typography>
                }
                secondary={
                  <Typography variant="body2" sx={{ color: 'grey.500' }}>
                    Importe arquivo .vcf (vCard)
                  </Typography>
                }
              />
              {isIOS && (
                <Chip
                  label="iPhone"
                  size="small"
                  sx={{
                    bgcolor: '#dcfce7',
                    color: '#16a34a',
                    fontSize: '0.7rem',
                  }}
                />
              )}
            </ListItemButton>
          </ListItem>

          {/* Device Contacts - Only show on Android/Chrome */}
          {!isIOS && (
            <ListItem disablePadding sx={{ mb: 1 }}>
              <ListItemButton
                onClick={handleDeviceContacts}
                disabled={loading || !hasContactPicker}
                sx={{
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'grey.200',
                  opacity: hasContactPicker ? 1 : 0.6,
                  '&:hover': {
                    borderColor: '#ec4899',
                    bgcolor: '#fdf2f8',
                  },
                }}
              >
                <ListItemIcon>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      bgcolor: '#dcfce7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ContactPhoneIcon sx={{ color: '#16a34a', fontSize: 24 }} />
                  </Box>
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="body1" sx={{ fontWeight: 600, color: 'grey.800' }}>
                      Contatos do Dispositivo
                    </Typography>
                  }
                  secondary={
                    <Typography variant="body2" sx={{ color: 'grey.500' }}>
                      {hasContactPicker
                        ? 'Importe diretamente da sua agenda'
                        : 'Disponível apenas no Chrome/Android'}
                    </Typography>
                  }
                />
                {!hasContactPicker && (
                  <Chip
                    label="Android"
                    size="small"
                    sx={{
                      bgcolor: '#fef3c7',
                      color: '#d97706',
                      fontSize: '0.7rem',
                    }}
                  />
                )}
              </ListItemButton>
            </ListItem>
          )}

          {/* Google Contacts */}
          <ListItem disablePadding>
            <ListItemButton
              onClick={handleGoogleContacts}
              disabled={loading || !GOOGLE_CLIENT_ID}
              sx={{
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'grey.200',
                opacity: GOOGLE_CLIENT_ID ? 1 : 0.6,
                '&:hover': {
                  borderColor: '#ec4899',
                  bgcolor: '#fdf2f8',
                },
              }}
            >
              <ListItemIcon>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    bgcolor: '#dbeafe',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <GoogleIcon sx={{ color: '#2563eb', fontSize: 24 }} />
                </Box>
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography variant="body1" sx={{ fontWeight: 600, color: 'grey.800' }}>
                    Google Contacts
                  </Typography>
                }
                secondary={
                  <Typography variant="body2" sx={{ color: 'grey.500' }}>
                    {GOOGLE_CLIENT_ID
                      ? 'Conecte sua conta Google para importar'
                      : 'Em breve disponível'}
                  </Typography>
                }
              />
              {!GOOGLE_CLIENT_ID && (
                <Chip
                  label="Em breve"
                  size="small"
                  sx={{
                    bgcolor: '#e0e7ff',
                    color: '#4f46e5',
                    fontSize: '0.7rem',
                  }}
                />
              )}
            </ListItemButton>
          </ListItem>
        </List>

        {isIOS && (
          <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
            <Typography variant="body2">
              <strong>Como exportar contatos no iPhone:</strong><br />
              Contatos → Selecione contatos → Compartilhar → Salvar em Arquivos
            </Typography>
          </Alert>
        )}

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={32} sx={{ color: '#ec4899' }} />
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          onClick={onClose}
          sx={{
            color: 'grey.500',
            '&:hover': { bgcolor: 'grey.100' },
          }}
        >
          Cancelar
        </Button>
      </DialogActions>
    </>
  );

  const renderContactsStep = () => (
    <>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, color: 'grey.800' }}>
              Selecione os Contatos
            </Typography>
            <Typography variant="body2" sx={{ color: 'grey.500', mt: 0.5 }}>
              {validContactsCount} válidos
              {invalidContactsCount > 0 && ` · ${invalidContactsCount} inválidos`}
            </Typography>
          </Box>
          <Chip
            label={source === 'device' ? 'Dispositivo' : source === 'vcf' ? 'Arquivo' : 'Google'}
            size="small"
            icon={source === 'device' ? <ContactPhoneIcon /> : source === 'vcf' ? <FileUploadIcon /> : <GoogleIcon />}
            sx={{
              bgcolor: source === 'device' ? '#dcfce7' : source === 'vcf' ? '#fce7f3' : '#dbeafe',
              color: source === 'device' ? '#16a34a' : source === 'vcf' ? '#ec4899' : '#2563eb',
              '& .MuiChip-icon': {
                color: 'inherit',
              },
            }}
          />
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        {invalidContactsCount > 0 && (
          <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
            {invalidContactsCount} contato(s) com telefone inválido. Apenas telefones com DDD + 9 dígitos serão importados.
          </Alert>
        )}
        <Box sx={{ mb: 2 }}>
          <Button
            size="small"
            onClick={handleSelectAll}
            sx={{ color: '#ec4899' }}
          >
            {selectedContacts.length === contacts.length ? 'Desmarcar todos' : 'Selecionar todos'}
          </Button>
          <Typography variant="body2" component="span" sx={{ ml: 2, color: 'grey.500' }}>
            {selectedValidCount} válidos selecionados
          </Typography>
        </Box>

        <List sx={{ maxHeight: 400, overflow: 'auto' }}>
          {contacts.map((contact) => {
            const isSelected = selectedContacts.some(c => c.id === contact.id);
            const isInvalid = !contact.phoneValid;
            return (
              <ListItem
                key={contact.id}
                disablePadding
                sx={{ mb: 0.5 }}
              >
                <ListItemButton
                  onClick={() => handleToggleContact(contact)}
                  sx={{
                    borderRadius: 2,
                    bgcolor: isInvalid ? '#fef2f2' : (isSelected ? '#fdf2f8' : 'transparent'),
                    opacity: isInvalid ? 0.7 : 1,
                    '&:hover': {
                      bgcolor: isInvalid ? '#fee2e2' : (isSelected ? '#fce7f3' : 'grey.50'),
                    },
                  }}
                >
                  <ListItemIcon>
                    <Checkbox
                      checked={isSelected}
                      disabled={isInvalid}
                      sx={{
                        color: isInvalid ? 'grey.300' : 'grey.300',
                        '&.Mui-checked': {
                          color: '#ec4899',
                        },
                        '&.Mui-disabled': {
                          color: 'grey.200',
                        },
                      }}
                    />
                  </ListItemIcon>
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    {isInvalid ? (
                      <WarningIcon sx={{ color: '#f59e0b', fontSize: 22 }} />
                    ) : (
                      <PersonIcon sx={{ color: 'grey.400' }} />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography variant="body2" sx={{ fontWeight: 500, color: isInvalid ? 'grey.500' : 'grey.800' }}>
                        {contact.name}
                      </Typography>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                        <PhoneIcon sx={{ fontSize: 14, color: isInvalid ? '#ef4444' : 'grey.400' }} />
                        <Typography variant="caption" sx={{ color: isInvalid ? '#ef4444' : 'grey.500' }}>
                          {contact.phoneFormatted || contact.phone}
                        </Typography>
                        {isInvalid && (
                          <Typography variant="caption" sx={{ color: '#ef4444', fontSize: '0.65rem' }}>
                            ({contact.phoneError})
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button
          onClick={() => setStep('select')}
          sx={{
            color: 'grey.500',
            '&:hover': { bgcolor: 'grey.100' },
          }}
        >
          Voltar
        </Button>
        <Button
          variant="contained"
          onClick={handleImport}
          disabled={selectedValidCount === 0}
          sx={{
            background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
            borderRadius: 2,
            px: 3,
            '&:hover': {
              background: 'linear-gradient(135deg, #db2777 0%, #7c3aed 100%)',
            },
            '&.Mui-disabled': {
              bgcolor: 'grey.200',
            },
          }}
        >
          Importar {selectedValidCount > 0 ? `(${selectedValidCount})` : ''}
        </Button>
      </DialogActions>
    </>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
        },
      }}
    >
      {step === 'select' && renderSelectStep()}
      {step === 'contacts' && renderContactsStep()}
    </Dialog>
  );
}
