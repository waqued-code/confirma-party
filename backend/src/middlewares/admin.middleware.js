/**
 * Middleware para verificar se o usuário é admin
 * Usado para proteger rotas administrativas como configuração do WhatsApp
 */

const adminMiddleware = (req, res, next) => {
  // req.user já foi setado pelo auth.middleware
  if (!req.user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  if (!req.user.isAdmin) {
    return res.status(403).json({
      error: 'Acesso negado',
      message: 'Apenas administradores podem acessar esta funcionalidade'
    });
  }

  next();
};

module.exports = adminMiddleware;
