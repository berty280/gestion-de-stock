import type Database from 'better-sqlite3';
import { sendStockLowEmail } from './email.js';
import { getLevel } from './stock.js';
import type { AlertRow, ProductRow } from '../types.js';

/**
 * After a transaction commits, send the supplier email for any newly opened
 * STOCK_LOW alerts and flag them as sent. VITRINE_LOW is in-app only.
 */
export async function notifyOpenedAlerts(
  db: Database.Database,
  openedAlerts: AlertRow[],
): Promise<void> {
  for (const alert of openedAlerts) {
    if (alert.type !== 'STOCK_LOW') continue;
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(alert.product_id) as
      | ProductRow
      | undefined;
    if (!product) continue;
    const stockQty = getLevel(db, product.id, 'STOCK');
    const sent = await sendStockLowEmail(product, stockQty);
    if (sent) {
      db.prepare('UPDATE alerts SET email_sent = 1 WHERE id = ?').run(alert.id);
    }
  }
}
