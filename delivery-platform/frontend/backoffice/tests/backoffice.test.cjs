const test = require('node:test');
const assert = require('node:assert/strict');

// 1. Pruebas de Autorización y Sesión de Administrador
test('Admin Auth Guard: rechaza usuarios no administradores y valida rol admin', () => {
  const adminUser = { email: 'admin@delivery.com', rol: 'admin' };
  const clientUser = { email: 'cliente@delivery.com', rol: 'cliente' };
  const merchantUser = { email: 'comercio@delivery.com', rol: 'comercio' };

  function checkAdminAccess(user) {
    if (!user || user.rol !== 'admin') {
      return false;
    }
    return true;
  }

  assert.equal(checkAdminAccess(adminUser), true, 'Admin debe tener acceso completo');
  assert.equal(checkAdminAccess(clientUser), false, 'Cliente no debe ingresar al backoffice');
  assert.equal(checkAdminAccess(merchantUser), false, 'Comercio no debe ingresar al backoffice');
  assert.equal(checkAdminAccess(null), false, 'Sesión vacía debe ser rechazada');
});

// 2. Pruebas de Validación de Coordenadas de Comercios en Los Ríos
test('Comercios PostGIS: valida coordenadas dentro del rango geográfico de Baba y Babahoyo', () => {
  // Baba ~ (-1.7917, -79.6783)
  // Babahoyo ~ (-1.8022, -79.5344)
  function validarCoordenadasLosRios(lat, lon) {
    const latValida = lat >= -1.90 && lat <= -1.70;
    const lonValida = lon >= -79.75 && lon <= -79.48;
    return latValida && lonValida;
  }

  assert.equal(validarCoordenadasLosRios(-1.7917, -79.6783), true, 'Baba Centro debe ser válida');
  assert.equal(validarCoordenadasLosRios(-1.8022, -79.5344), true, 'Babahoyo Centro debe ser válida');
  assert.equal(validarCoordenadasLosRios(-0.1807, -78.4678), false, 'Quito debe ser rechazado');
  assert.equal(validarCoordenadasLosRios(-2.1894, -79.8891), false, 'Guayaquil debe ser rechazado');
});

// 3. Pruebas de Validación de Catálogo y Menús
test('Productos: valida integridad de precio, nombre y comercio_id', () => {
  function validarProducto(prod) {
    if (!prod.nombre || prod.nombre.trim().length < 3) {
      return { valido: false, error: 'Nombre demasiado corto' };
    }
    if (typeof prod.precio !== 'number' || prod.precio <= 0) {
      return { valido: false, error: 'Precio debe ser un número positivo' };
    }
    if (!prod.comercio_id) {
      return { valido: false, error: 'Debe asociarse a un comercio' };
    }
    return { valido: true };
  }

  const valido = validarProducto({
    nombre: 'Seco de Gallina Baba',
    precio: 4.50,
    comercio_id: '55555555-5555-5555-5555-555555555555'
  });
  assert.equal(valido.valido, true);

  const precioNegativo = validarProducto({
    nombre: 'Plato',
    precio: -2.00,
    comercio_id: '55555555-5555-5555-5555-555555555555'
  });
  assert.equal(precioNegativo.valido, false);

  const sinComercio = validarProducto({
    nombre: 'Bolón de Chicharrón',
    precio: 3.50,
    comercio_id: ''
  });
  assert.equal(sinComercio.valido, false);
});

// 4. Pruebas del Motor de Tarificación Dinámica
test('Tarifas Dinámicas: calcula flete base, km excedentes y recargos nocturno y lluvia', () => {
  function calcularFlete({ tarifaBase, costoKmAdicional, distanciaKm, isNight, isRain }) {
    const distanciaBaseKm = 2.0;
    const kmExtra = Math.max(0, +(distanciaKm - distanciaBaseKm).toFixed(2));
    const subtotalKm = +(kmExtra * costoKmAdicional).toFixed(2);
    const recargoNoc = isNight ? 0.50 : 0.00;
    const recargoLlu = isRain ? 0.75 : 0.00;
    const tarifaFinal = +(tarifaBase + subtotalKm + recargoNoc + recargoLlu).toFixed(2);
    return {
      kmExtra,
      subtotalKm,
      tarifaFinal
    };
  }

  // Caso 1: Dentro de los primeros 2 km (tarifa base $1.25 en Baba)
  const caso1 = calcularFlete({
    tarifaBase: 1.25,
    costoKmAdicional: 0.35,
    distanciaKm: 1.5,
    isNight: false,
    isRain: false
  });
  assert.equal(caso1.kmExtra, 0);
  assert.equal(caso1.tarifaFinal, 1.25);

  // Caso 2: 5.5 km en Baba con lluvia
  const caso2 = calcularFlete({
    tarifaBase: 1.25,
    costoKmAdicional: 0.35,
    distanciaKm: 5.5,
    isNight: false,
    isRain: true
  });
  // kmExtra = 3.5 -> 3.5 * 0.35 = 1.225 -> toFixed(2) = 1.22 -> 1.22 + 1.25 + 0.75 = 3.22
  assert.equal(caso2.kmExtra, 3.5);
  assert.equal(caso2.tarifaFinal, 3.22);

  // Caso 3: Intercantonal Baba - Babahoyo (20.5 km) con noche y lluvia
  const caso3 = calcularFlete({
    tarifaBase: 3.50,
    costoKmAdicional: 0.60,
    distanciaKm: 20.5,
    isNight: true,
    isRain: true
  });
  // kmExtra = 18.5 -> 18.5 * 0.60 = 11.10
  // tarifa = 3.50 + 11.10 + 0.50 + 0.75 = 15.85
  assert.equal(caso3.kmExtra, 18.5);
  assert.equal(caso3.tarifaFinal, 15.85);
});

