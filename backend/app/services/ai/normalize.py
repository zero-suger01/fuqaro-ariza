"""Text normalization for keyword matching (docs/07-ai-layer.md §2).

Cyrillic, Latin, apostrophe chaos, and dialect spellings are folded into one
shape. `category_keywords.keyword_norm` is stored already normalized;
incoming complaint text is run through the same pipeline before matching.
"""
import re
import unicodedata

_CYRILLIC_TO_LATIN = {
    "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "yo",
    "ж": "j", "з": "z", "и": "i", "й": "y", "к": "k", "л": "l", "м": "m",
    "н": "n", "о": "o", "п": "p", "р": "r", "с": "s", "т": "t", "у": "u",
    "ф": "f", "х": "x", "ц": "ts", "ч": "ch", "ш": "sh", "щ": "sh",
    "ъ": "'", "ы": "i", "ь": "'", "э": "e", "ю": "yu", "я": "ya",
    "ў": "o'", "қ": "q", "ғ": "g'", "ҳ": "h",
}

_APOSTROPHES = "ʻʼ`´‘’"


def normalize(text: str) -> str:
    text = unicodedata.normalize("NFC", text).lower()
    text = "".join(_CYRILLIC_TO_LATIN.get(ch, ch) for ch in text)
    for ch in _APOSTROPHES:
        text = text.replace(ch, "'")
    text = re.sub(r"[^a-z0-9' ]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def candidate_phrases(normalized_text: str) -> set[str]:
    """Single words plus 2-word phrases, for dictionary lookup."""
    words = normalized_text.split()
    phrases = {f"{a} {b}" for a, b in zip(words, words[1:])}
    return set(words) | phrases
