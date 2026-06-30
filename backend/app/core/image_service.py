import asyncio
import hashlib
import io
import logging
import os
from typing import Tuple, Optional
import httpx
from PIL import Image

logger = logging.getLogger(__name__)

# Directory where local items images will be saved
STATIC_ITEMS_DIR = "static/items"

def calculate_md5(data: bytes) -> str:
    """Calculate MD5 checksum of raw bytes."""
    return hashlib.md5(data).hexdigest()

def _convert_png_to_webp(png_bytes: bytes) -> bytes:
    """Synchronous Pillow operation to convert PNG bytes to WebP bytes."""
    image = Image.open(io.BytesIO(png_bytes))
    output = io.BytesIO()
    # Convert image to RGB if it's RGBA (WebP supports RGBA but keeping it clean)
    if image.mode in ("RGBA", "LA") or (image.mode == "P" and "transparency" in image.info):
        # Save transparent images as WebP with transparency
        image.save(output, format="WEBP", quality=90, lossless=False)
    else:
        image.save(output, format="WEBP", quality=90)
    return output.getvalue()

async def download_and_cache_image(
    item_id: int,
    source_url: str,
    existing_hash: Optional[str] = None
) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Download image from source_url, check image hash, convert to WebP, and save locally.
    
    Returns:
        (reused: bool, image_hash: str | None, image_path: str | None)
    """
    os.makedirs(STATIC_ITEMS_DIR, exist_ok=True)
    local_filename = f"{item_id}.webp"
    local_path = os.path.join(STATIC_ITEMS_DIR, local_filename)
    public_path = f"/static/items/{local_filename}"

    # If the file already exists on disk and we have an existing hash, verify it
    if os.path.exists(local_path) and existing_hash:
        return True, existing_hash, public_path

    headers = {"User-Agent": "Mozilla/5.0"}
    try:
        async with httpx.AsyncClient(timeout=15.0, headers=headers, follow_redirects=True) as client:
            response = await client.get(source_url)
            if response.status_code != 200:
                logger.warning("Failed to download image from %s (Status: %d)", source_url, response.status_code)
                return False, None, None
            
            raw_bytes = response.content
            
        new_hash = calculate_md5(raw_bytes)
        
        # Deduplication check: if hash matches database, reuse file
        if existing_hash and new_hash == existing_hash:
            if os.path.exists(local_path):
                return True, existing_hash, public_path

        # Convert to WebP asynchronously in thread pool
        webp_bytes = await asyncio.to_thread(_convert_png_to_webp, raw_bytes)
        
        # Save to disk
        await asyncio.to_thread(lambda: open(local_path, "wb").write(webp_bytes))
        logger.info("Saved WebP image for item %d to %s (Hash: %s)", item_id, local_path, new_hash)
        
        return False, new_hash, public_path

    except Exception as e:
        logger.error("Error downloading/converting image for item %d from %s: %s", item_id, source_url, e)
        return False, None, None
