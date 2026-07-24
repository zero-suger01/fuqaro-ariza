"""Error envelope: every response is `{"detail": "...", "code": "..."}`
(docs/03-kontraktlar.md §1). `AppError` lets call sites set an explicit
machine `code`; anything else (plain HTTPException, validation errors) gets a
sane default code from the status code via the handlers in `app/main.py`.
"""
from fastapi import HTTPException


class AppError(HTTPException):
    def __init__(self, status_code: int, code: str, detail: str):
        super().__init__(status_code=status_code, detail=detail)
        self.code = code


_DEFAULT_CODES = {
    400: "bad_request",
    401: "unauthorized",
    403: "forbidden",
    404: "not_found",
    409: "conflict",
    422: "validation_error",
    429: "rate_limited",
    500: "server_error",
}


def default_code(status_code: int) -> str:
    return _DEFAULT_CODES.get(status_code, "error")
