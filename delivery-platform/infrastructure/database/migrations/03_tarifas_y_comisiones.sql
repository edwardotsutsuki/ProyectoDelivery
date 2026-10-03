-- Migration 03: Configuracion de Tarifas Zonales y Comisiones Comerciales
-- Permite tarifas fijas adaptadas a Baba y Babahoyo con comisiones versatiles y editables

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabla de configuración de tarifas
CREATE TABLE IF NOT EXISTS configuracion_tarifas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canton VARCHAR(100) NOT NULL,
    zona_nombre VARCHAR(120) NOT NULL,
    descripcion TEXT,
    radio_max_km NUMERIC(6,2) DEFAULT 3.00,
    tarifa_envio NUMERIC(10,2) NOT NULL DEFAULT 1.00,
    comision_repartidor_pct NUMERIC(5,2) NOT NULL DEFAULT 80.00,
    comision_plataforma_pct NUMERIC(5,2) NOT NULL DEFAULT 20.00,
    tarifa_servicio_cliente NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    tiempo_estimado_min INT DEFAULT 25,
    is_activa BOOLEAN DEFAULT TRUE,
    orden INT DEFAULT 0,
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Campos de planes de comisión para comercios
ALTER TABLE comercios 
    ADD COLUMN IF NOT EXISTS tipo_comision VARCHAR(30) DEFAULT 'porcentaje',
    ADD COLUMN IF NOT EXISTS valor_comision NUMERIC(10,2) DEFAULT 10.00,
    ADD COLUMN IF NOT EXISTS cuota_mensual NUMERIC(10,2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS subsidia_envio BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS tarifa_fija_local NUMERIC(10,2) DEFAULT NULL;

-- 3. Campos contables y desglose de ganancia por orden
ALTER TABLE pedidos
    ADD COLUMN IF NOT EXISTS tarifa_servicio NUMERIC(10,2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS comision_comercio NUMERIC(10,2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS ganancia_repartidor NUMERIC(10,2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS ganancia_plataforma NUMERIC(10,2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS pago_neto_comercio NUMERIC(10,2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS zona_tarifa_id UUID REFERENCES configuracion_tarifas(id) ON DELETE SET NULL;

-- 4. Semillas de tarifas iniciales
INSERT INTO configuracion_tarifas (canton, zona_nombre, descripcion, radio_max_km, tarifa_envio, comision_repartidor_pct, comision_plataforma_pct, tarifa_servicio_cliente, tiempo_estimado_min, orden)
SELECT 'Baba', 'Baba Urbano (Centro y Barrios)', 'Casco urbano central, parque central, Barrio San Antonio, El Mamey, La Pista', 2.50, 1.00, 80.00, 20.00, 0.00, 20, 1
WHERE NOT EXISTS (SELECT 1 FROM configuracion_tarifas WHERE canton = 'Baba' AND zona_nombre = 'Baba Urbano (Centro y Barrios)');

INSERT INTO configuracion_tarifas (canton, zona_nombre, descripcion, radio_max_km, tarifa_envio, comision_repartidor_pct, comision_plataforma_pct, tarifa_servicio_cliente, tiempo_estimado_min, orden)
SELECT 'Baba', 'Baba Periferia y Sectores Cercanos', 'Sectores periféricos a las afueras del cantón (Hasta 5.5 km)', 5.50, 1.50, 80.00, 20.00, 0.00, 30, 2
WHERE NOT EXISTS (SELECT 1 FROM configuracion_tarifas WHERE canton = 'Baba' AND zona_nombre = 'Baba Periferia y Sectores Cercanos');

INSERT INTO configuracion_tarifas (canton, zona_nombre, descripcion, radio_max_km, tarifa_envio, comision_repartidor_pct, comision_plataforma_pct, tarifa_servicio_cliente, tiempo_estimado_min, orden)
SELECT 'Baba', 'Recintos y Zonas Rurales Baba', 'Recintos más alejados (Arenillas, Guare, etc.)', 12.00, 2.50, 84.00, 16.00, 0.25, 45, 3
WHERE NOT EXISTS (SELECT 1 FROM configuracion_tarifas WHERE canton = 'Baba' AND zona_nombre = 'Recintos y Zonas Rurales Baba');

INSERT INTO configuracion_tarifas (canton, zona_nombre, descripcion, radio_max_km, tarifa_envio, comision_repartidor_pct, comision_plataforma_pct, tarifa_servicio_cliente, tiempo_estimado_min, orden)
SELECT 'Babahoyo', 'Babahoyo Urbano Central', 'Centro de Babahoyo, Malecón 9 de Octubre, Terminal Terrestre', 4.00, 1.50, 80.00, 20.00, 0.00, 25, 4
WHERE NOT EXISTS (SELECT 1 FROM configuracion_tarifas WHERE canton = 'Babahoyo' AND zona_nombre = 'Babahoyo Urbano Central');

INSERT INTO configuracion_tarifas (canton, zona_nombre, descripcion, radio_max_km, tarifa_envio, comision_repartidor_pct, comision_plataforma_pct, tarifa_servicio_cliente, tiempo_estimado_min, orden)
SELECT 'Babahoyo', 'Babahoyo Periferia y El Salto', 'Sectores periurbanos, El Salto, Puerta Negra, La Chorrera', 7.00, 2.00, 80.00, 20.00, 0.00, 35, 5
WHERE NOT EXISTS (SELECT 1 FROM configuracion_tarifas WHERE canton = 'Babahoyo' AND zona_nombre = 'Babahoyo Periferia y El Salto');
