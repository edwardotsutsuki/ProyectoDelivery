-- ============================================================================
-- MIGRACIÓN 08: COMERCIOS, PRODUCTOS Y PEDIDOS DE PRUEBA EN MONTALVO, LOS RÍOS
-- Coordenadas: Montalvo Centro (-1.7901, -79.2876)
-- ============================================================================

-- 1. Crear usuarios propietarios de comercios en Montalvo
INSERT INTO usuarios (id, nombre, email, password_hash, rol, telefono, estado_activo, ubicacion)
VALUES
  (
    '66666666-0001-4000-8000-000000000001',
    'Don Segundo (Rincón Montalvino)',
    'rincon.montalvo@delivery.com',
    '$2b$10$wT5gZ/g6J6z.X5h9P7Q.IeaUv790w0eS2L3i4z5a6b7c8d9e0f1g2',
    'comercio',
    '+593987112233',
    true,
    ST_SetSRID(ST_MakePoint(-79.2880, -1.7905), 4326)
  ),
  (
    '66666666-0002-4000-8000-000000000002',
    'Vicente Vera (San Vicente Montalvo)',
    'sanvicente.montalvo@delivery.com',
    '$2b$10$wT5gZ/g6J6z.X5h9P7Q.IeaUv790w0eS2L3i4z5a6b7c8d9e0f1g2',
    'comercio',
    '+593988223344',
    true,
    ST_SetSRID(ST_MakePoint(-79.2865, -1.7898), 4326)
  ),
  (
    '66666666-0003-4000-8000-000000000003',
    'Dra. Elena Castro (Farmacia Montalvo)',
    'farmacia.montalvo@delivery.com',
    '$2b$10$wT5gZ/g6J6z.X5h9P7Q.IeaUv790w0eS2L3i4z5a6b7c8d9e0f1g2',
    'comercio',
    '+593989334455',
    true,
    ST_SetSRID(ST_MakePoint(-79.2875, -1.7912), 4326)
  ),
  (
    '66666666-0004-4000-8000-000000000004',
    'Marcos Quintana (Licorería Nights)',
    'licoreria.montalvo@delivery.com',
    '$2b$10$wT5gZ/g6J6z.X5h9P7Q.IeaUv790w0eS2L3i4z5a6b7c8d9e0f1g2',
    'comercio',
    '+593986445566',
    true,
    ST_SetSRID(ST_MakePoint(-79.2895, -1.7918), 4326)
  )
ON CONFLICT (id) DO UPDATE SET estado_activo = true;

-- 2. Registrar Comercios de Montalvo
INSERT INTO comercios (
  id, usuario_id, nombre_comercial, descripcion, direccion, ubicacion,
  is_abierto, telefono, categoria, tiempo_entrega_promedio, calificacion,
  costo_base_envio, tipo_comercio_id, estado_aprobacion
) VALUES
  (
    '88888888-0001-4000-8000-000000000001',
    '66666666-0001-4000-8000-000000000001',
    'Asadero & Picantería El Rincón Montalvino',
    'Pollo asado al carbón, menestras criollas, secos y platos a la carta típicos de Montalvo',
    'Av. 25 de Abril y 10 de Agosto (Frente al Parque Central), Montalvo',
    ST_SetSRID(ST_MakePoint(-79.2880, -1.7905), 4326),
    true,
    '+593987112233',
    'Restaurante',
    25,
    4.9,
    1.25,
    'restaurante',
    'aprobado'
  ),
  (
    '88888888-0002-4000-8000-000000000002',
    '66666666-0002-4000-8000-000000000002',
    'Supermercado & Víveres San Vicente Montalvo',
    'Abarrotes, víveres frescos, lácteos, embutidos y artículos de primera necesidad para el hogar',
    'Calle Babahoyo y Av. 25 de Abril, Montalvo',
    ST_SetSRID(ST_MakePoint(-79.2865, -1.7898), 4326),
    true,
    '+593988223344',
    'Supermercados',
    30,
    4.8,
    1.50,
    'supermercado',
    'aprobado'
  ),
  (
    '88888888-0003-4000-8000-000000000003',
    '66666666-0003-4000-8000-000000000003',
    'Farmacia Comunitaria Montalvo Salud',
    'Medicamentos generales, analgésicos, cuidado infantil, sueros y primeros auxilios',
    'Calle 10 de Agosto frente al Subcentro de Salud, Montalvo',
    ST_SetSRID(ST_MakePoint(-79.2875, -1.7912), 4326),
    true,
    '+593989334455',
    'Farmacia',
    20,
    5.0,
    1.00,
    'farmacia',
    'aprobado'
  ),
  (
    '88888888-0004-4000-8000-000000000004',
    '66666666-0004-4000-8000-000000000004',
    'Depósito y Licorería Montalvo Nights',
    'Cervezas heladas, rones, vinos, hielo en cubos y snacks (+18)',
    'Malecón del Río Cristal y 25 de Abril, Montalvo',
    ST_SetSRID(ST_MakePoint(-79.2895, -1.7918), 4326),
    true,
    '+593986445566',
    'Licores',
    20,
    4.7,
    1.25,
    'licorera',
    'aprobado'
  )
