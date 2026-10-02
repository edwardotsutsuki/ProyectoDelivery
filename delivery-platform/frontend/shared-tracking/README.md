# Tracking web compartido

Fuente única del componente Leaflet para Comercio y Backoffice.
`src/tracking.ts` contiene validación de eventos, coordenadas y geometría;
`src/components/CourierTrackingMap.tsx` contiene mapa, socket y animación.

Se distribuye como tarball npm **local**, sin publicar en ningún registro.
Cada aplicación contiene `vendor/delivery-tracking-web-0.1.1.tgz` y lo referencia
en su package.json/lockfile. Así sus contextos Docker actuales siguen siendo
autosuficientes, sin imports fuera de `/app`, sin symlinks entre apps y sin
cambiar puertos/volúmenes de Compose. Sus Dockerfiles copian `vendor` antes de
instalar dependencias. No mantener implementaciones divergentes en cada app.

## Actualizar el paquete

Desde `delivery-platform/frontend`:

1. Editar el código en `shared-tracking/src` e incrementar la versión del paquete.
2. `npm pack ./shared-tracking --pack-destination ./panel-comercio/vendor`.
3. Copiar ese mismo `.tgz` a `backoffice/vendor`.
4. Dentro de cada app ejecutar `npm install ./vendor/<archivo-generado>.tgz`.
5. Actualizar dependencias de los contenedores en desarrollo o reconstruirlos.
6. Ejecutar `npm test` en Comercio y `npm run build` en ambas apps.
7. Incluir fuente, ambos artefactos idénticos y lockfiles en la misma entrega;
   retirar el tarball anterior una vez que ya no sea referenciado.

El paquete depende de React y Leaflet mediante peerDependencies. Vite compila
su fuente TypeScript; no es un componente React Native. El subpath `/geo` exporta
funciones sin DOM y es reutilizable por adaptadores móviles cuando se valide su
configuración de empaquetado.

Pruebas en `panel-comercio/tests/tracking*.test.cjs`: contrato WS, coordenadas,
geometría vial, ETA, aislamiento de pedido, cambio de suscripción, falla OSRM y
limpieza al desmontar. Las pruebas UI usan Leaflet real con DOM/API simulados.
