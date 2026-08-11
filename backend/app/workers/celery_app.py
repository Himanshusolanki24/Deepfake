from __future__ import annotations

from celery import Celery

from ..config import get_settings

settings = get_settings()


def create_celery_app() -> Celery:
    app = Celery(
        "authentiq",
        broker=settings.celery_broker_url,
        backend=settings.celery_result_backend,
        include=["app.workers.tasks"],
    )
    app.conf.update(
        task_serializer="json",
        result_serializer="json",
        accept_content=["json"],
        timezone="UTC",
        enable_utc=True,
        task_acks_late=True,
        worker_prefetch_multiplier=1,
        task_default_queue="media",
        task_default_routing_key="media",
        task_routes={
            "app.workers.tasks.process_image_analysis": {"queue": "image"},
            "app.workers.tasks.process_video_analysis": {"queue": "video"},
            "app.workers.tasks.process_audio_analysis": {"queue": "audio"},
            "app.workers.tasks.generate_report_task": {"queue": "reports"},
        },
        task_queues=(
            "media",
            "image",
            "video",
            "audio",
            "reports",
        ),
        broker_connection_retry_on_startup=True,
    )
    return app


celery_app = create_celery_app()
