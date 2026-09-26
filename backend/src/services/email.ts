import nodemailer, { type Transporter } from 'nodemailer';
import { config } from '../config.js';
import type { ProductRow } from '../types.js';

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!config.smtp.host) return null; // SMTP not configured → no-op (logged by caller)
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
    });
  }
  return transporter;
}

/**
 * Send the supplier reorder email for a STOCK_LOW alert.
 * Never throws — returns whether the email was actually sent.
 */
export async function sendStockLowEmail(product: ProductRow, stockQty: number): Promise<boolean> {
  const to = config.smtp.alertTo;
  const t = getTransporter();
  if (!t || !to) {
    console.warn(
      `[email] SMTP/ALERT_EMAIL_TO non configuré — recommande non envoyée pour « ${product.name} » (stock=${stockQty}).`,
    );
    return false;
  }

  try {
    await t.sendMail({
      from: config.smtp.from,
      to,
      subject: `Recommande fournisseur — ${product.name}`,
      text:
        `Le stock de « ${product.name} »${product.brand ? ` (${product.brand})` : ''} ` +
        `est bas (${stockQty} en réserve, seuil ${product.mini_stock}).\n` +
        `${product.gtin ? `GTIN : ${product.gtin}\n` : ''}` +
        `Merci de passer commande auprès du fournisseur.\n\n— Comptoir`,
    });
    return true;
  } catch (err) {
    console.error('[email] Échec envoi recommande:', err);
    return false;
  }
}
