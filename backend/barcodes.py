"""Shared, append-only barcode batches. A unique multikey index reserves codes atomically."""
import base64
import hashlib
import json
import math
import re
import secrets
import string
from datetime import datetime, timezone
from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel, Field
from pymongo.errors import DuplicateKeyError

ALPHABET = string.ascii_letters + string.digits


def parse_log(raw, name):
    try:
        text = raw.decode("utf-8-sig")
        encoding = "UTF-8"
    except UnicodeDecodeError:
        text = raw.decode("cp1254")
        encoding = "Windows-1254"
    entries, invalid, seen = [], [], set()
    date = ""
    for line, value in enumerate(text.splitlines(), 1):
        value = value.strip()
        if not value or re.fullmatch(r"[-=]+", value):
            continue
        if re.match(r"^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} - \d+ adet barkod", value):
            date = value[:19]
        elif re.fullmatch(r"[A-Za-z0-9]{6,32}", value):
            if value not in seen:
                entries.append({"code": value, "createdAt": date, "kind": "import", "source": name})
                seen.add(value)
        else:
            invalid.append({"line": line, "value": value[:200]})
    return entries, {"name": name, "encoding": encoding, "total": len(entries),
                     "invalid": invalid[:50], "invalidCount": len(invalid), "warnings": []}


def can_use_barcodes(user):
    return user.get("active", True) and (user.get("role") == "admin" or user.get("barcode_access") is True)


class GeneratePayload(BaseModel):
    prefix: str = Field(default="Snz", min_length=1, max_length=31, pattern=r"^[A-Za-z0-9]+$")
    length: int = Field(default=13, ge=6, le=32)
    count: int = Field(default=10, ge=1, le=10000)
    requestId: UUID


class ImportPayload(BaseModel):
    name: str = Field(max_length=200)
    base64: str = Field(max_length=2800000)


class BarcodeStore:
    def __init__(self, db):
        self.batches = db.barcode_batches
        self.ready = False

    async def initialize(self, directory):
        directory = Path(directory)
        manifest = json.loads((directory / "manifest.json").read_text(encoding="utf-8"))
        for item in manifest["files"]:
            raw = (directory / item["name"]).read_bytes()
            if hashlib.sha256(raw).hexdigest() != item["sha256"]:
                raise RuntimeError("Legacy barcode log checksum mismatch")
        await self.batches.create_index("entries.code", unique=True, sparse=True)
        await self.batches.create_index("createdAt")
        files = sorted(Path(directory).glob("*.txt"))
        if not files:
            raise RuntimeError("barcode_logs missing: refusing barcode generation without legacy reservations")
        for file in files:
            await self.import_log(file.read_bytes(), file.name, "legacy-migration")
        self.ready = True

    async def existing(self, codes):
        found = set()
        for offset in range(0, len(codes), 1000):
            subset = codes[offset:offset + 1000]
            wanted = set(subset)
            rows = self.batches.find({"entries.code": {"$in": subset}}, {"entries.code": 1})
            async for row in rows:
                found.update(entry["code"] for entry in row.get("entries", []) if entry["code"] in wanted)
        return found

    async def inspect(self, raw, name):
        entries, report = parse_log(raw, name)
        duplicates = await self.existing([e["code"] for e in entries])
        report.update(added=len(entries) - len(duplicates), duplicates=len(duplicates), hash=hashlib.sha256(raw).hexdigest())
        return entries, report

    async def import_log(self, raw, name, user_id):
        digest = hashlib.sha256(raw).hexdigest()
        key = "import:" + digest
        previous = await self.batches.find_one({"_id": key})
        if previous:
            return {**previous["report"], "added": 0, "duplicates": previous["report"]["total"]}
        for _ in range(10):
            entries, report = await self.inspect(raw, name)
            existing = await self.existing([e["code"] for e in entries])
            entries = [e for e in entries if e["code"] not in existing]
            report.update(added=len(entries), duplicates=report["total"] - len(entries))
            doc = {"_id": key, "kind": "import", "report": report, "raw": raw,
                   "user_id": user_id, "createdAt": datetime.now(timezone.utc).isoformat()}
            # Do not index an empty array as a shared null code.
            if entries:
                doc["entries"] = entries
            try:
                await self.batches.insert_one(doc)
                return report
            except DuplicateKeyError:
                if await self.batches.find_one({"_id": key}):
                    return {**report, "added": 0, "duplicates": report["total"]}
        raise HTTPException(409, "Eşzamanlı aktarım var; tekrar deneyin.")

    async def generate(self, payload, user_id):
        settings = {"prefix": payload.prefix, "length": payload.length, "count": payload.count}
        key = "generate:" + str(payload.requestId)
        previous = await self.batches.find_one({"_id": key})
        if previous:
            if previous["user_id"] != user_id or previous["settings"] != settings:
                raise HTTPException(409, "İşlem kimliği başka bir üretime ait.")
            return {"entries": previous["entries"]}
        remaining = payload.length - len(payload.prefix)
        if remaining < 1 or 62 ** remaining < payload.count:
            raise HTTPException(400, "Önek veya uzunluk bu adet için uygun değil.")
        for _ in range(10):
            candidates = set()
            for _attempt in range(max(1000, payload.count * 20)):
                candidates.add(payload.prefix + "".join(secrets.choice(ALPHABET) for _ in range(remaining)))
                if len(candidates) >= payload.count:
                    break
            candidates -= await self.existing(list(candidates))
            if len(candidates) < payload.count:
                continue
            now = datetime.now(timezone.utc).isoformat()
            entries = [{"code": code, "createdAt": now, "kind": "generate", "source": user_id}
                       for code in sorted(candidates)[:payload.count]]
            try:
                # One atomic document stores both reservations and audit log, before returning codes.
                await self.batches.insert_one({"_id": key, "kind": "generate", "settings": settings,
                                               "entries": entries, "createdAt": now, "user_id": user_id})
                return {"entries": entries}
            except DuplicateKeyError:
                previous = await self.batches.find_one({"_id": key})
                if previous:
                    if previous["user_id"] != user_id or previous["settings"] != settings:
                        raise HTTPException(409, "İşlem kimliği başka bir üretime ait.")
                    return {"entries": previous["entries"]}
        raise HTTPException(409, "Bu önek ve uzunlukta yeterli boş kod bulunamadı. Uzunluğu artırın.")


