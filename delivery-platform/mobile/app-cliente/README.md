# Catálogo y checkout del cliente · Baba

`App.tsx` implementa un flujo React Native de catálogo → carrito → entrega/pago
para **Picantería El Buen Sabor - Baba Centro**. Baba es el piloto y Babahoyo la
segunda ciudad. Dirección inicial: Barrio San Antonio, Calle Bolívar y Sucre, Baba.

## Comportamiento

- Catálogo local tipado: seco de gallina, bolón mixto, menestra/carne, jugo y café.
- Carrito inicialmente vacío; agregar, incrementar, reducir y eliminar; máximo
  99 unidades por producto. El estado se conserva al navegar entre pantallas.
- Precios en centavos enteros, subtotales por producto y envío único de $1.50.
  No se cobra envío con carrito vacío. USD con dos decimales.
- Dirección editable de 10 a 200 caracteres y selección Efectivo/Transferencia.
  Ciudad fijada en Baba; no se afirma validar una dirección por geocodificación.
- Confirmación de prueba produce un resumen local editable, con aviso explícito
  de que no se ha enviado un pedido ni realizado un cobro. No se simula tracking.
- Botones de 48 px, etiquetas accesibles, selección anunciada y adaptación al
  teclado. Sincronización Redis/API y persistencia tras cerrar la app pendientes.

## Validación

Con Node >=22.18 (el runner carga TypeScript de lógica directamente):

```sh
npm ci --ignore-scripts
npm test
npm run typecheck
```

Cinco pruebas unitarias cubren cantidades, límite, eliminación, centavos/envío,
validaciones y resumen independiente de cambios posteriores. TypeScript comprueba
la pantalla con los tipos React Native. No se ha probado en emulador/dispositivo.
Los scripts Expo existentes requieren disponer del entorno Expo; esta entrega no
incorpora un proyecto Android/iOS ni modifica Docker.

`src/orderModel.ts` separa la lógica de presentación. Sus IDs son de fixtures;
no deben enviarse como IDs productivos a checkout. La futura conexión necesita
catálogo con IDs del servidor, sesión de cliente, precios/stock validados por
backend y confirmación real antes de mostrar un pedido creado.
