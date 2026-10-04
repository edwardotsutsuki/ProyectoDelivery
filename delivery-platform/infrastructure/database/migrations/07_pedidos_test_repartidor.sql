-- Pedido 1: Restaurante en Baba (Oferta Prioritaria para Carlos Mendoza rep-baba-01)
INSERT INTO pedidos (
  id, cliente_id, comercio_id, estado, metodo_pago, subtotal, costo_envio, total, 
  ganancia_repartidor, direccion_entrega, ubicacion_entrega, notas, 
  repartidor_asignado_inicial, fecha_expiracion_oferta, preferencia_sustitucion, numero_bultos
) VALUES (
  '11111111-aaaa-bbbb-cccc-000000000001',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555',
  'listo',
  'efectivo',
  7.00,
  1.00,
  8.00,
  1.25,
  'Barrio San Pedro, frente a la Iglesia',
  ST_SetSRID(ST_MakePoint(-79.6750, -1.7890), 4326),
  'Caldo bien caliente y fundas selladas. Traer cambio de $20.',
  '33333333-3333-3333-3333-333333333333',
  NOW() + interval '120 seconds',
  'llamar_al_cliente',
  1
) ON CONFLICT (id) DO UPDATE SET 
  estado = 'listo', repartidor_id = NULL, repartidor_asignado_inicial = '33333333-3333-3333-3333-333333333333', fecha_expiracion_oferta = NOW() + interval '120 seconds';

-- Ítems para Pedido 1
DELETE FROM pedidos_items WHERE pedido_id = '11111111-aaaa-bbbb-cccc-000000000001';
INSERT INTO pedidos_items (id, pedido_id, producto_id, cantidad, precio_unitario, notas)
VALUES 
  (gen_random_uuid(), '11111111-aaaa-bbbb-cccc-000000000001', (SELECT id FROM productos WHERE comercio_id = '55555555-5555-5555-5555-555555555555' LIMIT 1), 2, 3.50, 'Sin cebolla');

-- Pedido 2: Supermercado en Baba (Pool General para todos los repartidores)
INSERT INTO pedidos (
  id, cliente_id, comercio_id, estado, metodo_pago, subtotal, costo_envio, total, 
  ganancia_repartidor, direccion_entrega, ubicacion_entrega, notas, 
  repartidor_asignado_inicial, fecha_expiracion_oferta, preferencia_sustitucion, numero_bultos
) VALUES (
  '22222222-aaaa-bbbb-cccc-000000000002',
  '44444444-4444-4444-4444-444444444444',
  '3efe0c84-0b81-4191-8193-699c81fc26be',
  'listo',
  'transferencia',
  12.50,
  1.50,
  14.00,
  1.75,
  'Av. Guayaquil y Malecón de Baba',
  ST_SetSRID(ST_MakePoint(-79.6820, -1.7940), 4326),
  'Productos refrigerados. 2 fundas pesadas con hielo.',
  NULL,
  NULL,
  'reemplazar_similar',
  2
) ON CONFLICT (id) DO UPDATE SET 
  estado = 'listo', repartidor_id = NULL, repartidor_asignado_inicial = NULL, fecha_expiracion_oferta = NULL;

-- Ítems para Pedido 2
DELETE FROM pedidos_items WHERE pedido_id = '22222222-aaaa-bbbb-cccc-000000000002';
INSERT INTO pedidos_items (id, pedido_id, producto_id, cantidad, precio_unitario, notas)
VALUES 
  (gen_random_uuid(), '22222222-aaaa-bbbb-cccc-000000000002', (SELECT id FROM productos WHERE comercio_id = '3efe0c84-0b81-4191-8193-699c81fc26be' LIMIT 1), 1, 12.50, 'Funda doble');
