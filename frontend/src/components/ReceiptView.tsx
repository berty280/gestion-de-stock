import type { Receipt } from '../lib/types';
import { Card } from './ui';

export function ReceiptView({ receipt }: { receipt: Receipt }) {
  const date = new Date(receipt.sale.created_at);
  return (
    <Card className="print:border-0 print:shadow-none">
      <div className="mx-auto max-w-sm">
        <div className="text-center">
          <div className="text-lg font-bold text-teal-700">Comptoir</div>
          <div className="text-xs text-slate-500">Reçu de vente</div>
        </div>
        <div className="mt-3 flex justify-between text-xs text-slate-500">
          <span>Vente #{receipt.sale.id}</span>
          <span>{date.toLocaleString('fr-FR')}</span>
        </div>
        <div className="mt-1 text-xs text-slate-500">
          Client : <strong>{receipt.customer.name}</strong>
          {receipt.customer.phone ? ` · ${receipt.customer.phone}` : ''}
        </div>
        {receipt.seller && <div className="text-xs text-slate-500">Vendeur : {receipt.seller}</div>}

        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs text-slate-400">
              <th className="py-1">Article</th>
              <th className="py-1 text-right">Qté</th>
            </tr>
          </thead>
          <tbody>
            {receipt.lines.map((l) => (
              <tr key={l.id} className="border-b border-slate-100">
                <td className="py-1.5">
                  {l.name}
                  {l.brand ? <span className="text-slate-400"> · {l.brand}</span> : ''}
                </td>
                <td className="py-1.5 text-right">{l.quantity}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="pt-2 text-sm font-semibold">Total articles</td>
              <td className="pt-2 text-right text-sm font-semibold">{receipt.total_items}</td>
            </tr>
          </tfoot>
        </table>

        <p className="mt-4 text-center text-xs text-slate-400">Merci de votre visite !</p>
      </div>
    </Card>
  );
}
