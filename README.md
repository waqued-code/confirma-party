# Confirma.Party 🎉

Sistema inteligente de confirmação de presença para festas usando IA e WhatsApp.

## Funcionalidades

- ✅ Cadastro e autenticação de usuários
- ✅ Criação de festas com data, tipo e observações
- ✅ Upload de lista de convidados via planilha Excel/CSV
- ✅ Geração automática de mensagens de convite usando Claude AI
- ✅ Envio de convites via WhatsApp (Evolution API)
- ✅ Processamento automático de respostas com IA
- ✅ Dashboard em tempo real com status dos convidados
- ✅ Atualização manual de status

## Stack Tecnológico

### Backend
- Node.js + Express
- PostgreSQL + Prisma ORM
- JWT para autenticação
- Claude API (Anthropic) para IA
- Evolution API para WhatsApp

### Frontend
- React 18
- Material UI 5
- React Router
- Axios
- Vite

## Instalação

### Pré-requisitos

- Node.js 18+
- PostgreSQL
- Evolution API (para WhatsApp)
- Chave de API da Anthropic (Claude)

### 1. Clone o repositório

```bash
cd confirma-party
```

### 2. Configure o Backend

```bash
cd backend
npm install
```

Copie o arquivo `.env.example` para `.env` e configure:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/confirma_party"
JWT_SECRET="sua-chave-secreta"
ANTHROPIC_API_KEY="sua-api-key-anthropic"
EVOLUTION_API_URL="http://localhost:8080"
EVOLUTION_API_KEY="sua-evolution-api-key"
```

Execute as migrations:

```bash
npx prisma migrate dev
```

Inicie o servidor:

```bash
npm run dev
```

### 3. Configure o Frontend

```bash
cd frontend
npm install
npm run dev
```

Acesse: http://localhost:3000

## Estrutura do Projeto

```
confirma-party/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── controllers/
│   │   ├── middlewares/
│   │   ├── routes/
│   │   ├── services/
│   │   └── index.js
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
│
└── README.md
```

## Workflow

1. **Registro**: Usuário cria conta no sistema
2. **Criar Festa**: Define data, tipo e observações da festa
3. **Upload de Convidados**: Importa planilha com nome e telefone
4. **Gerar Mensagem**: IA cria mensagem personalizada de convite
5. **Enviar Convites**: Sistema envia via WhatsApp para todos
6. **Respostas Automáticas**: IA processa respostas e atualiza status
7. **Dashboard**: Visualiza confirmações em tempo real

## Formato da Planilha

A planilha de convidados deve conter as colunas:

| nome | telefone | contato |
|------|----------|---------|
| João Silva | 11999999999 | WhatsApp |
| Maria Santos | 11888888888 | Ligação |

## API Endpoints

### Autenticação
- `POST /api/auth/register` - Criar conta
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Dados do usuário

### Festas
- `GET /api/parties` - Listar festas
- `POST /api/parties` - Criar festa
- `GET /api/parties/:id` - Detalhes da festa
- `PUT /api/parties/:id` - Atualizar festa
- `DELETE /api/parties/:id` - Excluir festa
- `POST /api/parties/:id/upload-guests` - Upload de convidados
- `GET /api/parties/:id/dashboard` - Dashboard da festa

### Convidados
- `POST /api/guests` - Adicionar convidado
- `GET /api/guests/party/:partyId` - Listar convidados
- `PATCH /api/guests/:id/status` - Atualizar status
- `DELETE /api/guests/:id` - Remover convidado

### IA
- `POST /api/ai/generate-invite/:partyId` - Gerar mensagem
- `POST /api/ai/regenerate-invite/:partyId` - Regenerar mensagem

### WhatsApp
- `GET /api/whatsapp/status` - Status da conexão
- `POST /api/whatsapp/connect` - Conectar (gera QR Code)
- `POST /api/whatsapp/disconnect` - Desconectar
- `POST /api/whatsapp/send-all/:partyId` - Enviar para todos

### Webhook
- `POST /api/webhook/evolution` - Webhook da Evolution API

## Licença

MIT