ON CONFLICT (id) DO UPDATE SET is_abierto = true;

-- 3. Categorías de Productos para cada Comercio de Montalvo
INSERT INTO categorias_productos (id, comercio_id, nombre, descripcion, orden, is_activo)
VALUES
  (
    '77777777-0001-4000-8000-000000000001',
    '88888888-0001-4000-8000-000000000001',
    'Asados & Especialidades',
    'Platos calientes preparados al instante al carbón',
    1,
    true
  ),
  (
    '77777777-0002-4000-8000-000000000002',
    '88888888-0002-4000-8000-000000000002',
    'Despensa y Granos',
    'Víveres básicos y alimentos de primera necesidad',
    1,
    true
  ),
  (
    '77777777-0003-4000-8000-000000000003',
    '88888888-0003-4000-8000-000000000003',
    'Botiquín & Salud',
    'Medicamentos de venta libre y alivio del dolor',
    1,
    true
  ),
  (
    '77777777-0004-4000-8000-000000000004',
    '88888888-0004-4000-8000-000000000004',
    'Bebidas & Cervezas Heladas',
    'Cervezas, licores y hielo (+18)',
    1,
    true
  )
ON CONFLICT (id) DO NOTHING;

-- 4. Productos de Montalvo
INSERT INTO productos (id, comercio_id, categoria_id, nombre, descripcion, precio, is_disponible, stock_disponible)
VALUES
  -- Restaurante Rincón Montalvino
  (
    '99999999-0001-4000-8000-000000000001',
    '88888888-0001-4000-8000-000000000001',
    '77777777-0001-4000-8000-000000000001',
    'Medio Pollo Asado con Menestra y Patacones',
    '1/2 Pollo marinado con finas hierbas y asado al carbón, menestra de lenteja casera y patacones crujientes',
    4.50,
    true,
    30
  ),
  (
    '99999999-0002-4000-8000-000000000002',
    '88888888-0001-4000-8000-000000000001',
    '77777777-0001-4000-8000-000000000001',
    'Seco de Gallina Criolla Montalvina',
    'Tradicional seco de gallina cocinado a fuego lento con cerveza y culantro, arroz amarillo y maduro frito',
    4.00,
    true,
    20
  ),
  (
    '99999999-0003-4000-8000-000000000001',
    '88888888-0001-4000-8000-000000000001',
    '77777777-0001-4000-8000-000000000001',
    'Jarra de Jugo de Naranja Natural 1L',
    'Jugo 100% natural recién exprimido con naranjas dulces de la zona de Montalvo',
    2.50,
    true,
    50
  ),
  -- Supermercado San Vicente
  (
    '99999999-0004-4000-8000-000000000002',
    '88888888-0002-4000-8000-000000000002',
    '77777777-0002-4000-8000-000000000002',
    'Arroz Flor Seleccionado 5kg',
    'Funda de arroz grano largo seleccionado de primera calidad',
    4.80,
    true,
    100
  ),
  (
    '99999999-0005-4000-8000-000000000002',
    '88888888-0002-4000-8000-000000000002',
    '77777777-0002-4000-8000-000000000002',
    'Aceite La Favorita 1 Litro',
    'Aceite vegetal puro ideal para cocina y frituras',
    2.60,
    true,
    80
  ),
  (
    '99999999-0006-4000-8000-000000000002',
    '88888888-0002-4000-8000-000000000002',
    '77777777-0002-4000-8000-000000000002',
    'Cubeta de Huevos Frescos x30',
    'Huevos frescos de granja seleccionados tamaño grande',
    3.80,
    true,
    50
  ),
  -- Farmacia Montalvo Salud
  (
    '99999999-0007-4000-8000-000000000003',
    '88888888-0003-4000-8000-000000000003',
    '77777777-0003-4000-8000-000000000003',
    'Paracetamol 500mg (Caja 20 Tabletas)',
    'Analgésico y antipirético para el alivio del dolor de cabeza y fiebre',
    2.00,
    true,
    150
  ),
  (
    '99999999-0008-4000-8000-000000000003',
    '88888888-0003-4000-8000-000000000003',
    '77777777-0003-4000-8000-000000000003',
    'Electrolit Suero Oral 625ml',
    'Solución rehidratante oral grado médico sabor coco o manzana',
    2.25,
    true,
    60
  ),
  -- Licorería Montalvo Nights
  (
    '99999999-0009-4000-8000-000000000004',
    '88888888-0004-4000-8000-000000000004',
    '77777777-0004-4000-8000-000000000004',
    'Six-Pack Cerveza Club Platino 330ml',
    'Pack de 6 latas de cerveza Club Platino extra fría',
    7.50,
    true,
    40
  ),
  (
    '99999999-0010-4000-8000-000000000004',
    '88888888-0004-4000-8000-000000000004',
    '77777777-0004-4000-8000-000000000004',
    'Hielo en Cubos Bolsa 2kg',
    'Hielo purificado en bolsa sellada',
    1.50,
    true,
    70
  )
