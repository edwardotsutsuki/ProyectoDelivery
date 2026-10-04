-- ============================================================================
-- MIGRACIÓN 10: ASIGNACIÓN Y DISTRIBUCIÓN DE REPARTIDORES ENTRE BABA, BABAHOYO Y MONTALVO
-- ============================================================================

-- 1. ACTUALIZAR LOS 10 REPARTIDORES CON SU CIUDAD EXPLÍCITA Y COORDENADAS EXACTAS
-- ----------------------------------------------------------------------------
-- BABA (4 repartidores)
UPDATE usuarios SET 
  nombre = '[Baba] Carlos Mendoza (Moto Honda GL150)',
  email = 'repartidor@delivery.com',
  telefono = '+593981112233',
  tipo_vehiculo = 'moto',
  modelo_vehiculo = 'Honda GL 150cc',
  placa_vehiculo = 'GR-891A',
  cant_entregas_completadas = 48,
  calificacion_promedio = 4.9,
  ubicacion = ST_SetSRID(ST_MakePoint(-79.6783, -1.7917), 4326),
  estado_activo = true
WHERE id = '33333333-3333-3333-3333-333333333333';

UPDATE usuarios SET 
  nombre = '[Baba] Anthony Vera (Moto Yamaha FZ)',
  email = 'repartidor2@delivery.com',
  telefono = '+593982223344',
  tipo_vehiculo = 'moto',
  modelo_vehiculo = 'Yamaha FZ 150',
  placa_vehiculo = 'GS-412B',
  cant_entregas_completadas = 36,
  calificacion_promedio = 4.8,
  ubicacion = ST_SetSRID(ST_MakePoint(-79.6810, -1.7940), 4326),
  estado_activo = true
WHERE id = '33333333-3333-3333-3333-333333333332';

UPDATE usuarios SET 
  nombre = '[Baba] David Barzola (Moto Boxer BM150)',
  email = 'repartidor3@delivery.com',
  telefono = '+593983334455',
  tipo_vehiculo = 'moto',
  modelo_vehiculo = 'Bajaj Boxer BM150',
  placa_vehiculo = 'LQ-932C',
  cant_entregas_completadas = 29,
  calificacion_promedio = 4.9,
  ubicacion = ST_SetSRID(ST_MakePoint(-79.6740, -1.7895), 4326),
  estado_activo = true
WHERE id = '33333333-3333-3333-3333-333333333334';

UPDATE usuarios SET 
  nombre = '[Baba] Jhonny Moreira (Bicicleta de Carga)',
  email = 'repartidor4@delivery.com',
  telefono = '+593984445566',
  tipo_vehiculo = 'bicicleta',
  modelo_vehiculo = 'Bicicleta de Carga Urbana',
  placa_vehiculo = 'S/P',
  cant_entregas_completadas = 18,
  calificacion_promedio = 4.7,
  ubicacion = ST_SetSRID(ST_MakePoint(-79.6790, -1.7960), 4326),
  estado_activo = true
WHERE id = '33333333-3333-3333-3333-333333333335';

-- BABAHOYO (3 repartidores)
UPDATE usuarios SET 
  nombre = '[Babahoyo] Bryan Coello (Moto Suzuki GN125)',
  email = 'repartidor5@delivery.com',
  telefono = '+593985556677',
  tipo_vehiculo = 'moto',
  modelo_vehiculo = 'Suzuki GN 125',
  placa_vehiculo = 'LR-551D',
  cant_entregas_completadas = 65,
  calificacion_promedio = 5.0,
  ubicacion = ST_SetSRID(ST_MakePoint(-79.5344, -1.8022), 4326),
  estado_activo = true
WHERE id = '33333333-3333-3333-3333-333333333336';

