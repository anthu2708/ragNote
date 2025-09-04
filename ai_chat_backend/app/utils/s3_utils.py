from __future__ import annotations

import uuid
from typing import Iterable, List, Tuple
from urllib.parse import unquote

import boto3
from botocore.config import Config
from app.config import settings
from app.models.file import File, FileStatus
from app.services.rag_store import get_vectorstore  # vector store đã có


def get_s3_client():
    return boto3.client(
        "s3",
        region_name=settings.AWS_REGION,
        endpoint_url=settings.S3_ENDPOINT or None,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        config=Config(signature_version="s3v4"),
    )

def parse_s3_url(url: str) -> Tuple[str, str]:
    """
    Accepts: "s3://bucket/key" or "https://{bucket}.s3.../{key}"
    Returns: (bucket, key)
    """
    if url.startswith("s3://"):
        # s3://bucket/key...
        _, rest = url.split("s3://", 1)
        bucket, key = rest.split("/", 1)
        return bucket, unquote(key)
    # ex: https://bucket.s3.amazonaws.com/key or https://s3.ap-southeast-1.amazonaws.com/bucket/key
    from urllib.parse import urlparse
    p = urlparse(url)
    host = p.netloc
    path = p.path.lstrip("/")
    if ".s3." in host or host.endswith(".amazonaws.com"):
        # style virtual-hosted: bucket.s3.region.amazonaws.com/key
        bucket = host.split(".")[0]
        key = path
    else:
        # path-style: s3.region.amazonaws.com/bucket/key
        bucket, key = path.split("/", 1)
        key = unquote(key)
    return bucket, key

def s3_download_bytes(bucket: str, key: str) -> bytes:
    """
    Download the entire object into memory.
    For large files, consider streaming/chunking.
    """
    s3 = get_s3_client()
    obj = s3.get_object(Bucket=bucket, Key=key)
    return obj["Body"].read()


def _norm_uuid_list(xs: Iterable) -> list[uuid.UUID]:
    out = []
    for x in xs or []:
        if isinstance(x, uuid.UUID):
            out.append(x)
        else:
            out.append(uuid.UUID(str(x)))
    return out