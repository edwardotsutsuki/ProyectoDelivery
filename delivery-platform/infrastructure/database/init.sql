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
    comercio_id UUID,
    ubicacion GEOMETRY(Point, 4326),
    estado_activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabla: tipos_comercio (Verticales de negocio en la plataforma)
CREATE TABLE IF NOT EXISTS tipos_comercio (
    id VARCHAR(50) PRIMARY KEY, -- 'restaurante', 'supermercado', 'farmacia', 'licorera', 'express'
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    icono VARCHAR(50) NOT NULL,
    tipo_layout VARCHAR(30) DEFAULT 'restaurante', -- 'restaurante' | 'grid_ecommerce'
    requiere_cocina BOOLEAN DEFAULT TRUE,
    permite_recetas BOOLEAN DEFAULT FALSE,
    control_edad_18 BOOLEAN DEFAULT FALSE,
    orden INT DEFAULT 0,
    is_activo BOOLEAN DEFAULT TRUE
);

INSERT INTO tipos_comercio (id, nombre, descripcion, icono, tipo_layout, requiere_cocina, permite_recetas, control_edad_18, orden) VALUES
('restaurante', 'Restaurantes & Cafeterías', 'Comida preparada al instante, hamburguesas, almuerzos y platos a la carta', '🍔', 'restaurante', true, false, false, 1),
('supermercado', 'Supermercados & Abarrotes', 'Víveres, frutas, verduras, lácteos y productos del hogar', '🛒', 'grid_ecommerce', false, false, false, 2),
('farmacia', 'Farmacias & Salud', 'Medicamentos OTC, cuidado personal, higiene y productos para bebés', '💊', 'grid_ecommerce', false, true, false, 3),
('licorera', 'Licores & Bebidas', 'Cervezas, vinos, licores, hielo y snacks para reuniones (+18)', '🍾', 'grid_ecommerce', false, false, true, 4),
('express', 'Tiendas Express & Antojos', 'Snacks rápidos, bebidas frías y golosinas con entrega ultrarrápida', '⚡', 'grid_ecommerce', false, false, false, 5)
ON CONFLICT (id) DO NOTHING;

-- 5. Tabla: comercios (incluye is_abierto, coordenadas PostGIS y datos de afiliación)
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
    tipo_comercio_id VARCHAR(50) DEFAULT 'restaurante' REFERENCES tipos_comercio(id),
    maneja_inventario_general BOOLEAN DEFAULT FALSE,
    tiempo_entrega_promedio INT DEFAULT 30, -- Minutos
    calificacion NUMERIC(2,1) DEFAULT 5.0,
    costo_base_envio NUMERIC(10,2) DEFAULT 1.50,
    ruc VARCHAR(20),
    razon_social VARCHAR(150),
    banco VARCHAR(100),
    tipo_cuenta VARCHAR(20) DEFAULT 'ahorros',
    numero_cuenta VARCHAR(50),
    titular_cuenta VARCHAR(150),
    estado_aprobacion VARCHAR(20) DEFAULT 'aprobado',
    motivo_rechazo TEXT,
    fecha_solicitud TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    fecha_aprobacion TIMESTAMPTZ,
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. Tabla: categorias_productos (Catálogo de categorías por local)
CREATE TABLE IF NOT EXISTS categorias_productos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comercio_id UUID NOT NULL REFERENCES comercios(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    icono VARCHAR(50),
    orden INT DEFAULT 0,
    is_activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. Tabla: productos (persistencia permanente con soporte de stock opcional)
CREATE TABLE IF NOT EXISTS productos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comercio_id UUID NOT NULL REFERENCES comercios(id) ON DELETE CASCADE,
    categoria_id UUID REFERENCES categorias_productos(id) ON DELETE SET NULL,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    precio NUMERIC(10,2) NOT NULL CHECK (precio >= 0),
    imagen_url TEXT,
    is_disponible BOOLEAN DEFAULT TRUE,
    categoria VARCHAR(50),
    unidad_medida VARCHAR(20) DEFAULT 'unidad',
    maneja_stock BOOLEAN DEFAULT FALSE,
    stock_disponible INT DEFAULT NULL,
    requiere_receta BOOLEAN DEFAULT FALSE,
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

-- DATOS SEMILLA OFICIALES: PILOTO BABA Y EXPANSIÓN BABAHOYO (LOS RÍOS, ECUADOR)
INSERT INTO usuarios (id, nombre, email, password_hash, telefono, rol, ubicacion)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'Admin Central (Los Ríos)', 'admin@delivery.com', '$2a$10$cpFBqwYIT0w0X.dOJlhqo.em2V9/qviZCsfU/4d9iLVa5rQSZL5eW', '+593991234567', 'admin', ST_SetSRID(ST_MakePoint(-79.6783, -1.7917), 4326)),
    ('22222222-2222-2222-2222-222222222222', 'Picantería El Buen Sabor - Baba Centro', 'comercio@delivery.com', '$2a$10$Hb8XntryLvi7O5186XJWhenqaTaoZX4CqSoOmS8wDjkJ8zeifIItO', '+593987654321', 'comercio', ST_SetSRID(ST_MakePoint(-79.6783, -1.7917), 4326)),
    ('33333333-3333-3333-3333-333333333333', 'Carlos Repartidor - Moto Baba 01', 'repartidor@delivery.com', '$2a$10$hvz3NEPBQWcCBCtM4a6ujOi4kuCHmW0BhPxemtb0CHocRp1ODe4FG', '+593990011223', 'repartidor', ST_SetSRID(ST_MakePoint(-79.6790, -1.7925), 4326)),
    ('44444444-4444-4444-4444-444444444444', 'Edward Otsutsuki (Baba, Los Ríos)', 'edward.otsutsuki@gmail.com', '$2a$10$2x8c3wlaIcfZecBRGZCCV.yMKc3xu3PcBXh76LGtlzZAs2PM1UELS', '+593995544332', 'cliente', ST_SetSRID(ST_MakePoint(-79.6810, -1.7940), 4326))
