-- ============================================================================
-- PLATAFORMA DE DELIVERY - SCRIPT DE INICIALIZACIÓN DE BASE DE DATOS
-- PostgreSQL 15 + PostGIS 3.3
-- ============================================================================

-- 1. Extensiones requeridas
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tipos ENUM
DO $$ BEGIN
    CREATE TYPE rol_usuario AS ENUM ('cliente', 'repartidor', 'comercio', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE estado_pedido AS ENUM (
        'creado',
        'confirmado',
        'en_preparacion',
        'listo',
        'en_camino',
        'entregado',
        'cancelado'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE metodo_pago AS ENUM (
        'efectivo',
        'transferencia',
        'saldo_virtual'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE tipo_movimiento_ledger AS ENUM (
        'ingreso',
        'egreso',
        'comision',
        'pago_efectivo',
        'recarga',
        'liquidacion'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Tabla: usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    rol rol_usuario NOT NULL DEFAULT 'cliente',
    ubicacion GEOMETRY(Point, 4326),
    estado_activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabla: comercios (incluye is_abierto y coordenadas PostGIS)
CREATE TABLE IF NOT EXISTS comercios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    nombre_comercial VARCHAR(150) NOT NULL,
    descripcion TEXT,
    direccion TEXT NOT NULL,
    ubicacion GEOMETRY(Point, 4326) NOT NULL,
    is_abierto BOOLEAN DEFAULT TRUE,
    telefono VARCHAR(20),
    categoria VARCHAR(50) DEFAULT 'Restaurante',
    tiempo_entrega_promedio INT DEFAULT 30, -- Minutos
    calificacion NUMERIC(2,1) DEFAULT 5.0,
    costo_base_envio NUMERIC(10,2) DEFAULT 1.50,
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabla: productos (persistencia permanente)
CREATE TABLE IF NOT EXISTS productos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comercio_id UUID NOT NULL REFERENCES comercios(id) ON DELETE CASCADE,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    precio NUMERIC(10,2) NOT NULL CHECK (precio >= 0),
    imagen_url TEXT,
    is_disponible BOOLEAN DEFAULT TRUE,
    categoria VARCHAR(50),
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. Tabla: pedidos
CREATE TABLE IF NOT EXISTS pedidos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id UUID NOT NULL REFERENCES usuarios(id),
    repartidor_id UUID REFERENCES usuarios(id),
    comercio_id UUID NOT NULL REFERENCES comercios(id),
    estado estado_pedido DEFAULT 'creado',
    metodo_pago metodo_pago NOT NULL,
    subtotal NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
    costo_envio NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (costo_envio >= 0),
    total NUMERIC(10,2) NOT NULL CHECK (total >= 0),
    direccion_entrega TEXT NOT NULL,
    ubicacion_entrega GEOMETRY(Point, 4326) NOT NULL,
    notas TEXT,
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. Tabla: pedidos_items
CREATE TABLE IF NOT EXISTS pedidos_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    producto_id UUID NOT NULL REFERENCES productos(id),
    cantidad INT NOT NULL CHECK (cantidad > 0),
    precio_unitario NUMERIC(10,2) NOT NULL CHECK (precio_unitario >= 0),
    notas TEXT
);

-- 8. Tabla: transacciones_ledger (Patrón Inmutable para Contabilidad/Billetera)
CREATE TABLE IF NOT EXISTS transacciones_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id),
    pedido_id UUID REFERENCES pedidos(id),
    tipo_movimiento tipo_movimiento_ledger NOT NULL,
    monto NUMERIC(12,2) NOT NULL,
    saldo_resultante NUMERIC(12,2) NOT NULL,
    descripcion TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- REGLA DE INMUTABILIDAD EN EL LEDGER
CREATE OR REPLACE FUNCTION rechazar_modificacion_ledger()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Operación denegada: El ledger de transacciones es estrictamente inmutable (Append-Only).';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ledger_inmutable ON transacciones_ledger;
CREATE TRIGGER trigger_ledger_inmutable
BEFORE UPDATE OR DELETE ON transacciones_ledger
FOR EACH ROW
EXECUTE FUNCTION rechazar_modificacion_ledger();

-- ÍNDICES ESPACIALES Y DE CONSULTA
CREATE INDEX IF NOT EXISTS idx_usuarios_ubicacion ON usuarios USING GIST (ubicacion);
CREATE INDEX IF NOT EXISTS idx_comercios_ubicacion ON comercios USING GIST (ubicacion);
CREATE INDEX IF NOT EXISTS idx_pedidos_ubicacion_entrega ON pedidos USING GIST (ubicacion_entrega);
CREATE INDEX IF NOT EXISTS idx_ledger_usuario ON transacciones_ledger(usuario_id, fecha_creacion DESC);

-- DATOS SEMILLA BÁSICOS (Guayaquil Centro)
INSERT INTO usuarios (id, nombre, email, password_hash, telefono, rol, ubicacion)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'Admin Central', 'admin@delivery.com', '$2b$10$abcdefghijklmnopqrstuvwxyz123456', '0990000001', 'admin', ST_SetSRID(ST_MakePoint(-79.8891, -2.1894), 4326)),
    ('22222222-2222-2222-2222-222222222222', 'Comercio Pizza Express', 'pizza@delivery.com', '$2b$10$abcdefghijklmnopqrstuvwxyz123456', '0990000002', 'comercio', ST_SetSRID(ST_MakePoint(-79.8920, -2.1850), 4326)),
    ('33333333-3333-3333-3333-333333333333', 'Repartidor Juan Pérez', 'repartidor@delivery.com', '$2b$10$abcdefghijklmnopqrstuvwxyz123456', '0990000003', 'repartidor', ST_SetSRID(ST_MakePoint(-79.8900, -2.1880), 4326)),
    ('44444444-4444-4444-4444-444444444444', 'Cliente María Silva', 'cliente@delivery.com', '$2b$10$abcdefghijklmnopqrstuvwxyz123456', '0990000004', 'cliente', ST_SetSRID(ST_MakePoint(-79.8850, -2.1910), 4326))
ON CONFLICT (email) DO NOTHING;

INSERT INTO comercios (id, usuario_id, nombre_comercial, descripcion, direccion, ubicacion, is_abierto, telefono, categoria)
VALUES 
    ('55555555-5555-5555-5555-555555555555', '22222222-2222-2222-2222-222222222222', 'Pizzería Napolitana Gourmet', 'Las mejores pizzas artesanales a la leña', 'Av. 9 de Octubre y Malecón', ST_SetSRID(ST_MakePoint(-79.8920, -2.1850), 4326), TRUE, '042000001', 'Pizzería')
ON CONFLICT DO NOTHING;

INSERT INTO productos (comercio_id, nombre, descripcion, precio, is_disponible, categoria)
VALUES 
    ('55555555-5555-5555-5555-555555555555', 'Pizza Margherita Mediana', 'Salsa de tomate San Marzano, mozzarella fior di latte y albahaca fresca', 9.50, TRUE, 'Pizzas'),
    ('55555555-5555-5555-5555-555555555555', 'Pizza Cuatro Quesos', 'Gorgonzola, parmesano, provolone y mozzarella', 12.00, TRUE, 'Pizzas'),
    ('55555555-5555-5555-5555-555555555555', 'Gaseosa 500ml', 'Bebida refrescante bien fría', 1.50, TRUE, 'Bebidas')
ON CONFLICT DO NOTHING;
