import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BatchSpanProcessor, NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { hostname } from "os";

// Initialises the global OTel TracerProvider for non-HTTP services (worker).
// Must be called before any other imports that use @opentelemetry/api so the
// global TracerProvider is registered before packages/rabbitmq creates spans.
//
// Unlike NodeSDK, NodeTracerProvider does NOT read OTEL_SERVICE_NAME from env
// automatically — the Resource must be set explicitly.
// service.instance.id = hostname() distinguishes each docker compose replica
// (e.g. "distributed-systems-worker-1") in Jaeger span details.
export function initWorkerOtel(): void {
  if (process.env.OTEL_SDK_DISABLED === "true") return;

  const provider = new NodeTracerProvider({
    resource: resourceFromAttributes({
      "service.name": process.env.OTEL_SERVICE_NAME ?? "worker",
      "service.instance.id": hostname(),
    }),
    spanProcessors: [new BatchSpanProcessor(new OTLPTraceExporter())],
  });
  provider.register();
}