UPDATE usuarios SET 
  nombre = '[Babahoyo] Washington Silva (Moto Daytona 200)',
  email = 'repartidor6@delivery.com',
  telefono = '+593986667788',
  tipo_vehiculo = 'moto',
  modelo_vehiculo = 'Daytona Wolf 200',
  placa_vehiculo = 'LR-772E',
  cant_entregas_completadas = 52,
  calificacion_promedio = 4.8,
  ubicacion = ST_SetSRID(ST_MakePoint(-79.5390, -1.8060), 4326),
  estado_activo = true
WHERE id = '33333333-3333-3333-3333-333333333337';

UPDATE usuarios SET 
  nombre = '[Babahoyo] Félix Macías (E-Bike Urbana 500W)',
  email = 'repartidor7@delivery.com',
  telefono = '+593987778899',
  tipo_vehiculo = 'bicicleta',
  modelo_vehiculo = 'E-Bike Urbana 500W',
  placa_vehiculo = 'S/P',
  cant_entregas_completadas = 24,
  calificacion_promedio = 4.9,
  ubicacion = ST_SetSRID(ST_MakePoint(-79.5310, -1.7990), 4326),
  estado_activo = true
WHERE id = '33333333-3333-3333-3333-333333333338';

-- MONTALVO (3 repartidores)
UPDATE usuarios SET 
  nombre = '[Montalvo] Darwin Quintana (Moto Shineray 150)',
  email = 'repartidor8@delivery.com',
  telefono = '+593988889900',
  tipo_vehiculo = 'moto',
  modelo_vehiculo = 'Shineray Custom 150',
  placa_vehiculo = 'LM-119F',
  cant_entregas_completadas = 38,
  calificacion_promedio = 4.8,
  ubicacion = ST_SetSRID(ST_MakePoint(-79.2895, -1.7918), 4326),
  estado_activo = true
WHERE id = '33333333-3333-3333-3333-333333333339';

UPDATE usuarios SET 
  nombre = '[Montalvo] Cristian Morán (Moto Pulsar NS200)',
  email = 'repartidor9@delivery.com',
  telefono = '+593989990011',
  tipo_vehiculo = 'moto',
  modelo_vehiculo = 'Bajaj Pulsar NS 200',
  placa_vehiculo = 'LM-301G',
  cant_entregas_completadas = 56,
  calificacion_promedio = 5.0,
  ubicacion = ST_SetSRID(ST_MakePoint(-79.2876, -1.7901), 4326),
  estado_activo = true
WHERE id = '33333333-3333-3333-3333-333333333340';

UPDATE usuarios SET 
  nombre = '[Montalvo] Jonathan Vargas (Moto Storm 125)',
  email = 'repartidor10@delivery.com',
  telefono = '+593980001122',
  tipo_vehiculo = 'moto',
  modelo_vehiculo = 'Honda Storm 125',
  placa_vehiculo = 'LM-882H',
  cant_entregas_completadas = 31,
  calificacion_promedio = 4.9,
  ubicacion = ST_SetSRID(ST_MakePoint(-79.2840, -1.7870), 4326),
  estado_activo = true
WHERE id = '33333333-3333-3333-3333-333333333341';

-- ----------------------------------------------------------------------------
-- 2. GENERAR Y ACTUALIZAR PEDIDOS DE PRUEBA EN CADA CIUDAD
-- ----------------------------------------------------------------------------

-- PEDIDO BABAHOYO 1 (Listo para recoger / disponible para conductores de Babahoyo)
INSERT INTO pedidos (
  id, cliente_id, comercio_id, estado, metodo_pago,
  subtotal, costo_envio, total, ganancia_repartidor, ganancia_plataforma, pago_neto_comercio,
  direccion_entrega, ubicacion_entrega, notas, repartidor_id
) VALUES (
  '44444444-bb01-4000-8000-000000000001',
  '44444444-4444-4444-4444-444444444444',
  '77777777-7777-7777-7777-777777777777', -- Restaurante El Gran Chef Babahoyo
  'listo',
  'efectivo',
  11.50, 1.50, 13.00, 1.20, 0.30, 10.35,
  'Cdla. El Mamey Mz. 4 Villa 8, Babahoyo',
  ST_SetSRID(ST_MakePoint(-79.5380, -1.8040), 4326),
  'Por favor timbrar en la puerta blanca.',
  NULL
) ON CONFLICT (id) DO UPDATE SET
  estado = 'listo',
  repartidor_id = NULL,
  total = EXCLUDED.total,
  fecha_actualizacion = NOW();

