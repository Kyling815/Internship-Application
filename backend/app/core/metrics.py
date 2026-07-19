from prometheus_client import Counter, Gauge, Histogram


HTTP_REQUESTS_TOTAL = Counter(
    "internship_api_http_requests_total",
    "Total number of completed HTTP requests.",
    labelnames=[
        "method",
        "route",
        "status_code",
    ],
)


HTTP_REQUEST_DURATION_SECONDS = Histogram(
    "internship_api_http_request_duration_seconds",
    "HTTP request processing duration in seconds.",
    labelnames=[
        "method",
        "route",
    ],
    buckets=(
        0.01,
        0.025,
        0.05,
        0.1,
        0.25,
        0.5,
        1.0,
        2.5,
        5.0,
        10.0,
    ),
)


HTTP_REQUESTS_IN_PROGRESS = Gauge(
    "internship_api_http_requests_in_progress",
    "Current number of HTTP requests being processed.",
    labelnames=[
        "method",
    ],
)