import logging
import os

from fastapi import FastAPI

try:
    from opentelemetry import trace
    from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
    from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
    from opentelemetry.sdk.resources import Resource
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor
except ImportError:
    trace = None
    OTLPSpanExporter = None
    FastAPIInstrumentor = None
    Resource = None
    TracerProvider = None
    BatchSpanProcessor = None


logger = logging.getLogger("app.tracing")


def _is_disabled() -> bool:
    return os.getenv("OTEL_SDK_DISABLED", "false").lower() in {"1", "true", "yes"}


def configure_tracing(app: FastAPI) -> None:
    if FastAPIInstrumentor is None:
        logger.info("OpenTelemetry tracing is unavailable because dependencies are not installed.")
        return

    if _is_disabled():
        logger.info("OpenTelemetry tracing is disabled by OTEL_SDK_DISABLED.")
        return

    if not os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT"):
        logger.info("OpenTelemetry tracing is disabled because OTEL_EXPORTER_OTLP_ENDPOINT is unset.")
        return

    service_name = os.getenv("OTEL_SERVICE_NAME") or os.getenv("SERVICE_NAME", "internship-api")
    resource = Resource.create(
        {
            "service.name": service_name,
            "service.version": os.getenv("SERVICE_VERSION", "local"),
            "deployment.environment": os.getenv("APP_ENV", os.getenv("ENVIRONMENT", "development")),
        },
    )

    tracer_provider = TracerProvider(resource=resource)
    tracer_provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
    trace.set_tracer_provider(tracer_provider)

    FastAPIInstrumentor.instrument_app(
        app,
        tracer_provider=tracer_provider,
        excluded_urls="/metrics,/health,/health/live,/health/ready",
        exclude_spans=["receive", "send"],
    )

    logger.info("OpenTelemetry tracing is enabled for %s.", service_name)