ON CONFLICT (id) DO UPDATE SET precio = EXCLUDED.precio, is_disponible = true;

-- 5. Pedidos de Prueba en Montalvo listos para Despacho
-- Pedido Montalvo 1: Restaurante El Rincón Montalvino (Oferta Prioritaria para Cristian Morán rep-mont-09)
INSERT INTO pedidos (
  id, cliente_id, comercio_id, estado, metodo_pago, subtotal, costo_envio, total, 
  ganancia_repartidor, direccion_entrega, ubicacion_entrega, notas, 
  repartidor_asignado_inicial, fecha_expiracion_oferta, preferencia_sustitucion, numero_bultos
) VALUES (
  '33333333-0001-4000-8000-000000000001',
  '44444444-4444-4444-4444-444444444444',
  '88888888-0001-4000-8000-000000000001',
  'listo',
  'efectivo',
  7.00,
  1.25,
  8.25,
  1.25,
  'Barrio Las Balsas, Vía al Río Cristal (Casa blanca de 2 pisos), Montalvo',
  ST_SetSRID(ST_MakePoint(-79.2890, -1.7925), 4326),
  'Comida recién salida de la brasa, bien caliente. Llevar cambio de $20.',
  '33333333-3333-3333-3333-333333333340', -- Cristian Morán (Moto Pulsar NS 200 en Montalvo)
  NOW() + interval '600 seconds',
  'llamar_al_cliente',
  1
) ON CONFLICT (id) DO UPDATE SET 
  estado = 'listo', repartidor_id = NULL, 
  repartidor_asignado_inicial = '33333333-3333-3333-3333-333333333340', 
  fecha_expiracion_oferta = NOW() + interval '600 seconds';

