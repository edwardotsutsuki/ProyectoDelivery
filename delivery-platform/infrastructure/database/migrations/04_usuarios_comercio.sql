-- Migration 04: Tabla de Usuarios y Personal por Comercio (Cajeros, Cocineros, Pickers y Encargados)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS usuarios_comercio (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comercio_id UUID NOT NULL REFERENCES comercios(id) ON DELETE CASCADE,
    nombre VARCHAR(120) NOT NULL,
    email VARCHAR(150),
    telefono VARCHAR(20),
    rol VARCHAR(50) NOT NULL DEFAULT 'cajero', -- 'administrador', 'cajero', 'cocina', 'picker', 'bodega'
    pin_acceso VARCHAR(10) DEFAULT '1234', -- PIN rápido de 4 dígitos para cambio de turno
    permisos JSONB DEFAULT '{}'::jsonb,
    is_activo BOOLEAN DEFAULT TRUE,
    ultimo_acceso TIMESTAMPTZ,
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_usuarios_comercio_comercio ON usuarios_comercio (comercio_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_comercio_pin ON usuarios_comercio (comercio_id, pin_acceso);

-- Semillas de ejemplo para comercios existentes
-- 1. Picantería El Buen Sabor (Restaurante)
INSERT INTO usuarios_comercio (comercio_id, nombre, email, telefono, rol, pin_acceso)
SELECT 
    '55555555-5555-5555-5555-555555555555',
    'Génesis Salvatierra',
    'genesis@deliveryya.ec',
    '+593987654321',
    'administrador',
    '1111'
WHERE NOT EXISTS (
    SELECT 1 FROM usuarios_comercio WHERE comercio_id = '55555555-5555-5555-5555-555555555555' AND nombre = 'Génesis Salvatierra'
);

INSERT INTO usuarios_comercio (comercio_id, nombre, email, telefono, rol, pin_acceso)
SELECT 
    '55555555-5555-5555-5555-555555555555',
    'Carlos Mendoza (Caja)',
    'carlos.caja@elbuensabor.ec',
    '+593981122334',
    'cajero',
    '1234'
WHERE NOT EXISTS (
    SELECT 1 FROM usuarios_comercio WHERE comercio_id = '55555555-5555-5555-5555-555555555555' AND nombre = 'Carlos Mendoza (Caja)'
);

INSERT INTO usuarios_comercio (comercio_id, nombre, email, telefono, rol, pin_acceso)
SELECT 
    '55555555-5555-5555-5555-555555555555',
    'Don Pedro (Jefe de Cocina)',
    'pedro.cocina@elbuensabor.ec',
    '+593989988776',
    'cocina',
    '5678'
WHERE NOT EXISTS (
    SELECT 1 FROM usuarios_comercio WHERE comercio_id = '55555555-5555-5555-5555-555555555555' AND nombre = 'Don Pedro (Jefe de Cocina)'
);

-- 2. EDEM PESCADOS Y MARISCOS (Retail / Marisquería)
INSERT INTO usuarios_comercio (comercio_id, nombre, email, telefono, rol, pin_acceso)
SELECT 
    id,
    'Edem Administrador',
    'admin@edem.ec',
    '+593988776655',
    'administrador',
    '9999'
FROM comercios WHERE nombre_comercial ILIKE '%EDEM PESCADOS%'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO usuarios_comercio (comercio_id, nombre, email, telefono, rol, pin_acceso)
SELECT 
    id,
    'Javier (Picker & Despacho Percha)',
    'javier.picker@edem.ec',
    '+593984433221',
    'picker',
    '4321'
FROM comercios WHERE nombre_comercial ILIKE '%EDEM PESCADOS%'
LIMIT 1
ON CONFLICT DO NOTHING;