DELETE FROM pedidos_items WHERE pedido_id = '44444444-bb01-4000-8000-000000000001';
INSERT INTO pedidos_items (pedido_id, producto_id, cantidad, precio_unitario)
VALUES 
  ('44444444-bb01-4000-8000-000000000001', 'fef2a63d-58aa-43b1-8ef5-85f12b6de8ab', 1, 9.50), -- Bife de Chorizo
  ('44444444-bb01-4000-8000-000000000001', '7e18619a-2540-499e-9232-90a92194503e', 1, 2.00); -- Limonada con Menta

-- PEDIDO BABAHOYO 2 (En camino - asignado a Bryan Coello para probar PIN y Entrega)
INSERT INTO pedidos (
  id, cliente_id, comercio_id, estado, metodo_pago,
  subtotal, costo_envio, total, ganancia_repartidor, ganancia_plataforma, pago_neto_comercio,
  direccion_entrega, ubicacion_entrega, notas, repartidor_id
) VALUES (
  '44444444-bb02-4000-8000-000000000002',
  '44444444-4444-4444-4444-444444444444',
  '77777777-7777-7777-7777-777777777777', -- Restaurante El Gran Chef Babahoyo
  'en_camino',
  'efectivo',
  8.00, 1.50, 9.50, 1.20, 0.30, 7.20,
  'Av. Universitaria frente a la Facultad de Agronomía UTB, Babahoyo',
  ST_SetSRID(ST_MakePoint(-79.5310, -1.7990), 4326),
  'Llamar al llegar, estoy en la garita principal.',
  '33333333-3333-3333-3333-333333333336' -- Bryan Coello [Babahoyo]
) ON CONFLICT (id) DO UPDATE SET
  estado = 'en_camino',
  repartidor_id = '33333333-3333-3333-3333-333333333336',
  total = EXCLUDED.total,
  fecha_actualizacion = NOW();

DELETE FROM pedidos_items WHERE pedido_id = '44444444-bb02-4000-8000-000000000002';
INSERT INTO pedidos_items (pedido_id, producto_id, cantidad, precio_unitario)
VALUES 
  ('44444444-bb02-4000-8000-000000000002', '91f59a83-5d5f-4ce5-8460-9a8d8eecf0ea', 1, 8.00); -- Corvina Frita

-- PEDIDO MONTALVO 1 (Listo para despacho en Asadero El Rincón Montalvino)
INSERT INTO pedidos (
  id, cliente_id, comercio_id, estado, metodo_pago,
  subtotal, costo_envio, total, ganancia_repartidor, ganancia_plataforma, pago_neto_comercio,
  direccion_entrega, ubicacion_entrega, notas, repartidor_id
) VALUES (
  '33333333-0001-4000-8000-000000000001',
  '44444444-4444-4444-4444-444444444444',
  '88888888-0001-4000-8000-000000000001', -- El Rincón Montalvino
  'listo',
  'efectivo',
  7.00, 1.25, 8.25, 1.00, 0.25, 6.30,
  'Barrio Las Balsas, Calle Velasco Ibarra, Montalvo',
  ST_SetSRID(ST_MakePoint(-79.2890, -1.7925), 4326),
  'Aji picante extra.',
  NULL
) ON CONFLICT (id) DO UPDATE SET
  estado = 'listo',
  repartidor_id = NULL,
  total = EXCLUDED.total,
  fecha_actualizacion = NOW();

