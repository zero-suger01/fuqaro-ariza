import json
import uuid

import boto3
from botocore.client import Config as BotoConfig
from botocore.exceptions import ClientError
from fastapi import UploadFile

from app.config import get_settings

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

    # Complaint photos are viewed directly via <img src>, so the bucket needs
    # anonymous read access (uploads themselves still require valid credentials).
    policy = json.dumps(_PUBLIC_READ_POLICY).replace("{bucket}", settings.s3_bucket)
    _client.put_bucket_policy(Bucket=settings.s3_bucket, Policy=policy)


def upload_image(file: UploadFile) -> str:
    ext = (file.filename or "").rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else "jpg"
    key = f"complaints/{uuid.uuid4()}.{ext}"
    _client.upload_fileobj(
        file.file,
        settings.s3_bucket,
        key,
        ExtraArgs={"ContentType": file.content_type or "application/octet-stream"},
    )
    return f"{settings.s3_public_base_url}/{key}"
