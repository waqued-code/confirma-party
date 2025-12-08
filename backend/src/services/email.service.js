const nodemailer = require('nodemailer');

// Create transporter using environment variables
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

// Send notification email when new user registers
exports.sendNewUserNotification = async (user) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: 'waqued@icloud.com',
      subject: `Novo cadastro no Confirma.Party - ${user.name}`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #ec4899, #8b5cf6); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Novo Cadastro!</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #e5e7eb; border-top: none;">
            <p style="color: #374151; font-size: 16px; margin-bottom: 20px;">
              Um novo usuario se cadastrou no <strong>Confirma.Party</strong>:
            </p>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">Nome</td>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px; font-weight: 600;">${user.name}</td>
              </tr>
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">Email</td>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px; font-weight: 600;">${user.email}</td>
              </tr>
              <tr>
                <td style="padding: 12px; color: #6b7280; font-size: 14px;">Telefone</td>
                <td style="padding: 12px; color: #111827; font-size: 14px; font-weight: 600;">${user.phone || 'Nao informado'}</td>
              </tr>
            </table>
            <p style="color: #6b7280; font-size: 12px; margin-top: 20px; text-align: center;">
              Cadastro realizado em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
            </p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email de notificacao enviado:', info.messageId);
    return true;
  } catch (error) {
    console.error('Erro ao enviar email de notificacao:', error.message);
    // Don't throw - email failure shouldn't block registration
    return false;
  }
};