def create_barcode_router(db, get_user, store):
    router = APIRouter(prefix="/api/barcodes")

    async def authorize(request):
        user = await get_user(request)
        if not can_use_barcodes(user):
            raise HTTPException(403, "Barkod modülü için yetkiniz yok.")
        if not store.ready:
            raise HTTPException(503, "Barkod modülü hazırlanamadı. Backend loglarını ve barcode_logs klasörünü kontrol edin.")
        return user

    def decode(payload):
        try:
            raw = base64.b64decode(payload.base64, validate=True)
            if len(raw) > 2 * 1024 * 1024:
                raise ValueError()
            return raw
        except ValueError:
            raise HTTPException(400, "Geçersiz log dosyası (en fazla 2 MB).")

    @router.get("/summary")
    async def summary(request: Request):
        await authorize(request)
        totals = await store.batches.aggregate([
            {"$project": {"kind": 1, "count": {"$size": {"$ifNull": ["$entries", []]}}}},
            {"$group": {"_id": "$kind", "count": {"$sum": "$count"}}},
        ]).to_list(None)
        sources = await store.batches.find({"kind": "import"}, {"report": 1}).to_list(None)
        return {"persistent": True, "total": sum(t["count"] for t in totals),
                "sources": [s["report"] for s in sources],
                "generated": sum(t["count"] for t in totals if t["_id"] == "generate")}

    @router.post("/generate")
    async def generate(payload: GeneratePayload, request: Request):
        user = await authorize(request)
        return await store.generate(payload, user["user_id"])

    @router.get("/history")
    async def history(request: Request, q: str = "", page: int = 1):
        await authorize(request)
        page = max(1, min(page, 1000000))
        pipeline = [{"$unwind": "$entries"}, {"$match": {"entries.code": {"$regex": re.escape(q[:100]), "$options": "i"}}}]
        data = await store.batches.aggregate(pipeline + [{"$facet": {
            "count": [{"$count": "total"}], "items": [{"$sort": {"createdAt": -1, "entries.code": 1}},
                {"$skip": (page - 1) * 100}, {"$limit": 100}, {"$replaceRoot": {"newRoot": "$entries"}}],
        }}]).to_list(1)
        data = data[0]
        total = data["count"][0]["total"] if data["count"] else 0
        return {"items": data["items"], "total": total, "page": page, "pages": max(1, math.ceil(total / 100))}

    @router.post("/inspect")
    async def inspect(payload: ImportPayload, request: Request):
        user = await authorize(request)
        if user.get("role") != "admin":
            raise HTTPException(403, "Log aktarımı yönetici yetkisi gerektirir.")
        return (await store.inspect(decode(payload), payload.name))[1]

    @router.post("/import")
    async def import_log(payload: ImportPayload, request: Request):
        user = await authorize(request)
        if user.get("role") != "admin":
            raise HTTPException(403, "Log aktarımı yönetici yetkisi gerektirir.")
        return await store.import_log(decode(payload), payload.name, user["user_id"])

    @router.get("/export")
    async def export(request: Request):
        await authorize(request)
        lines = []
        async for batch in store.batches.find({}, {"entries": 1}).sort("createdAt", 1):
            for entry in batch.get("entries", []):
                if entry["createdAt"]:
                    date = entry["createdAt"].replace("T", " ")[:19]
                    lines.append(f"{date} - 1 adet barkod oluşturuldu:")
                lines.extend([entry["code"], "-----"])
        return Response("\n".join(lines), media_type="text/plain", headers={"Content-Disposition": 'attachment; filename="barcode_log.txt"'})

    return router
