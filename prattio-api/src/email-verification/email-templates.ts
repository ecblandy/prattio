import { users } from '../database/schema.js';

type UserRole = typeof users.$inferSelect.role;

export interface EmailMessage {
  subject: string;
  text: string;
  html: string;
}

const profiles: Record<UserRole, { label: string; logo: string; alt: string }> = {
  client: {
    label: 'cliente',
    logo: '/assets/images/prattio-images/light/logo-horizontal.png',
    alt: 'Prattio',
  },
  restaurant: {
    label: 'restaurante',
    logo: '/assets/images/prattio-images/light/logo-horizontal.png',
    alt: 'Prattio',
  },
  motoboy: {
    label: 'motoboy',
    logo: '/assets/images/prattio-motoboy-imagens-v2/claro/logo-horizontal.png',
    alt: 'Prattio Motoboy',
  },
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]!);
}

function layout(baseUrl: URL, role: UserRole, title: string, content: string): string {
  const profile = profiles[role];
  const logo = escapeHtml(new URL(profile.logo, baseUrl).href);
  return `<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:24px 12px;background:#f7f5f9;font-family:Arial,sans-serif;color:#0f0a14">
  <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e6e1ec;border-radius:16px">
    <tr><td style="padding:32px">
      <img src="${logo}" alt="${profile.alt}" width="190" style="display:block;width:190px;max-width:100%;height:auto">
      <div style="width:48px;height:4px;margin:24px 0;background:#ff6b00"></div>
      <h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;color:#3d0457">${title}</h1>
      ${content}
      <p style="margin:28px 0 0;padding-top:20px;border-top:1px solid #e6e1ec;font-size:12px;line-height:1.5;color:#6b6478">Este é um e-mail automático da Prattio. Se você não fez esta solicitação, ignore esta mensagem.</p>
    </td></tr>
  </table>
</body>
</html>`;
}

export function verificationEmail(baseUrl: URL, role: UserRole, link: URL): EmailMessage {
  const profile = profiles[role];
  const safeLink = escapeHtml(link.href);
  return {
    subject: 'Confirme seu e-mail na Prattio',
    text: `Confirme seu e-mail para acessar a Prattio:\n\n${link.href}\n\nO link é válido por uma hora. Se você não solicitou este cadastro, ignore este e-mail.`,
    html: layout(baseUrl, role, 'Confirme seu e-mail', `
      <p style="font-size:16px;line-height:1.6">Seu cadastro de ${profile.label} está quase pronto. Confirme seu e-mail para acessar sua conta.</p>
      <p style="margin:28px 0"><a href="${safeLink}" style="display:inline-block;padding:14px 24px;border-radius:10px;background:#3d0457;color:#ffffff;text-decoration:none;font-weight:bold">Confirmar meu e-mail</a></p>
      <p style="font-size:14px;line-height:1.6;color:#6b6478">O link é válido por uma hora. Se o botão não funcionar, copie este endereço:</p>
      <p style="font-size:12px;line-height:1.5;overflow-wrap:anywhere;word-break:break-all"><a href="${safeLink}" style="color:#3d0457">${safeLink}</a></p>`),
  };
}

export function emailChangeEmail(baseUrl: URL, role: UserRole, code: string): EmailMessage {
  return {
    subject: 'Confirme a alteração de e-mail na Prattio',
    text: `Seu código para confirmar o novo e-mail na Prattio é: ${code}\n\nO código é válido por 15 minutos. Se você não solicitou a alteração, ignore este e-mail.`,
    html: layout(baseUrl, role, 'Confirme seu novo e-mail', `
      <p style="font-size:16px;line-height:1.6">Use o código abaixo para confirmar o novo e-mail da sua conta de ${profiles[role].label}.</p>
      <p style="margin:28px 0;padding:16px;text-align:center;background:#f7f5f9;border-radius:10px;font-size:28px;letter-spacing:5px;font-weight:bold;color:#3d0457">${escapeHtml(code)}</p>
      <p style="font-size:14px;line-height:1.6;color:#6b6478">O código é válido por 15 minutos. Não compartilhe esse código com outras pessoas.</p>`),
  };
}