// 5. Pruebas de Directorio de Usuarios y Roles RBAC
test('Usuarios: valida roles permitidos, datos obligatorios y alternancia de estado activo', () => {
  const ROLES_PERMITIDOS = ['cliente', 'repartidor', 'comercio', 'admin'];

  function validarUsuario(datos) {
    if (!datos.nombre || datos.nombre.trim().length < 2) {
      return { valido: false, error: 'Nombre inválido' };
    }
    if (!datos.email || !datos.email.includes('@')) {
      return { valido: false, error: 'Email inválido' };
    }
    if (!ROLES_PERMITIDOS.includes(datos.rol)) {
      return { valido: false, error: 'Rol no permitido' };
    }
    return { valido: true };
  }

  assert.equal(
    validarUsuario({ nombre: 'Darwin Vera', email: 'darwin@test.com', rol: 'repartidor' }).valido,
    true
  );
  assert.equal(
    validarUsuario({ nombre: 'Hack', email: 'hack@test.com', rol: 'superusuario' }).valido,
    false,
    'Rol no estándar debe ser rechazado'
  );
  assert.equal(
    validarUsuario({ nombre: '', email: 'vacio@test.com', rol: 'cliente' }).valido,
    false
  );

  function alternarEstadoUsuario(usuario) {
    return {
      ...usuario,
      estado_activo: !usuario.estado_activo,
      fecha_actualizacion: new Date().toISOString()
    };
  }

  const uActivo = { id: 'usr-1', nombre: 'Test', estado_activo: true };
  const uSuspendido = alternarEstadoUsuario(uActivo);
  assert.equal(uSuspendido.estado_activo, false, 'Usuario activo debe pasar a suspendido');
  const uReactivado = alternarEstadoUsuario(uSuspendido);
  assert.equal(uReactivado.estado_activo, true, 'Usuario suspendido debe reactivarse');
});

// 6. Pruebas de Edición de Comercios
test('Comercios: edición de datos comerciales preservando coordenadas espaciales PostGIS', () => {
  function editarComercio(comercioExistente, cambios) {
    return {
      ...comercioExistente,
      nombre_comercial: cambios.nombreComercial || comercioExistente.nombre_comercial,
      telefono: cambios.telefono || comercioExistente.telefono,
      tiempo_entrega_promedio: cambios.tiempoEntregaPromedio !== undefined
        ? Number(cambios.tiempoEntregaPromedio)
        : comercioExistente.tiempo_entrega_promedio,
      costo_base_envio: cambios.costoBaseEnvio !== undefined
        ? Number(cambios.costoBaseEnvio)
        : comercioExistente.costo_base_envio,
      lat: cambios.lat !== undefined ? Number(cambios.lat) : comercioExistente.lat,
      lon: cambios.lon !== undefined ? Number(cambios.lon) : comercioExistente.lon,
    };
  }

  const comercioOriginal = {
    id: 'merch-1',
    nombre_comercial: 'Asadero Central',
    telefono: '+593900000001',
    tiempo_entrega_promedio: 30,
    costo_base_envio: 1.50,
    lat: -1.7917,
    lon: -79.6783,
  };

  const actualizado = editarComercio(comercioOriginal, {
    nombreComercial: 'Asadero Central Express Baba',
    tiempoEntregaPromedio: 20,
    costoBaseEnvio: 1.25,
  });

  assert.equal(actualizado.nombre_comercial, 'Asadero Central Express Baba');
  assert.equal(actualizado.tiempo_entrega_promedio, 20);
  assert.equal(actualizado.costo_base_envio, 1.25);
  assert.equal(actualizado.lat, -1.7917, 'Coordenada latitud PostGIS debe preservarse');
  assert.equal(actualizado.lon, -79.6783, 'Coordenada longitud PostGIS debe preservarse');
});