DELETE FROM pedidos_items WHERE pedido_id = '33333333-0001-4000-8000-000000000001';
INSERT INTO pedidos_items (pedido_id, producto_id, cantidad, precio_unitario)
VALUES 
  ('33333333-0001-4000-8000-000000000001', '99999999-0001-4000-8000-000000000001', 1, 4.50), -- Pollo Asado
  ('33333333-0001-4000-8000-000000000001', '99999999-0003-4000-8000-000000000001', 1, 2.50); -- Jugo Naranja

-- PEDIDO MONTALVO 2 (En camino - asignado a Cristian Morán para probar PIN y Foto en Montalvo)
INSERT INTO pedidos (
  id, cliente_id, comercio_id, estado, metodo_pago,
  subtotal, costo_envio, total, ganancia_repartidor, ganancia_plataforma, pago_neto_comercio,
  direccion_entrega, ubicacion_entrega, notas, repartidor_id
) VALUES (
  '33333333-0002-4000-8000-000000000002',
  '44444444-4444-4444-4444-444444444444',
  '88888888-0002-4000-8000-000000000002', -- Supermercado San Vicente Montalvo
  'en_camino',
  'efectivo',
  11.20, 1.50, 12.70, 1.20, 0.30, 10.08,
  'Sector La Esmeralda, Vía Río Cristal Km 2, Montalvo',
  ST_SetSRID(ST_MakePoint(-79.2855, -1.7890), 4326),
  'Casa esquinera de dos pisos color verde.',
  '33333333-3333-3333-3333-333333333340' -- Cristian Morán [Montalvo]
) ON CONFLICT (id) DO UPDATE SET
  estado = 'en_camino',
  repartidor_id = '33333333-3333-3333-3333-333333333340',
  total = EXCLUDED.total,
  fecha_actualizacion = NOW();

DELETE FROM pedidos_items WHERE pedido_id = '33333333-0002-4000-8000-000000000002';
INSERT INTO pedidos_items (pedido_id, producto_id, cantidad, precio_unitario)
VALUES 
  ('33333333-0002-4000-8000-000000000002', '99999999-0004-4000-8000-000000000002', 1, 4.80), -- Arroz Flor 5kg
  ('33333333-0002-4000-8000-000000000002', '99999999-0005-4000-8000-000000000002', 1, 2.60), -- Aceite Favorita
  ('33333333-0002-4000-8000-000000000002', '99999999-0006-4000-8000-000000000002', 1, 3.80); -- Huevos x30

-- PEDIDO MONTALVO 3 (Listo en Farmacia Montalvo Salud)
INSERT INTO pedidos (
  id, cliente_id, comercio_id, estado, metodo_pago,
  subtotal, costo_envio, total, ganancia_repartidor, ganancia_plataforma, pago_neto_comercio,
  direccion_entrega, ubicacion_entrega, notas, repartidor_id
) VALUES (
  '33333333-0003-4000-8000-000000000003',
  '44444444-4444-4444-4444-444444444444',
  '88888888-0003-4000-8000-000000000003', -- Farmacia Montalvo Salud
  'listo',
  'efectivo',
  4.25, 1.00, 5.25, 0.80, 0.20, 3.82,
  'Av. 25 de Abril, cerca del Colegio Montalvo',
  ST_SetSRID(ST_MakePoint(-79.2840, -1.7880), 4326),
  'Entregar en farmacia comunitaria.',
  NULL
) ON CONFLICT (id) DO UPDATE SET
  estado = 'listo',
  repartidor_id = NULL,
  total = EXCLUDED.total,
  fecha_actualizacion = NOW();

DELETE FROM pedidos_items WHERE pedido_id = '33333333-0003-4000-8000-000000000003';
INSERT INTO pedidos_items (pedido_id, producto_id, cantidad, precio_unitario)
VALUES 
  ('33333333-0003-4000-8000-000000000003', '99999999-0007-4000-8000-000000000003', 1, 2.00), -- Paracetamol
  ('33333333-0003-4000-8000-000000000003', '99999999-0008-4000-8000-000000000003', 1, 2.25); -- Electrolit

