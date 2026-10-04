export interface CheckoutItem {
  id: string;
  name: string;
  quantity: number;
  priceCents: number;
}

export interface OrderSubmissionPayload {
  clienteId?: string;
  comercioId: string;
  items: Array<{ id: string; cantidad: number; precio: number }>;
  direccionEntrega: string;
  metodoPago: 'efectivo' | 'transferencia' | 'tarjeta_credito';
  latEntrega: number;
  lonEntrega: number;
  costoEnvio: number;
  notas?: string;
  cuponCodigo?: string;
  descuentoCupon?: number;
  zonaTarifaId?: string;
}

export interface CreatedOrder {
  id: string;
  estado: string;
  total: string;
  fechaCreacion: string;
  numeroComanda?: string;
  fecha?: string;
  mensajeCocina?: string;
  pin_entrega?: string;
}

export interface CheckoutResult {
  success: boolean;
  message: string;
  pedido: CreatedOrder;
}

export interface BuildOrderOptions {
  costoEnvio?: number;
  lat?: number;
  lon?: number;
  cuponCodigo?: string;
  descuentoCupon?: number;
  zonaTarifaId?: string;
  notas?: string;
}

export function buildOrderPayload(
  items: CheckoutItem[],
  address: string,
  payment: 'efectivo' | 'transferencia' | 'tarjeta_credito',
  comercioId = '55555555-5555-5555-5555-555555555555',
  clienteId = 'usr-cliente-01',
  options?: BuildOrderOptions
): OrderSubmissionPayload {
  if (!items || items.length === 0) {
    throw new Error('El carrito no puede estar vacío para realizar el checkout.');
  }
  if (!address || address.trim().length < 10) {
    throw new Error('La dirección de entrega en Baba es obligatoria y debe ser detallada.');
  }

  return {
    clienteId,
    comercioId,
    items: items.map(item => ({
      id: item.id,
      cantidad: item.quantity,
      precio: item.priceCents / 100,
    })),
    direccionEntrega: address.trim(),
    metodoPago: payment,
    latEntrega: options?.lat ?? -1.7940,
    lonEntrega: options?.lon ?? -79.6810,
    costoEnvio: options?.costoEnvio ?? 1.50,
    notas: options?.notas ?? 'Pedido enviado desde App Móvil Cliente (Piloto Baba)',
    cuponCodigo: options?.cuponCodigo,
    descuentoCupon: options?.descuentoCupon,
    zonaTarifaId: options?.zonaTarifaId,
  };
}

export async function submitOrder(
  baseUrl: string,
  payload: OrderSubmissionPayload,
  signal?: AbortSignal,
  request: typeof fetch = fetch
): Promise<CheckoutResult> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  signal?.addEventListener('abort', abort);
  const timeout = setTimeout(abort, 15000);

  const cleanBase = baseUrl.replace(/\/$/, '');
  const targetUrl = cleanBase.includes('/orders') ? cleanBase : `${cleanBase}/orders/checkout`;

  try {
    const response = await request(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Bypass-Tunnel-Reminder': 'true',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      let serverError = `Error HTTP ${response.status}`;
      try {
        const errJson = await response.json();
        if (errJson.error || errJson.message) serverError = errJson.error || errJson.message;
      } catch {
        // Fallback al status code
      }
      throw new Error(`No se pudo crear el pedido: ${serverError}`);
    }

    const data = await response.json();
    if (!data || !data.success || !data.pedido?.id) {
      throw new Error(data?.message || 'Respuesta inválida del servidor al procesar el pedido.');
    }

    return {
      success: true,
      message: data.message || 'Pedido recibido por el restaurante',
      pedido: {
        id: data.pedido.id,
        estado: data.pedido.estado || 'creado',
        total: data.pedido.total || '0.00',
        fechaCreacion: data.pedido.fecha_creacion || data.pedido.fechaCreacion || new Date().toISOString(),
      },
    };
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
}