DELETE FROM pedidos_items WHERE pedido_id = '33333333-0001-4000-8000-000000000001';
INSERT INTO pedidos_items (id, pedido_id, producto_id, cantidad, precio_unitario, notas)
VALUES 
  (gen_random_uuid(), '33333333-0001-4000-8000-000000000001', '99999999-0001-4000-8000-000000000001', 1, 4.50, 'Bien dorado el pollo'),
  (gen_random_uuid(), '33333333-0001-4000-8000-000000000001', '99999999-0003-4000-8000-000000000001', 1, 2.50, 'Sin hielo el jugo');

-- Pedido Montalvo 2: Supermercado San Vicente (Pool General para todos los repartidores)
INSERT INTO pedidos (
  id, cliente_id, comercio_id, estado, metodo_pago, subtotal, costo_envio, total, 
  ganancia_repartidor, direccion_entrega, ubicacion_entrega, notas, 
  repartidor_asignado_inicial, fecha_expiracion_oferta, preferencia_sustitucion, numero_bultos
) VALUES (
  '33333333-0002-4000-8000-000000000002',
  '44444444-4444-4444-4444-444444444444',
  '88888888-0002-4000-8000-000000000002',
  'listo',
  'transferencia',
  11.20,
  1.50,
  12.70,
  1.50,
  'Calle 10 de Agosto y Av. Guayaquil, Montalvo',
  ST_SetSRID(ST_MakePoint(-79.2855, -1.7890), 4326),
  '2 fundas de compras. Huevos empacados con cuidado para no quebrar.',
  NULL,
  NULL,
  'reemplazar_similar',
  2
) ON CONFLICT (id) DO UPDATE SET 
  estado = 'listo', repartidor_id = NULL, repartidor_asignado_inicial = NULL, fecha_expiracion_oferta = NULL;

DELETE FROM pedidos_items WHERE pedido_id = '33333333-0002-4000-8000-000000000002';
INSERT INTO pedidos_items (id, pedido_id, producto_id, cantidad, precio_unitario, notas)
VALUES 
  (gen_random_uuid(), '33333333-0002-4000-8000-000000000002', '99999999-0004-4000-8000-000000000002', 1, 4.80, 'Arroz'),
  (gen_random_uuid(), '33333333-0002-4000-8000-000000000002', '99999999-0005-4000-8000-000000000002', 1, 2.60, 'Aceite'),
  (gen_random_uuid(), '33333333-0002-4000-8000-000000000002', '99999999-0006-4000-8000-000000000002', 1, 3.80, 'Cubeta de huevos');

-- Pedido Montalvo 3: Farmacia Montalvo Salud (Pool General para todos los repartidores)
INSERT INTO pedidos (
  id, cliente_id, comercio_id, estado, metodo_pago, subtotal, costo_envio, total, 
  ganancia_repartidor, direccion_entrega, ubicacion_entrega, notas, 
  repartidor_asignado_inicial, fecha_expiracion_oferta, preferencia_sustitucion, numero_bultos
) VALUES (
  '33333333-0003-4000-8000-000000000003',
  '44444444-4444-4444-4444-444444444444',
  '88888888-0003-4000-8000-000000000003',
  'listo',
  'efectivo',
  4.25,
  1.00,
  5.25,
  1.00,
  'Av. 25 de Abril, diagonal a la Gasolinera, Montalvo',
  ST_SetSRID(ST_MakePoint(-79.2840, -1.7880), 4326),
  'Entrega rápida en portón negro. Traer cambio de $10.',
  NULL,
  NULL,
  'llamar_al_cliente',
  1
) ON CONFLICT (id) DO UPDATE SET 
  estado = 'listo', repartidor_id = NULL, repartidor_asignado_inicial = NULL, fecha_expiracion_oferta = NULL;

DELETE FROM pedidos_items WHERE pedido_id = '33333333-0003-4000-8000-000000000003';
INSERT INTO pedidos_items (id, pedido_id, producto_id, cantidad, precio_unitario, notas)
VALUES 
  (gen_random_uuid(), '33333333-0003-4000-8000-000000000003', '99999999-0007-4000-8000-000000000003', 1, 2.00, 'Paracetamol'),
  (gen_random_uuid(), '33333333-0003-4000-8000-000000000003', '99999999-0008-4000-8000-000000000003', 1, 2.25, 'Electrolit');
