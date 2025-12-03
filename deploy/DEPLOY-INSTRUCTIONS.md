# Guia de Deploy - Confirma.Party

Este guia mostra como fazer o deploy completo do Confirma.Party:
- **Landing + Frontend**: HostGator (cPanel)
- **Backend + PostgreSQL**: Render.com (gratuito)

---

## PARTE 1: Deploy do Backend no Render.com

### Passo 1: Criar conta no Render

1. Acesse: https://render.com
2. Clique em "Get Started for Free"
3. Faça login com GitHub (recomendado) ou crie uma conta

### Passo 2: Subir código para GitHub

Primeiro, suba o backend para um repositório GitHub:

```bash
cd /Users/andersenwaqued/confirma-party/backend
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/confirma-party-backend.git
git push -u origin main
```

### Passo 3: Criar o PostgreSQL no Render

1. No Dashboard do Render, clique em **"New +"** → **"PostgreSQL"**
2. Configure:
   - **Name**: `confirma-party-db`
   - **Database**: `confirma_party`
   - **User**: `confirma_party_user`
   - **Region**: Ohio (US East) ou mais próximo
   - **Plan**: Free
3. Clique em **"Create Database"**
4. Aguarde criar e **COPIE** a **"External Database URL"** (vai precisar depois)

### Passo 4: Criar o Web Service (API)

1. No Dashboard, clique em **"New +"** → **"Web Service"**
2. Conecte seu repositório GitHub do backend
3. Configure:
   - **Name**: `confirma-party-api`
   - **Region**: Mesmo do banco (Ohio)
   - **Branch**: `main`
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run prisma:migrate:deploy && npm start`
   - **Plan**: Free

4. Em **Environment Variables**, adicione:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | (Cole a External Database URL do passo 3) |
| `JWT_SECRET` | (Gere um: `openssl rand -base64 32`) |
| `ANTHROPIC_API_KEY` | (Sua chave da API Anthropic) |

5. Clique em **"Create Web Service"**
6. Aguarde o deploy (5-10 minutos na primeira vez)
7. Anote a URL gerada: `https://confirma-party-api.onrender.com`

### Passo 5: Testar a API

Acesse no navegador: `https://SUA-URL.onrender.com/api/health`

Deve retornar: `{"status":"ok"}`

---

## PARTE 2: Deploy no HostGator (cPanel)

### Estrutura de pastas no cPanel:

```
public_html/
├── index.html        (Landing page)
├── css/
├── js/
├── images/
└── app/              (React App)
    ├── index.html
    ├── assets/
    └── .htaccess
```

### Passo 1: Atualizar URL da API no Frontend

Antes de fazer upload, edite o arquivo `.env.production`:

```
/Users/andersenwaqued/confirma-party/frontend/.env.production
```

Mude para a URL real do seu backend no Render:

```
VITE_API_URL=https://confirma-party-api.onrender.com/api
```

Depois, refaça o build:

```bash
cd /Users/andersenwaqued/confirma-party/frontend
npm run build
cd dist && zip -r ../../deploy/frontend-deploy.zip . -x "*.DS_Store"
```

### Passo 2: Acessar o cPanel

1. Acesse: https://seudominio.com/cpanel ou pelo painel HostGator
2. Faça login com suas credenciais

### Passo 3: Upload da Landing Page

1. No cPanel, clique em **"Gerenciador de Arquivos"**
2. Navegue até `public_html`
3. Clique em **"Upload"** (no topo)
4. Faça upload do arquivo `landing-deploy.zip`
5. Volte ao Gerenciador de Arquivos
6. Clique com botão direito no `landing-deploy.zip` → **"Extract"**
7. Extraia para `public_html` (raiz)
8. Delete o arquivo ZIP após extrair

### Passo 4: Criar pasta para o React App

1. Ainda em `public_html`, clique em **"+ Pasta"**
2. Nome: `app`
3. Clique em "Criar"

### Passo 5: Upload do React App

1. Entre na pasta `app`
2. Clique em **"Upload"**
3. Faça upload do arquivo `frontend-deploy.zip`
4. Clique com botão direito → **"Extract"**
5. Extraia para a pasta atual (`app`)
6. Delete o arquivo ZIP

### Passo 6: Configurar .htaccess do App

O arquivo `.htaccess` já está incluso no ZIP. Mas se precisar criar/editar:

1. Na pasta `app`, clique em **"+ Arquivo"**
2. Nome: `.htaccess`
3. Cole o conteúdo:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /app/
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /app/index.html [L]
</IfModule>
```

**IMPORTANTE**: Note que mudou de `/` para `/app/`!

### Passo 7: Atualizar links da Landing

Na landing page, os links de "Entrar" e "Começar" precisam apontar para `/app`:

Edite os arquivos HTML e mude:
- De: `href="https://app.confirma.party/login"`
- Para: `href="/app/login"`

Ou use um subdomínio separado para o app.

---

## PARTE 3: Configuração de Subdomínio (Opcional)

Se preferir ter `app.seudominio.com` para o React:

### No cPanel:

1. Vá em **"Subdomínios"**
2. Crie: `app.seudominio.com`
3. Raiz do documento: `public_html/app`
4. Clique em "Criar"

### Atualize o .htaccess do app:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

---

## PARTE 4: Configurar CORS no Backend

O backend precisa permitir requisições do seu domínio.

Edite o arquivo `backend/src/index.js` e configure o CORS:

```javascript
app.use(cors({
  origin: [
    'https://seudominio.com',
    'https://app.seudominio.com',
    'http://localhost:3000'
  ],
  credentials: true
}));
```

Faça commit e push para o GitHub - o Render vai re-deploy automaticamente.

---

## Verificação Final

### Checklist:

- [ ] Backend rodando no Render (teste `/api/health`)
- [ ] Landing page acessível em `seudominio.com`
- [ ] React app acessível em `seudominio.com/app` ou `app.seudominio.com`
- [ ] Login/Registro funcionando
- [ ] Criação de festas funcionando
- [ ] Upload de convidados funcionando

### URLs finais:

| Serviço | URL |
|---------|-----|
| Landing | `https://seudominio.com` |
| App | `https://seudominio.com/app` ou `https://app.seudominio.com` |
| API | `https://confirma-party-api.onrender.com` |

---

## Solução de Problemas

### "API não responde"
- Verifique se o backend está rodando no Render (pode ter adormecido no plano free)
- O plano gratuito "dorme" após 15 min de inatividade - primeira requisição demora mais

### "Erro de CORS"
- Verifique se adicionou seu domínio na lista de `origin` do CORS

### "Página não carrega / 404"
- Verifique se o `.htaccess` está correto na pasta do app
- Verifique se `mod_rewrite` está ativado (padrão no HostGator)

### "Erro de banco de dados"
- Verifique se DATABASE_URL está correta no Render
- Execute manualmente: `npm run prisma:migrate:deploy`

---

## Arquivos de Deploy

Os arquivos ZIP estão em:
```
/Users/andersenwaqued/confirma-party/deploy/
├── landing-deploy.zip    (57 KB) - Landing page
└── frontend-deploy.zip   (228 KB) - React App
```