ON CONFLICT (email) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    password_hash = EXCLUDED.password_hash,
    telefono = EXCLUDED.telefono,
    rol = EXCLUDED.rol,
    ubicacion = EXCLUDED.ubicacion;

INSERT INTO comercios (id, usuario_id, nombre_comercial, descripcion, direccion, ubicacion, is_abierto, telefono, categoria)
VALUES 
    ('55555555-5555-5555-5555-555555555555', '22222222-2222-2222-2222-222222222222', 'Picantería El Buen Sabor - Baba Centro', 'Comida criolla típica, secos y asados en el corazón de Baba', 'Calle Bolívar y Sucre, Barrio San Antonio, Baba', ST_SetSRID(ST_MakePoint(-79.6783, -1.7917), 4326), TRUE, '+593987654321', 'Restaurante'),
    ('77777777-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111', 'Restaurante El Gran Chef Babahoyo', 'Gastronomía de mariscos y cortes finos en Babahoyo', 'Av. 9 de Octubre y Pedro Carbo, Babahoyo', ST_SetSRID(ST_MakePoint(-79.5344, -1.8022), 4326), TRUE, '+593998877665', 'Restaurante')
ON CONFLICT (id) DO UPDATE SET
    nombre_comercial = EXCLUDED.nombre_comercial,
    descripcion = EXCLUDED.descripcion,
    direccion = EXCLUDED.direccion,
    ubicacion = EXCLUDED.ubicacion,
    is_abierto = EXCLUDED.is_abierto,
    telefono = EXCLUDED.telefono;

