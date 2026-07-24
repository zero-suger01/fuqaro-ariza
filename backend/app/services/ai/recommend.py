from app.models.complaint import ComplaintCategory

ORGANIZATION_MAP: dict[ComplaintCategory, list[str]] = {
    ComplaintCategory.CHIQINDI: ["Sanitariya xizmati", "Obodonlashtirish boshqarmasi"],
    ComplaintCategory.YOL: ["Yo'l xo'jaligi boshqarmasi", "Transport xizmati"],
    ComplaintCategory.ELEKTR: ["Elektr tarmoqlari korxonasi"],
    ComplaintCategory.GAZ: ["Hudgaz (gaz ta'minoti xizmati)"],
    ComplaintCategory.SUV: ["Suvsoz (suv ta'minoti xizmati)"],
    ComplaintCategory.DARAXT: ["Obodonlashtirish boshqarmasi", "Ekologiya qo'mitasi"],
    ComplaintCategory.EKOLOGIYA: ["Ekologiya va atrof-muhitni muhofaza qilish qo'mitasi"],
    ComplaintCategory.QURILISH: ["Davlat arxitektura-qurilish nazorati inspeksiyasi"],
    ComplaintCategory.OBODONLASHTIRISH: ["Obodonlashtirish boshqarmasi"],
    ComplaintCategory.BOSHQA: ["Tuman hokimligi murojaatlar bo'limi"],
}


def recommend_organizations(category: ComplaintCategory) -> list[str]:
    return ORGANIZATION_MAP.get(category, ORGANIZATION_MAP[ComplaintCategory.BOSHQA])
