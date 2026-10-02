# Comercio — Kanban de Baba

El componente solicitado está disponible en `src/pages/KanbanOrders.tsx`.
Esta entrada reexporta la implementación de `../panel-comercio`, aplicación
existente desplegada por Docker en el puerto 3003. No se crea otra aplicación ni
se cambia el mapeo 3003:3000.

- Demo: http://localhost:3003/demo/pedidos (habilitada por defecto en desarrollo).
- API: http://localhost:3003/pedidos (requiere sesión y comercio configurado).
- Documentación: [`../panel-comercio/KANBAN.md`](../panel-comercio/KANBAN.md).

```tsx
import KanbanOrders from './src/pages/KanbanOrders';

// Prueba local sin servicios; datos y entregas de Baba.
<KanbanOrders source="mock" />

// Consulta el Gateway usando la sesión autenticada.
<KanbanOrders source="api" merchantId="ID_AUTORIZADO_DEL_COMERCIO" />
```
