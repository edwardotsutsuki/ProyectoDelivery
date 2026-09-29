export const API_BASE_URL = 'http://10.0.2.2:8080/api';
export const WS_BASE_URL = 'ws://10.0.2.2:8080/ws/';

export const ApiService = {
  getComerciosCercanos: async (lon: number, lat: number) => {
    const res = await fetch(`${API_BASE_URL}/users/comercios-cercanos?lon=${lon}&lat=${lat}`);
    return res.json();
  },

  getCatalogo: async (comercioId: string) => {
    const res = await fetch(`${API_BASE_URL}/catalog/comercio/${comercioId}/productos`);
    return res.json();
  },

  syncCarritoRedis: async (clienteId: string, comercioId: string, items: any[]) => {
    const res = await fetch(`${API_BASE_URL}/orders/carrito/${clienteId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comercioId, items }),
    });
    return res.json();
  },

  crearPedido: async (payload: any) => {
    const res = await fetch(`${API_BASE_URL}/orders/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },
};
