export interface Movement { id: string; type: string; cents: number; description: string; date: string }
export interface Wallet { balanceCents: number; movements: Movement[]; possiblyTruncated: boolean }
export const money = (cents: number) => `${cents < 0 ? '−' : ''}$${(Math.abs(cents) / 100).toFixed(2)}`;
export function toCents(value: unknown): number {
  if ((typeof value !== 'string' && typeof value !== 'number') || !/^-?\d+(\.\d{1,2})?$/.test(String(value))) throw new Error('Importe de billetera inválido.');
  const cents = Math.round(Number(value) * 100);
  if (!Number.isSafeInteger(cents)) throw new Error('Importe fuera de rango.');
  return cents;
}
export function parseWallet(raw: unknown): Wallet {
  const body = raw as { success?: boolean; data?: { usuarioId?: string; moneda?: string; saldoActual?: unknown; movimientos?: unknown } };
  const data = body?.data;
  if (body?.success !== true || data?.usuarioId !== 'usr-repartidor-01' || data.moneda !== 'USD' || !Array.isArray(data.movimientos)) throw new Error('Respuesta de billetera inválida.');
  const ids = new Set<string>();
  const movements = data.movimientos.map(row => {
    if (!row || typeof row.id !== 'string' || !row.id || ids.has(row.id) || typeof row.tipo_movimiento !== 'string'
      || typeof row.fecha_creacion !== 'string' || !/(Z|[+-]\d{2}:\d{2})$/.test(row.fecha_creacion) || !Number.isFinite(Date.parse(row.fecha_creacion))) throw new Error('Movimiento de billetera inválido.');
    ids.add(row.id);
    return { id: row.id, type: row.tipo_movimiento, cents: toCents(row.monto), description: typeof row.descripcion === 'string' ? row.descripcion : row.tipo_movimiento, date: row.fecha_creacion };
  });
  return { balanceCents: toCents(data.saldoActual), movements, possiblyTruncated: movements.length >= 50 };
}
export function ecuadorDay(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guayaquil', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}
export function dailyWallet(wallet: Wallet, now = new Date()) {
  const today = ecuadorDay(now);
  const movements = wallet.movements.filter(item => ecuadorDay(new Date(item.date)) === today && Date.parse(item.date) <= now.getTime());
  const netCents = movements.reduce((sum, item) => sum + item.cents, 0);
  const cashNet = movements.filter(item => item.type === 'pago_efectivo').reduce((sum, item) => sum + item.cents, 0);
  const commissionCents = movements.filter(item => item.type === 'comision').reduce((sum, item) => sum + item.cents, 0);
  return { movements, netCents, cashDebtCents: Math.max(0, -cashNet), cashNetCents: cashNet, commissionCents,
    otherCents: netCents - cashNet - commissionCents, partial: wallet.possiblyTruncated };
}
