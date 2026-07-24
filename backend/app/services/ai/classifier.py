"""Text-based complaint classifier.

Real object-detection models (YOLO/RT-DETR) or a CLIP/vision-language model
would need labeled training data and GPU hosting that this project does not
have. Until that pipeline is wired up, `analyze` scores complaint text
against per-category keyword sets. Swap this module out for a real vision
model call by implementing `analyze()` with the same return shape -
callers (routers/ai.py, routers/complaints.py) don't need to change.
"""
import re
from dataclasses import dataclass

from app.models.complaint import ComplaintCategory

KEYWORDS: dict[ComplaintCategory, list[str]] = {
    ComplaintCategory.CHIQINDI: [
        "chiqindi", "axlat", "musor", "keladigan", "olib ketilmayapti", "poligon",
        "tashlandiq", "iflos", "konteyner", "chiqindilar",
    ],
    ComplaintCategory.YOL: [
        "yol", "asfalt", "chuqur", "yoriq", "yomg'ir", "svetofor", "yo'l belgisi",
        "piyodalar", "ko'cha yuzasi", "chuqurcha",
    ],
    ComplaintCategory.ELEKTR: [
        "elektr", "svet", "ustun", "sim", "transformator", "quvvat", "tok",
        "lampochka", "chiroq", "elektr ta'minoti",
    ],
    ComplaintCategory.GAZ: [
        "gaz", "gaz hidi", "gaz sizmoqda", "gaz quvuri", "portlash xavfi", "gaz ta'minoti",
    ],
    ComplaintCategory.SUV: [
        "suv", "quvur", "suv toshqini", "ichimlik suvi", "kanalizatsiya", "suv oqmoqda",
        "suv ta'minoti", "vodoprovod",
    ],
    ComplaintCategory.DARAXT: [
        "daraxt", "shox", "yiqilgan daraxt", "butalar", "yashil maydon", "daraxtlar kesilmoqda",
    ],
    ComplaintCategory.EKOLOGIYA: [
        "ekologiya", "hid", "tutun", "havo ifloslanishi", "chiqindi yoqilmoqda", "atrof-muhit",
    ],
    ComplaintCategory.QURILISH: [
        "qurilish", "noqonuniy qurilish", "bino", "inshoot", "ruxsatnomasiz", "qurilish chiqindisi",
    ],
    ComplaintCategory.OBODONLASHTIRISH: [
        "obodonlashtirish", "hovli", "skameyka", "bolalar maydonchasi", "landshaft", "yashillashtirish",
        "tozalik",
    ],
}

DEFAULT_CATEGORY = ComplaintCategory.BOSHQA


@dataclass
class ClassificationResult:
    category: ComplaintCategory
    confidence: float
    scores: dict[str, float]


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text.lower()).strip()


def analyze(text: str) -> ClassificationResult:
    normalized = _normalize(text)
    scores: dict[ComplaintCategory, int] = {cat: 0 for cat in KEYWORDS}

    for category, words in KEYWORDS.items():
        for word in words:
            if word in normalized:
                scores[category] += 1

    total_hits = sum(scores.values())
    if total_hits == 0:
        return ClassificationResult(
            category=DEFAULT_CATEGORY,
            confidence=0.35,
            scores={c.value: 0.0 for c in KEYWORDS},
        )

    best_category = max(scores, key=lambda c: scores[c])
    confidence = min(0.99, 0.55 + 0.15 * scores[best_category])
    normalized_scores = {c.value: round(s / total_hits, 2) for c, s in scores.items()}

    return ClassificationResult(category=best_category, confidence=round(confidence, 2), scores=normalized_scores)
