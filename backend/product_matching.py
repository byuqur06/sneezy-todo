import re
import unicodedata
from typing import Any, Dict, Iterable, List, Optional, Set


MATCH_FIELDS = (
    "stock_code",
    "marketplace_stock_code",
    "barcode",
    "variant_id",
    "product_id",
)


def normalize_identifier(value: Any) -> str:
    text = str(value or "").strip()[:160].casefold()
    text = text.replace("ı", "i").replace("İ", "i")
    decomposed = unicodedata.normalize("NFKD", text)
    ascii_text = "".join(
        character
        for character in decomposed
        if not unicodedata.combining(character)
    )
    return re.sub(r"[^a-z0-9]+", "", ascii_text)


def build_match_indexes(
    products: Iterable[Dict[str, Any]],
) -> Dict[str, Dict[str, Set[int]]]:
    indexes: Dict[str, Dict[str, Set[int]]] = {
        field: {} for field in MATCH_FIELDS
    }

    for product_index, product in enumerate(products):
        for field in MATCH_FIELDS:
            normalized = normalize_identifier(product.get(field))
            if normalized:
                indexes[field].setdefault(normalized, set()).add(product_index)

    return indexes


def select_product_index(
    item: Dict[str, Any],
    indexes: Dict[str, Dict[str, Set[int]]],
) -> Optional[int]:
    strict_marketplace = bool(item.get("match_by_marketplace_stock_code"))

    if strict_marketplace:
        value = normalize_identifier(
            item.get("marketplace_stock_code") or item.get("stock_code")
        )
        candidates = indexes["marketplace_stock_code"].get(value, set())
        return next(iter(candidates)) if len(candidates) == 1 else None

    criteria = (
        (item.get("stock_code"), ("stock_code", "marketplace_stock_code")),
        (item.get("barcode"), ("barcode",)),
        (item.get("variant_id"), ("variant_id",)),
        (item.get("product_id"), ("product_id",)),
    )
    candidate_sets: List[Set[int]] = []

    for raw_value, fields in criteria:
        value = normalize_identifier(raw_value)
        if not value:
            continue

        candidates: Set[int] = set()
        for field in fields:
            candidates.update(indexes[field].get(value, set()))

        if candidates:
            candidate_sets.append(candidates)

    if not candidate_sets:
        return None

    resolved = set.intersection(*candidate_sets)
    return next(iter(resolved)) if len(resolved) == 1 else None
