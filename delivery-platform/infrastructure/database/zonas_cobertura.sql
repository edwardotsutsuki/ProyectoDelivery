-- ============================================================================
-- MIGRACIÓN: TABLA DE ZONAS DE COBERTURA Y POLÍGONOS GEOESPACIALES
-- Cantón Baba & Cantón Babahoyo (Los Ríos, Ecuador)
-- ============================================================================

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