INSERT INTO productos (id, comercio_id, nombre, descripcion, precio, is_disponible, categoria)
VALUES 
    ('66666666-6666-6666-6666-666666666601', '55555555-5555-5555-5555-555555555555', 'Seco de gallina criolla Baba', 'Preparado con chicha tradicional y hierbitas frescas, acompañado de arroz y maduro', 4.50, TRUE, 'Platos Fuertes'),
    ('66666666-6666-6666-6666-666666666602', '55555555-5555-5555-5555-555555555555', 'Bolón mixto con queso y chicharrón', 'Plátano verde majado con queso manaba y chicharrón crocante', 3.75, TRUE, 'Desayunos y Tradicional'),
    ('66666666-6666-6666-6666-666666666603', '55555555-5555-5555-5555-555555555555', 'Seco de pollo de campo', 'Guiso tierno con arroz amarillo, ensalada criolla y plátano maduro', 5.25, TRUE, 'Platos Fuertes'),
    ('66666666-6666-6666-6666-666666666604', '55555555-5555-5555-5555-555555555555', 'Arroz con menestra y carne asada', 'Carne de res asada al carbón con menestra de lenteja casera', 6.50, TRUE, 'Platos Fuertes'),
    ('66666666-6666-6666-6666-666666666605', '55555555-5555-5555-5555-555555555555', 'Jugo natural de maracuyá', 'Jugo natural refrescante de fruta fresca de Los Ríos', 1.50, TRUE, 'Bebidas'),
    ('66666666-6666-6666-6666-666666666606', '55555555-5555-5555-5555-555555555555', 'Patacones con queso criollo', 'Porción de patacones crocantes con queso fresco de la zona', 2.00, TRUE, 'Acompañamientos')
ON CONFLICT (id) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    precio = EXCLUDED.precio,
    descripcion = EXCLUDED.descripcion;

-- 9. Tabla: zonas_cobertura (PostGIS Polígonos de Operación)
CREATE TABLE IF NOT EXISTS zonas_cobertura (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(100) NOT NULL,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    canton VARCHAR(50) NOT NULL,
    poligono GEOMETRY(Polygon, 4326) NOT NULL,
    tarifa_base NUMERIC(10,2) NOT NULL DEFAULT 1.50,
    costo_km_adicional NUMERIC(10,2) NOT NULL DEFAULT 0.40,
    tiempo_estimado_min INT DEFAULT 20,
    activa BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_zonas_cobertura_poligono ON zonas_cobertura USING GIST (poligono);

-- Zonas Semilla Oficiales Los Ríos
INSERT INTO zonas_cobertura (id, nombre, codigo, canton, poligono, tarifa_base, costo_km_adicional, tiempo_estimado_min, activa)
VALUES 
    (
        'a1111111-1111-1111-1111-111111111101',
        'Baba Centro y Casco Urbano',
        'baba_centro',
        'Baba',
        ST_SetSRID(ST_GeomFromText('POLYGON((-79.6880 -1.7820, -79.6680 -1.7820, -79.6680 -1.8020, -79.6880 -1.8020, -79.6880 -1.7820))'), 4326),
        1.25,
        0.35,
        15,
        TRUE
    ),
    (
        'a1111111-1111-1111-1111-111111111102',
        'Recintos Rurales Baba (La Nobleza, Guare, Isla de Bejucal)',
        'baba_rural',
        'Baba',
        ST_SetSRID(ST_GeomFromText('POLYGON((-79.7300 -1.7400, -79.6300 -1.7400, -79.6300 -1.8400, -79.7300 -1.8400, -79.7300 -1.7400))'), 4326),
        2.00,
        0.50,
        35,
        TRUE
    ),
    (
        'a1111111-1111-1111-1111-111111111103',
        'Babahoyo Zona Urbana y Comercial',
        'babahoyo_centro',
        'Babahoyo',
        ST_SetSRID(ST_GeomFromText('POLYGON((-79.5550 -1.7850, -79.5150 -1.7850, -79.5150 -1.8250, -79.5550 -1.8250, -79.5550 -1.7850))'), 4326),
        1.50,
        0.40,
        25,
        TRUE
    ),
    (
        'a1111111-1111-1111-1111-111111111104',
        'Corredor Intercantonal Baba - Babahoyo (Vía E484)',
        'corredor_e484',
        'Intercantonal',
        ST_SetSRID(ST_GeomFromText('POLYGON((-79.6900 -1.7700, -79.5050 -1.7700, -79.5050 -1.8350, -79.6900 -1.8350, -79.6900 -1.7700))'), 4326),
        3.50,
        0.60,
        45,
        TRUE
    )
ON CONFLICT (codigo) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    canton = EXCLUDED.canton,
    poligono = EXCLUDED.poligono,
    tarifa_base = EXCLUDED.tarifa_base,
    costo_km_adicional = EXCLUDED.costo_km_adicional,
    tiempo_estimado_min = EXCLUDED.tiempo_estimado_min,
    activa = EXCLUDED.activa;

