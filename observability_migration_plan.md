# Observability Migration Plan: Jaeger → Grafana Stack

## Status

| Step | Pilar                            | Estado        |
| ---- | -------------------------------- | ------------- |
| 1    | Trazas: Jaeger → Tempo + Grafana | ✅ completado |
| 2    | Logs: stdout → Loki + Promtail   | 🔄 en curso   |
| 3    | Métricas: Prometheus + cAdvisor  | ⬜ pendiente  |

---

## Step 1 — Trazas (completado)

### Qué se hizo

- Eliminado `jaeger` de docker-compose.yml
- Añadidos `tempo` (grafana/tempo:**2.5.0**) y `grafana` (grafana/grafana:latest)
- `tempo.yaml` en la raíz con ingester ring `inmemory` para single-instance
- `grafana/provisioning/datasources/tempo.yaml` autoprovisionando Tempo como datasource
- `OTEL_EXPORTER_OTLP_ENDPOINT` en backend y worker: `jaeger` → `tempo`
- Volúmenes `tempo_data` y `grafana_data`

### Lección aprendida

`grafana/tempo:latest` (2.7+) introdujo un _partition ring_ para ingesters y renombró
`compactor` — config incompatible con la minimal. Solución: pinear a **2.5.0** que usa
el ring clásico con `kvstore: inmemory`, sin memberlist ni partition ring.

### Archivos cambiados

- `docker-compose.yml`
- `tempo.yaml` (creado)
- `grafana/provisioning/datasources/tempo.yaml` (creado)

---

## Step 2 — Logs: Loki + Promtail

### Contexto

Loki almacena logs; Promtail los recolecta leyendo stdout/stderr de los contenedores
Docker vía el socket Unix. Zero cambios en el código de las apps.
Grafana ya está levantado — solo se añade un segundo datasource.

### Qué cambia

|                     | Antes                               | Después                              |
| ------------------- | ----------------------------------- | ------------------------------------ |
| Logs                | stdout efímero (solo `docker logs`) | Loki (:3100), consultable en Grafana |
| Recolector          | ninguno                             | Promtail lee Docker socket           |
| Grafana datasources | Tempo                               | Tempo + Loki                         |

### Archivos a crear

#### `loki.yaml` (raíz)

```yaml
auth_enabled: false

server:
  http_listen_port: 3100

common:
  instance_addr: 127.0.0.1
  path_prefix: /var/loki
  storage:
    filesystem:
      chunks_directory: /var/loki/chunks
      rules_directory: /var/loki/rules
  replication_factor: 1
  ring:
    kvstore:
      store: inmemory

schema_config:
  configs:
    - from: 2020-10-24
      store: tsdb
      object_store: filesystem
      schema: v13
      index:
        prefix: index_
        period: 24h
```

#### `promtail.yaml` (raíz)

```yaml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: docker
    docker_sd_configs:
      - host: unix:///var/run/docker.sock
        refresh_interval: 5s
    relabel_configs:
      - source_labels: [__meta_docker_container_name]
        regex: "/(.*)"
        target_label: container
      - source_labels: [__meta_docker_container_label_com_docker_compose_service]
        target_label: service
```

#### `grafana/provisioning/datasources/loki.yaml`

```yaml
apiVersion: 1
datasources:
  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
```

### Cambios en `docker-compose.yml`

Añadir dos servicios:

```yaml
loki:
  image: grafana/loki:2.9.0
  command: ["-config.file=/etc/loki/loki.yaml"]
  volumes:
    - ./loki.yaml:/etc/loki/loki.yaml
    - loki_data:/var/loki
  ports:
    - "3100:3100"
  networks:
    - app-network

promtail:
  image: grafana/promtail:2.9.0
  command: ["-config.file=/etc/promtail/promtail.yaml"]
  volumes:
    - ./promtail.yaml:/etc/promtail/promtail.yaml
    - /var/run/docker.sock:/var/run/docker.sock:ro
  networks:
    - app-network
  depends_on:
    - loki
```

Actualizar `grafana.depends_on`:

```yaml
depends_on:
  - tempo
  - loki
```

Añadir volumen:

```yaml
volumes:
  loki_data:
```

### Verificación

1. `docker compose up -d loki promtail`
2. `docker compose restart grafana`
3. Grafana → Explore → datasource = Loki
4. Query: `{service="backend"}` → logs del backend
5. Query: `{service="worker"}` → logs del worker
6. Crear una invoice → ver la traza en Tempo y los logs del mismo request en Loki

---

## Step 3 — Métricas: Prometheus (pendiente)

Añadir Prometheus scrapeando métricas de las apps + cAdvisor para métricas de
contenedores. Dashboard de Grafana con Prometheus como tercer datasource.

---

## Notas generales

- Producción: reemplazar `backend: local`/`filesystem` por S3/GCS en Tempo y Loki.
- `GF_AUTH_ANONYMOUS_ENABLED=true` solo para dev local.
- Versiones pineadas para evitar breaking changes de `latest`:
  - Tempo: 2.5.0
  - Loki: 2.9.0 (pendiente confirmar)
  - Promtail: 2.9.0 (debe coincidir con Loki)
