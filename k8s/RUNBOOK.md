# K8s Runbook

## Despliegue

```bash
# Construir imágenes locales
docker compose build

# Aplicar todos los manifiestos (namespace primero)
kubectl apply -f k8s/namespace.yaml
kubectl apply -R -f k8s/

# Aplicar ScaledObject una vez KEDA esté listo
kubectl wait --for=condition=ready pod -l app=keda-operator -n keda --timeout=120s
kubectl apply -f k8s/worker/scaledobject.yaml
```

---

## kubectl — comandos del día a día

```bash
# Ver estado general
kubectl get pods -n distributed-systems
kubectl get pods -n distributed-systems -w          # watch en tiempo real
kubectl get scaledobject -n distributed-systems

# Logs
kubectl logs -n distributed-systems <pod>
kubectl logs -n distributed-systems -l app=worker   # todos los workers
kubectl logs -n distributed-systems -l app=backend --tail=50 -f

# Reiniciar un deployment (rolling restart)
kubectl rollout restart deployment/backend -n distributed-systems
kubectl rollout restart deployment/worker  -n distributed-systems

# Escalar manualmente (útil para debug)
kubectl scale deployment worker -n distributed-systems --replicas=1
kubectl scale deployment worker -n distributed-systems --replicas=0  # parar

# Aplicar cambios en un manifiesto concreto
kubectl apply -f k8s/worker/scaledobject.yaml
kubectl apply -f k8s/secret.yaml

# Forzar re-lectura de un secret (reinicia los pods que lo usan)
kubectl rollout restart deployment/backend -n distributed-systems

# Borrar y recrear un recurso
kubectl delete -f k8s/worker/scaledobject.yaml
kubectl apply  -f k8s/worker/scaledobject.yaml

# Entrar en un pod
kubectl exec -it <pod> -n distributed-systems -- sh
kubectl exec -it mysql-0 -n distributed-systems -- mysql -u root -proot invoices

# Port-forward (acceso local a servicios ClusterIP)
kubectl port-forward -n distributed-systems mysql-0    3306:3306
kubectl port-forward -n distributed-systems rabbitmq-0 15672:15672
```

---

## k9s — shortcuts esenciales

| Tecla                        | Acción                                 |
| ---------------------------- | -------------------------------------- |
| `:ns`                        | cambiar namespace                      |
| `:pods` / `:deploy` / `:svc` | navegar recursos                       |
| `l`                          | ver logs del pod seleccionado          |
| `s`                          | shell dentro del pod                   |
| `d`                          | describe (equivale a kubectl describe) |
| `/`                          | filtrar por texto (en logs o en lista) |
| `0`                          | mostrar todos los namespaces           |
| `ctrl+d`                     | borrar recurso                         |
| `esc`                        | volver atrás                           |
| `?`                          | ayuda de shortcuts                     |

---

## Stress test

```bash
# Terminal 1 — ver pods escalar en tiempo real
kubectl get pods -n distributed-systems -w

# Terminal 2 — lanzar test
k6 run k8s/stress-test.js

# Ver progreso en BD
kubectl exec mysql-0 -n distributed-systems -- \
  mysql -u root -proot invoices \
  -e "SELECT status, COUNT(*) FROM Invoice GROUP BY status;" 2>/dev/null
```

---

## Debug — dónde mirar qué

### Pods que no arrancan o crashean

```bash
kubectl describe pod <pod> -n distributed-systems   # ver Events
kubectl logs <pod> -n distributed-systems --previous  # logs del crash anterior
```

### KEDA no escala

```bash
kubectl get scaledobject -n distributed-systems      # READY y ACTIVE
kubectl logs -n keda -l app=keda-operator --tail=20  # error de conexión a RabbitMQ
```

Causa habitual: DNS cross-namespace. Usar FQDN en el secret del trigger:
`amqp://guest:guest@rabbitmq.distributed-systems.svc.cluster.local:5672`

### MySQL "Too many connections"

Síntoma: workers nackean mensajes → van al DLQ, registros se quedan en `inprogress`.

```bash
# Ver conexiones activas
kubectl exec mysql-0 -n distributed-systems -- \
  mysql -u root -proot -e "SHOW STATUS LIKE 'Threads_connected';"

# Aumentar límite en caliente (no persiste al restart)
kubectl exec mysql-0 -n distributed-systems -- \
  mysql -u root -proot -e "SET GLOBAL max_connections = 500;"
```

Fix permanente: añadir `?connection_limit=5` a `DATABASE_URL` en `k8s/secret.yaml`.

### Mensajes en el DLQ (Dead Letter Queue)

1. Habilitar shovel plugin (solo primera vez):

```bash
kubectl exec -it rabbitmq-0 -n distributed-systems -- \
  rabbitmq-plugins enable rabbitmq_shovel rabbitmq_shovel_management
```

2. Abrir RabbitMQ UI:

```bash
kubectl port-forward -n distributed-systems rabbitmq-0 15672:15672
```

3. http://localhost:15672 → Queues → `invoices.dead-letter` → **Move messages** → destination: `worker.invoices.created`

### Registros huérfanos en `inprogress`

Ocurre cuando el worker procesa el trabajo pero falla al actualizar la BD (MySQL connections, crash, OOM).
El mensaje ya no está en ninguna cola — nadie los actualizará.

```sql
-- Ver cuántos hay
SELECT status, COUNT(*) FROM Invoice GROUP BY status;

-- Marcar como failed para que el usuario pueda hacer retry desde el frontend
UPDATE Invoice SET status = 'failed' WHERE status = 'inprogress';
```

---

## Cómo resolver en producción real

### Too many connections → Outbox Pattern

En lugar de escribir en la BD y publicar en RabbitMQ por separado, se usa una tabla `outbox` en la misma transacción:

1. La BD guarda la invoice + una fila en `outbox` en una sola TX
2. Un proceso lee el `outbox` y publica en RabbitMQ
3. Si falla la publicación, se reintenta — la BD nunca queda inconsistente

### Registros huérfanos en `inprogress` → Job de reconciliación

Un cron job detecta registros atascados y los reencola:

```sql
SELECT id FROM Invoice
WHERE status = 'inprogress'
  AND updatedAt < NOW() - INTERVAL 15 MINUTE;
```

Se publican de nuevo en la cola. Requiere que el handler sea **idempotente** (procesar el mismo `invoiceId` dos veces no genera duplicados).

### DLQ en producción → Alertas + retry automático

- Alertar cuando el DLQ supere N mensajes (Prometheus + Alertmanager o CloudWatch)
- Retry con backoff exponencial antes de enviar al DLQ (`x-message-ttl`, `x-max-retries`)
- Dashboard en Grafana con cola principal vs DLQ para detectar picos de error

### KEDA connection_limit

Fijar el pool de conexiones de Prisma en proporción al número máximo de pods:

```
connection_limit = floor(max_connections / maxReplicaCount) - margen
# Ejemplo: 151 conexiones MySQL, 10 workers max → connection_limit=13
```
