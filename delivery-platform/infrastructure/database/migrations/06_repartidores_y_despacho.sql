-- ============================================================================
-- Migración 06: Ampliación de Repartidores, Metadatos de Despacho y Verticales
-- ============================================================================

-- 1. Añadir columnas de vehículo y disponibilidad a usuarios si no existen
ALTER TABLE usuarios 
  ADD COLUMN IF NOT EXISTS tipo_vehiculo VARCHAR(30) DEFAULT 'moto',
  ADD COLUMN IF NOT EXISTS modelo_vehiculo VARCHAR(100) DEFAULT 'Motocicleta Estándar',
  ADD COLUMN IF NOT EXISTS placa_vehiculo VARCHAR(20) DEFAULT 'S/P',
  ADD COLUMN IF NOT EXISTS cant_entregas_completadas INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS calificacion_promedio NUMERIC(2,1) DEFAULT 5.0;

-- 2. Añadir campos para despacho inteligente y verticales a tabla pedidos
ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS preferencia_sustitucion VARCHAR(50) DEFAULT 'reemplazar_similar',
  ADD COLUMN IF NOT EXISTS numero_bultos INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS receta_url TEXT,
  ADD COLUMN IF NOT EXISTS requiere_receta BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS control_edad_18 BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS repartidor_asignado_inicial UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fecha_expiracion_oferta TIMESTAMP WITH TIME ZONE;

-- 3. Actualizar al repartidor existente Carlos Mendoza
UPDATE usuarios 
SET 
  nombre = 'Carlos Mendoza (Moto Honda)',
  tipo_vehiculo = 'moto',
  modelo_vehiculo = 'Honda GL 150cc',
  placa_vehiculo = 'GR-891A',
  ubicacion = ST_SetSRID(ST_MakePoint(-79.6783, -1.7917), 4326),
  cant_entregas_completadas = 42,
  calificacion_promedio = 4.9
WHERE id = '33333333-3333-3333-3333-333333333333';

