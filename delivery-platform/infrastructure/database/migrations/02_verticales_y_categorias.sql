-- ============================================================================
-- MIGRACIÓN 02: Verticales de Negocio y Categorías de Catálogo Multi-Comercio
-- ============================================================================

-- 1. Tabla de Tipos de Comercio / Verticales
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

-- Seed de Verticales
INSERT INTO tipos_comercio (id, nombre, descripcion, icono, tipo_layout, requiere_cocina, permite_recetas, control_edad_18, orden) VALUES
('restaurante', 'Restaurantes & Cafeterías', 'Comida preparada al instante, hamburguesas, almuerzos y platos a la carta', '🍔', 'restaurante', true, false, false, 1),
('supermercado', 'Supermercados & Abarrotes', 'Víveres, frutas, verduras, lácteos y productos del hogar', '🛒', 'grid_ecommerce', false, false, false, 2),
('farmacia', 'Farmacias & Salud', 'Medicamentos OTC, cuidado personal, higiene y productos para bebés', '💊', 'grid_ecommerce', false, true, false, 3),
('licorera', 'Licores & Bebidas', 'Cervezas, vinos, licores, hielo y snacks para reuniones (+18)', '🍾', 'grid_ecommerce', false, false, true, 4),
('express', 'Tiendas Express & Antojos', 'Snacks rápidos, bebidas frías y golosinas con entrega ultrarrápida', '⚡', 'grid_ecommerce', false, false, false, 5)
ON CONFLICT (id) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    icono = EXCLUDED.icono,
    tipo_layout = EXCLUDED.tipo_layout,
    requiere_cocina = EXCLUDED.requiere_cocina,
    permite_recetas = EXCLUDED.permite_recetas,
    control_edad_18 = EXCLUDED.control_edad_18;

-- 2. Preferencia de tipo de comercio e inventario en comercios
ALTER TABLE comercios
    ADD COLUMN IF NOT EXISTS tipo_comercio_id VARCHAR(50) DEFAULT 'restaurante' REFERENCES tipos_comercio(id),
    ADD COLUMN IF NOT EXISTS maneja_inventario_general BOOLEAN DEFAULT FALSE;

UPDATE comercios SET tipo_comercio_id = 'restaurante' WHERE tipo_comercio_id IS NULL;

-- 3. Tabla: Categorías de productos por comercio
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

-- 4. Alter productos: soporte de categoría relacional, unidad de medida y stock opcional
ALTER TABLE productos
    ADD COLUMN IF NOT EXISTS categoria_id UUID REFERENCES categorias_productos(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS unidad_medida VARCHAR(20) DEFAULT 'unidad',
    ADD COLUMN IF NOT EXISTS maneja_stock BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS stock_disponible INT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS requiere_receta BOOLEAN DEFAULT FALSE;

-- 5. Poblar categorias_productos a partir de productos existentes
DO $$
DECLARE
    rec RECORD;
    v_cat_id UUID;
BEGIN
    FOR rec IN SELECT DISTINCT comercio_id, COALESCE(NULLIF(categoria, ''), 'General') as cat_nombre FROM productos
    LOOP
        SELECT id INTO v_cat_id FROM categorias_productos WHERE comercio_id = rec.comercio_id AND nombre = rec.cat_nombre;
        IF v_cat_id IS NULL THEN
            INSERT INTO categorias_productos (comercio_id, nombre, orden)
            VALUES (rec.comercio_id, rec.cat_nombre, 1)
            RETURNING id INTO v_cat_id;
        END IF;
        UPDATE productos SET categoria_id = v_cat_id WHERE comercio_id = rec.comercio_id AND (categoria = rec.cat_nombre OR (categoria IS NULL AND rec.cat_nombre = 'General'));
    END LOOP;
END $$;
