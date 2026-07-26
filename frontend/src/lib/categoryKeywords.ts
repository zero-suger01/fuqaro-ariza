/** Fast, client-side keyword matcher for a *live* category preview while the
 * citizen types or after their voice message is transcribed. This is a
 * heuristic hint only — the authoritative classification is the real LLM
 * pipeline that runs server-side in the background after submission
 * (docs/07-ai-layer.md). A live LLM call isn't feasible here: on this
 * CPU-only setup one classification takes 2-6 minutes, so a per-keystroke
 * call would just hang. Keywords are normalized (apostrophe variants
 * stripped) so "o'zbek", "oʻzbek", "o‘zbek" all match the same way.
 */

const KEYWORDS: Record<string, string[]> = {
  yol_transport: [
    "yol", "yollar", "asfalt", "chuqur", "notekis yol", "svetofor",
    "kocha chirogi", "avtobus", "marshrut", "transport", "haydovchi",
    "yol belgisi", "piyoda", "tirbandlik", "moshina", "avtomobil",
  ],
  suv_kanalizatsiya: [
    "suv", "ichimlik suvi", "suv bosimi", "kanalizatsiya", "ariq", "zovur",
    "quvur", "suv toshqini", "kran", "suv yoq", "suv kelmayapti",
  ],
  elektr: [
    "elektr", "tok", "chiroq uzilishi", "uzilish", "kuchlanish",
    "transformator", "simlar", "elektr toki", "svet",
  ],
  gaz: [
    "gaz", "tabiiy gaz", "gaz bosimi", "gaz quvuri", "gaz hisoblagichi",
    "gaz plita", "gaz baloni",
  ],
  chiqindi_obodon: [
    "axlat", "chiqindi", "axlat olib ketish", "chiqindixona", "konteyner",
    "tozalash", "daraxt ekish", "gulzor", "hudud tozalash", "obodonlashtirish",
  ],
  uy_kommunal: [
    "kop qavatli", "tom", "podval", "lift", "isitish", "uy-joy", "kommunal",
    "kirish qismi", "devor yorilgan", "isitish tizimi",
  ],
  ekologiya: [
    "ifloslanish", "havo ifloslanishi", "tutun", "daraxt kesish", "shovqin",
    "ekologik", "gaz chiqindisi", "chang",
  ],
  jamoat_xavfsizlik: [
    "noqonuniy qurilish", "tungi shovqin", "bezorilik", "yol xavfsizligi",
    "jinoyat", "tartibsizlik", "mushtlashuv", "ogri", "tovlamachilik",
  ],
  yongin_xavfsizligi: [
    "yongin", "yonib ketdi", "elektr simlari xavfi", "gaz uskunasi xavfi",
    "tutun chiqmoqda", "favqulodda",
  ],
  sogliqni_saqlash: [
    "poliklinika", "shifoxona", "dorixona", "dori-darmon", "tibbiy xizmat",
    "shifokor", "kasalxona", "tibbiyot",
  ],
  talim: [
    "maktab", "bogcha", "oqituvchi", "talim sifati", "dars", "sinf",
    "bolalar bogchasi",
  ],
  ijtimoiy_yordam: [
    "nafaqa", "moddiy yordam", "subsidiya", "nogironlik", "ijtimoiy yordam",
    "kambagal oila",
  ],
  bandlik_mehnat: [
    "ishga joylashish", "mehnat huquqi", "ish haqi", "ishdan boshatish",
    "mehnat shartnomasi", "ish topolmayapman",
  ],
  yer_kadastr: [
    "yer ajratish", "kadastr", "yer hujjatlari", "noqonuniy egallash",
    "uchastka", "yer masalasi",
  ],
  qurilish_arxitektura: [
    "qurilish ruxsati", "noqonuniy qurilish", "rekonstruksiya",
    "arxitektura", "qurilish ishlari",
  ],
  soliq_moliya: [
    "soliq", "jarima", "davlat tolovi", "soliq inspeksiyasi",
  ],
  fhdyo_hujjatlar: [
    "tugilganlik guvohnomasi", "nikoh", "pasport", "royxatdan otish",
    "fhdyo", "hujjat masalasi",
  ],
  qishloq_xojaligi: [
    "sugorish", "fermer", "chorvachilik", "dehqonchilik", "qishloq xojaligi",
  ],
  telekommunikatsiya: [
    "internet", "telefon aloqasi", "pochta xizmati", "aloqa yoq",
    "tarmoq ishlamayapti",
  ],
  huquqiy_masalalar: [
    "mansabdor", "korrupsiya", "davlat organi", "sudya", "huquqbuzarlik",
    "amaldor",
  ],
  taklif_tashabbus: [
    "taklif", "tashabbus", "loyiha", "rivojlantirish boyicha",
  ],
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ʻʼ'`’‘]/g, "")
    .replace(/[^a-zʻʼ'`’‘Ѐ-ӿ\s]/g, " ");
}

const NORMALIZED_KEYWORDS: Record<string, string[]> = Object.fromEntries(
  Object.entries(KEYWORDS).map(([code, words]) => [code, words.map(normalize)])
);

/** Returns the best-matching category code, or null if no keyword hits. */
export function detectCategoryCode(text: string): string | null {
  const normalized = normalize(text);
  if (!normalized.trim()) return null;

  let bestCode: string | null = null;
  let bestScore = 0;
  for (const [code, words] of Object.entries(NORMALIZED_KEYWORDS)) {
    let score = 0;
    for (const word of words) {
      if (word && normalized.includes(word)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestCode = code;
    }
  }
  return bestScore > 0 ? bestCode : null;
}
