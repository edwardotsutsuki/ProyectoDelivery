-- ============================================================================
-- MIGRACIÓN 09: MENSAJES Y CHAT EN VIVO DE PEDIDOS (CLIENTE <-> REPARTIDOR)
-- ============================================================================

CREATE TABLE IF NOT EXISTS mensajes_pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  emisor_rol VARCHAR(20) NOT NULL CHECK (emisor_rol IN ('cliente', 'repartidor', 'sistema')),
  texto TEXT NOT NULL,
  leido BOOLEAN DEFAULT false,
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mensajes_pedidos_pedido ON mensajes_pedidos(pedido_id);
