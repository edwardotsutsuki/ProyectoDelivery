-- ============================================================================
-- MIGRACIÓN 11: INTEGRACIÓN COMPLETA DEL ECOSISTEMA DE PEDIDOS, PIN Y CHAT
-- Asegura columnas requeridas para validación de entregas con PIN y mensajería
-- ============================================================================

-- 1. Agregar columna leido en mensajes_pedidos si no existe
ALTER TABLE mensajes_pedidos ADD COLUMN IF NOT EXISTS leido BOOLEAN DEFAULT false;

-- 2. Agregar columna pin_entrega en pedidos si no existe
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS pin_entrega VARCHAR(6) DEFAULT '1234';

-- 3. Asignar PINs aleatorios de 4 dígitos a órdenes existentes para pruebas
UPDATE pedidos 
SET pin_entrega = LPAD((abs(hashtext(id::text)) % 9000 + 1000)::text, 4, '0')
WHERE pin_entrega IS NULL OR pin_entrega = '1234';
