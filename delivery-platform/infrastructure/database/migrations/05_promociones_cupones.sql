-- ============================================================================
-- Migración 05: Sistema de Promociones, Cupones de Descuento y Ofertas
-- Para DeliveryYa (Piloto Baba & Babahoyo, Los Ríos)
-- ============================================================================

CREATE TABLE IF NOT EXISTS promociones_cupones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(30) UNIQUE NOT NULL,
    titulo VARCHAR(120) NOT NULL,
    descripcion TEXT,
    tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('porcentaje', 'monto_fijo', 'envio_gratis')),
    valor NUMERIC(8,2) NOT NULL,
    tope_descuento_maximo NUMERIC(8,2) DEFAULT NULL,
    compra_minima NUMERIC(8,2) DEFAULT 0.00,
    limite_usos_total INT DEFAULT NULL,
    usos_actuales INT DEFAULT 0,
    limite_usos_por_usuario INT DEFAULT 1,
    comercio_id UUID REFERENCES comercios(id) ON DELETE CASCADE,
    financiado_por VARCHAR(30) DEFAULT 'plataforma' CHECK (financiado_por IN ('plataforma', 'comercio', 'compartido')),
    fecha_inicio TIMESTAMPTZ DEFAULT NOW(),
    fecha_fin TIMESTAMPTZ NOT NULL,
    is_activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para búsqueda rápida de cupones por código activo
CREATE INDEX IF NOT EXISTS idx_promociones_codigo_upper ON promociones_cupones (UPPER(codigo));
CREATE INDEX IF NOT EXISTS idx_promociones_comercio ON promociones_cupones (comercio_id);
CREATE INDEX IF NOT EXISTS idx_promociones_activas ON promociones_cupones (is_activo, fecha_inicio, fecha_fin);

-- Semillas iniciales para Baba y Babahoyo
INSERT INTO promociones_cupones (
    codigo, titulo, descripcion, tipo, valor, tope_descuento_maximo, compra_minima, limite_usos_total, financiado_por, fecha_inicio, fecha_fin, is_activo
) VALUES 
(
    'BIENVENIDO', 
    'Descuento de Bienvenida a Baba', 
    'Ahorra $1.50 en tu primer pedido superior a $5.00 en cualquier local de Baba o Babahoyo', 
    'monto_fijo', 
    1.50, 
    1.50, 
    5.00, 
    500, 
    'plataforma', 
    NOW(), 
    NOW() + INTERVAL '90 days', 
    true
),
(
    'BABA10', 
    '10% OFF en Comercios Locales', 
    'Obtén 10% de descuento en pedidos superiores a $6.00 (máximo $2.50 de ahorro)', 
    'porcentaje', 
    10.00, 
    2.50, 
    6.00, 
    1000, 
    'compartido', 
    NOW(), 
    NOW() + INTERVAL '60 days', 
    true
),
(
    'ENVIOGRATIS', 
    'Flete Gratis por Compra Mínima', 
    'El envío corre por cuenta de DeliveryYa en compras superiores a $10.00', 
    'envio_gratis', 
    1.00, 
    1.50, 
    10.00, 
    300, 
    'plataforma', 
    NOW(), 
    NOW() + INTERVAL '30 days', 
    true
)
ON CONFLICT (codigo) DO UPDATE 
SET 
    valor = EXCLUDED.valor,
    compra_minima = EXCLUDED.compra_minima,
    is_activo = true;

-- Agregar campos en pedidos para auditoría de cupón si no existen
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pedidos' AND column_name = 'cupon_codigo') THEN
        ALTER TABLE pedidos ADD COLUMN cupon_codigo VARCHAR(30);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pedidos' AND column_name = 'descuento_cupon') THEN
        ALTER TABLE pedidos ADD COLUMN descuento_cupon NUMERIC(8,2) DEFAULT 0.00;
    END IF;
END $$;
