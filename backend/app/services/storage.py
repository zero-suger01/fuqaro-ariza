import json
import uuid

import boto3
import magic
from botocore.client import Config as BotoConfig
from botocore.exceptions import ClientError
from fastapi import UploadFile

from app.config import get_settings
from app.core.constants import FILE_LIMITS
from app.core.errors import AppError

settings = get_settings()

_client = boto3.client(
    "s3",
    endpoint_url=settings.s3_endpoint_url,
    aws_access_key_id=settings.s3_access_key,
    aws_secret_access_key=settings.s3_secret_key,
    region_name=settings.s3_region,
    config=BotoConfig(signature_version="s3v4"),
)

_PUBLIC_READ_POLICY = {
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": "*",
            "Action": ["s3:GetObject"],
            "Resource": [f"arn:aws:s3:::{{bucket}}/*"],
        }
    ],
}


def ensure_bucket() -> None:
    try:
        _client.head_bucket(Bucket=settings.s3_bucket)
    except ClientError:
        _client.create_bucket(Bucket=settings.s3_bucket)

    # Complaint media is viewed directly via <img>/<video> src, so the bucket
    # needs anonymous read access (uploads themselves still require credentials).
    policy = json.dumps(_PUBLIC_READ_POLICY).replace("{bucket}", settings.s3_bucket)
    _client.put_bucket_policy(Bucket=settings.s3_bucket, Policy=policy)


def validate_file(file: UploadFile, expected_kind: str) -> tuple[bytes, str]:
    """Reads the file and checks size + real MIME (magic bytes) against the
    contract's limits (docs/03-kontraktlar.md §2.4)."""
    limits = FILE_LIMITS[expected_kind]
    data = file.file.read()

    max_bytes = limits["max_size_mb"] * 1024 * 1024
    if len(data) > max_bytes:
        raise AppError(422, "invalid_file", f"Fayl hajmi {limits['max_size_mb']} MB dan katta bo'lmasligi kerak")

    real_mime = magic.from_buffer(data, mime=True)
    if real_mime not in limits["mimes"]:
        raise AppError(422, "invalid_file", f"Fayl turi ruxsat etilmagan: {real_mime}")

    return data, real_mime


def upload_file(data: bytes, mime: str, kind: str) -> str:
    ext = mime.split("/")[-1].replace("quicktime", "mov")
    key = f"complaints/{kind}/{uuid.uuid4()}.{ext}"
    _client.put_object(Bucket=settings.s3_bucket, Key=key, Body=data, ContentType=mime)
    return f"{settings.s3_public_base_url}/{key}"