-- PEDIDO BABA 1 (Listo para despacho en Picantería El Buen Sabor)
INSERT INTO pedidos (
  id, cliente_id, comercio_id, estado, metodo_pago,
  subtotal, costo_envio, total, ganancia_repartidor, ganancia_plataforma, pago_neto_comercio,
  direccion_entrega, ubicacion_entrega, notas, repartidor_id
) VALUES (
  '11111111-aaaa-bbbb-cccc-000000000001',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555', -- Picantería El Buen Sabor Baba
  'listo',
  'efectivo',
  6.50, 1.50, 8.00, 1.20, 0.30, 5.85,
  'Calle Sucre y Rocafuerte, frente a la Iglesia Matriz, Baba',
  ST_SetSRID(ST_MakePoint(-79.6750, -1.7890), 4326),
  'Entregar caliente por favor.',
  NULL
) ON CONFLICT (id) DO UPDATE SET
  estado = 'listo',
  repartidor_id = NULL,
  total = EXCLUDED.total,
  fecha_actualizacion = NOW();

DELETE FROM pedidos_items WHERE pedido_id = '11111111-aaaa-bbbb-cccc-000000000001';
INSERT INTO pedidos_items (pedido_id, producto_id, cantidad, precio_unitario)
VALUES 
  ('11111111-aaaa-bbbb-cccc-000000000001', '66666666-6666-6666-6666-666666666601', 1, 4.50), -- Seco de Gallina
  ('11111111-aaaa-bbbb-cccc-000000000001', '66666666-6666-6666-6666-666666666606', 1, 2.00); -- Patacones con Queso

-- PEDIDO BABA 2 (En camino - asignado a Carlos Mendoza para probar PIN y Foto en Baba)
INSERT INTO pedidos (
  id, cliente_id, comercio_id, estado, metodo_pago,
  subtotal, costo_envio, total, ganancia_repartidor, ganancia_plataforma, pago_neto_comercio,
  direccion_entrega, ubicacion_entrega, notas, repartidor_id
) VALUES (
  '22222222-aaaa-bbbb-cccc-000000000002',
  '44444444-4444-4444-4444-444444444444',
  '3efe0c84-0b81-4191-8193-699c81fc26be', -- EDEM Pescados y Mariscos Baba
  'en_camino',
  'efectivo',
  12.50, 1.50, 14.00, 1.20, 0.30, 11.25,
  'Barrio San Antonio, Calle Bolívar y Guayaquil, Baba',
  ST_SetSRID(ST_MakePoint(-79.6820, -1.7940), 4326),
  'Traer cambio de billete de $20.',
  '33333333-3333-3333-3333-333333333333' -- Carlos Mendoza [Baba]
) ON CONFLICT (id) DO UPDATE SET
  estado = 'en_camino',
  repartidor_id = '33333333-3333-3333-3333-333333333333',
  total = EXCLUDED.total,
  fecha_actualizacion = NOW();

DELETE FROM pedidos_items WHERE pedido_id = '22222222-aaaa-bbbb-cccc-000000000002';
INSERT INTO pedidos_items (pedido_id, producto_id, cantidad, precio_unitario)
VALUES 
  ('22222222-aaaa-bbbb-cccc-000000000002', 'e15c6643-7112-4d57-b03f-6c1e2b6e849d', 2, 2.75), -- Albacora
  ('22222222-aaaa-bbbb-cccc-000000000002', '519e3b0f-c639-4146-95d9-df2ba2c25ffc', 2, 3.00), -- Camaron Grande
  ('22222222-aaaa-bbbb-cccc-000000000002', '48232571-0379-4d1b-ad17-e8ff23e7e737', 1, 1.25); -- Botellón de Agua
