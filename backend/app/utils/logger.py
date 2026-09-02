from __future__ import annotations

import asyncio
import logging
import os
import sys
from typing import Awaitable, Callable

_FORMAT = "%(asctime)s | %(levelname)s | %(name)s | %(message)s"


def get_logger(name: str) -> logging.Logger:
    logger = logging.getLogger(name)
    if logger.handlers:
        return logger
    level = os.getenv("LOG_LEVEL", "INFO").upper()
    logger.setLevel(getattr(logging, level, logging.INFO))
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter(_FORMAT))
    logger.addHandler(handler)
    logger.propagate = False
    return logger


class WebSocketLogHandler(logging.Handler):
    def __init__(self, send_callback: Callable[[str], Awaitable[None]]):
        super().__init__()
        self.send_callback = send_callback

    def emit(self, record: logging.LogRecord) -> None:
        try:
            message = self.format(record)
            loop = asyncio.get_event_loop()
            if loop.is_running():
                loop.create_task(self.send_callback(message))
        except Exception:
            self.handleError(record)