-- 4. Semillas de 9 Repartidores adicionales (completando 10 repartidores en total)
INSERT INTO usuarios (id, nombre, email, password_hash, telefono, rol, ubicacion, tipo_vehiculo, modelo_vehiculo, placa_vehiculo, cant_entregas_completadas, calificacion_promedio, estado_activo)
VALUES
  -- 2. Anthony Vera (Baba San Antonio)
  ('33333333-3333-3333-3333-333333333332', 'Anthony Vera (Moto Yamaha)', 'repartidor2@delivery.com', 
   '$2a$10$aS.BXH/Grwzzbs7M6s7oYumJgtDuYco43AU5ATJ.wgwdw1SQK0D8e', '+593980112233', 'repartidor', 
   ST_SetSRID(ST_MakePoint(-79.6810, -1.7940), 4326), 'moto', 'Yamaha FZ 150', 'GS-412B', 28, 4.8, true),

  -- 3. David Barzola (Baba Parque Central)
  ('33333333-3333-3333-3333-333333333334', 'David Barzola (Moto Boxer)', 'repartidor3@delivery.com', 
   '$2a$10$aS.BXH/Grwzzbs7M6s7oYumJgtDuYco43AU5ATJ.wgwdw1SQK0D8e', '+593981223344', 'repartidor', 
   ST_SetSRID(ST_MakePoint(-79.6740, -1.7895), 4326), 'moto', 'Bajaj Boxer BM150', 'LQ-932C', 35, 5.0, true),

  -- 4. Jhonny Moreira (Baba Periferia - Bicicleta)
  ('33333333-3333-3333-3333-333333333335', 'Jhonny Moreira (Bicicleta de Carga)', 'repartidor4@delivery.com', 
   '$2a$10$aS.BXH/Grwzzbs7M6s7oYumJgtDuYco43AU5ATJ.wgwdw1SQK0D8e', '+593982334455', 'repartidor', 
   ST_SetSRID(ST_MakePoint(-79.6790, -1.7960), 4326), 'bicicleta', 'Bicicleta de Reparto Carga', 'S/P', 15, 4.7, true),

  -- 5. Bryan Coello (Babahoyo Malecón)
  ('33333333-3333-3333-3333-333333333336', 'Bryan Coello (Moto Suzuki)', 'repartidor5@delivery.com', 
   '$2a$10$aS.BXH/Grwzzbs7M6s7oYumJgtDuYco43AU5ATJ.wgwdw1SQK0D8e', '+593983445566', 'repartidor', 
   ST_SetSRID(ST_MakePoint(-79.5344, -1.8022), 4326), 'moto', 'Suzuki GN 125', 'LR-551D', 63, 4.9, true),

  -- 6. Washington Silva (Babahoyo Terminal)
  ('33333333-3333-3333-3333-333333333337', 'Washington Silva (Moto Daytona)', 'repartidor6@delivery.com', 
   '$2a$10$aS.BXH/Grwzzbs7M6s7oYumJgtDuYco43AU5ATJ.wgwdw1SQK0D8e', '+593984556677', 'repartidor', 
   ST_SetSRID(ST_MakePoint(-79.5390, -1.8060), 4326), 'moto', 'Daytona Wolf 200', 'LR-772E', 50, 4.8, true),

  -- 7. Félix Macías (Babahoyo UTB - Bici Eléctrica)
  ('33333333-3333-3333-3333-333333333338', 'Félix Macías (Bicicleta Eléctrica)', 'repartidor7@delivery.com', 
   '$2a$10$aS.BXH/Grwzzbs7M6s7oYumJgtDuYco43AU5ATJ.wgwdw1SQK0D8e', '+593985667788', 'repartidor', 
   ST_SetSRID(ST_MakePoint(-79.5310, -1.7990), 4326), 'bicicleta', 'E-Bike Urbana 500W', 'S/P', 19, 4.9, true),

  -- 8. Darwin Quintana (Babahoyo El Salto)
  ('33333333-3333-3333-3333-333333333339', 'Darwin Quintana (Moto Shineray)', 'repartidor8@delivery.com', 
   '$2a$10$aS.BXH/Grwzzbs7M6s7oYumJgtDuYco43AU5ATJ.wgwdw1SQK0D8e', '+593986778899', 'repartidor', 
   ST_SetSRID(ST_MakePoint(-79.5420, -1.8110), 4326), 'moto', 'Shineray Custom 150', 'LR-119F', 31, 4.7, true),

  -- 9. Cristian Morán (Montalvo Centro)
  ('33333333-3333-3333-3333-333333333340', 'Cristian Morán (Moto Pulsar)', 'repartidor9@delivery.com', 
   '$2a$10$aS.BXH/Grwzzbs7M6s7oYumJgtDuYco43AU5ATJ.wgwdw1SQK0D8e', '+593987889900', 'repartidor', 
   ST_SetSRID(ST_MakePoint(-79.2876, -1.7901), 4326), 'moto', 'Bajaj Pulsar NS 200', 'LM-301G', 44, 5.0, true),

  -- 10. Jonathan Vargas (Montalvo Balnearios)
  ('33333333-3333-3333-3333-333333333341', 'Jonathan Vargas (Moto Storm)', 'repartidor10@delivery.com', 
   '$2a$10$aS.BXH/Grwzzbs7M6s7oYumJgtDuYco43AU5ATJ.wgwdw1SQK0D8e', '+593988990011', 'repartidor', 
   ST_SetSRID(ST_MakePoint(-79.2840, -1.7870), 4326), 'moto', 'Honda Storm 125', 'LM-882H', 22, 4.8, true)
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  tipo_vehiculo = EXCLUDED.tipo_vehiculo,
  modelo_vehiculo = EXCLUDED.modelo_vehiculo,
  placa_vehiculo = EXCLUDED.placa_vehiculo,
  ubicacion = EXCLUDED.ubicacion,
  estado_activo = true;
