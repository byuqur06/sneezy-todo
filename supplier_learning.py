from typing import Any, Dict, List, Optional


FIXED_RULE_RELEARN_THRESHOLD = 2


def add_observation(
    observations: List[Dict[str, Any]],
    list_id: str,
    observed_at: str,
) -> List[Dict[str, Any]]:
    next_observations = [dict(item) for item in (observations or [])]

    for observation in next_observations:
        if str(observation.get("list_id")) == str(list_id):
            observation["count"] = int(observation.get("count") or 0) + 1
            observation["last_seen_at"] = observed_at
            return next_observations

    next_observations.append({
        "list_id": list_id,
        "count": 1,
        "last_seen_at": observed_at,
    })
    return next_observations


def supplier_rule_decision(rule: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not rule or not rule.get("enabled", True) or not rule.get("list_id"):
        return None

    mode = rule.get("mode") or "learned"
    observations = rule.get("observations") or []
    total = sum(max(0, int(item.get("count") or 0)) for item in observations)
    selected_count = next(
        (
            max(0, int(item.get("count") or 0))
            for item in observations
            if str(item.get("list_id")) == str(rule.get("list_id"))
        ),
        0,
    )

    if mode != "fixed":
        competing_count = max(
            [
                max(0, int(item.get("count") or 0))
                for item in observations
                if str(item.get("list_id")) != str(rule.get("list_id"))
            ]
            or [0]
        )
        if selected_count < 2 or selected_count <= competing_count:
            return None

    return {
        "list_id": rule.get("list_id"),
        "supplier_pending": False,
        "supplier_assignment_source": "fixed" if mode == "fixed" else "learned",
        "supplier_rule_id": rule.get("rule_id") or "",
        "supplier_confidence": 1 if mode == "fixed" else round(selected_count / max(total, 1), 3),
    }


def evolve_supplier_rule(
    existing: Optional[Dict[str, Any]],
    target_list_id: str,
    mode: str,
    observed_at: str,
) -> Dict[str, Any]:
    existing_doc = existing or {}
    existing_mode = existing_doc.get("mode") or "learned"
    observations = [dict(item) for item in (existing_doc.get("observations") or [])]
    corrections = [
        dict(item)
        for item in (existing_doc.get("correction_observations") or [])
    ]
    next_mode = existing_mode
    selected_list_id = existing_doc.get("list_id") or target_list_id

    if mode == "default":
        return {
            "list_id": target_list_id,
            "mode": "fixed",
            "observations": [],
            "correction_observations": [],
        }

    if existing_mode == "fixed" and existing_doc.get("list_id"):
        fixed_list_id = existing_doc.get("list_id")

        if str(target_list_id) == str(fixed_list_id):
            corrections = []
            selected_list_id = fixed_list_id
        else:
            corrections = add_observation(corrections, target_list_id, observed_at)
            correction_total = sum(int(item.get("count") or 0) for item in corrections)

            if correction_total >= FIXED_RULE_RELEARN_THRESHOLD:
                observations = corrections
                corrections = []
                next_mode = "learned"
                ranked = sorted(
                    observations,
                    key=lambda item: int(item.get("count") or 0),
                    reverse=True,
                )
                selected_list_id = ranked[0].get("list_id")
            else:
                selected_list_id = fixed_list_id
    else:
        observations = add_observation(observations, target_list_id, observed_at)
        ranked = sorted(
            observations,
            key=lambda item: int(item.get("count") or 0),
            reverse=True,
        )
        next_mode = "learned"
        selected_list_id = ranked[0].get("list_id") if ranked else target_list_id

    return {
        "list_id": selected_list_id,
        "mode": next_mode,
        "observations": observations,
        "correction_observations": corrections,
    }
