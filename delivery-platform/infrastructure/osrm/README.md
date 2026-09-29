# OSRM Engine (Open Source Routing Machine) - Guayaquil / Ecuador

Este directorio almacena los datos de grafos viales para el cálculo ultrarrápido de rutas OSRM.

## Comandos de Compilación (PowerShell)

```powershell
# 1. Descargar mapa .osm.pbf de Ecuador
Invoke-WebRequest -Uri "https://download.geofabrik.de/south-america/ecuador-latest.osm.pbf" -OutFile "infrastructure/osrm/ecuador-latest.osm.pbf"

# 2. Extraer grafo de conducción (perfil car/moto)
docker run -t -v "${PWD}/infrastructure/osrm:/data" osrm/osrm-backend osrm-extract -p /opt/car.lua /data/ecuador-latest.osm.pbf

# 3. Particionar celdas MLD
docker run -t -v "${PWD}/infrastructure/osrm:/data" osrm/osrm-backend osrm-partition /data/ecuador-latest.osrm

# 4. Personalizar aristas y pesos
docker run -t -v "${PWD}/infrastructure/osrm:/data" osrm/osrm-backend osrm-customize /data/ecuador-latest.osrm
```
