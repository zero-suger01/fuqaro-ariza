# e-Murojaat AI — AI coder qoidalari (repo darajasida)

Bu repo 2 kishilik jamoa + AI coder'lar (Claude Code / Kimi Code) bilan quriladi. Ishni boshlashdan oldin:

1. **O'qi:** `docs/README.md` → `docs/03-kontraktlar.md` → senga tegishli workstream fayli:
   - Backend/AI: `docs/05-backend-tasklar.md`, `docs/04-database.md`, `docs/07-ai-layer.md`
   - Frontend: `docs/06-frontend-tasklar.md`, `docs/10-ui-ux.md`
   - Telegram bot: `docs/08-telegram-bot.md`
2. **Kontrakt qonun:** `docs/03-kontraktlar.md` va `docs/04-database.md` dagi enum/endpoint/format/sxemaga zid kod yozish TAQIQLANADI. Zidlik sezsang — kod yozmasdan to'xta, foydalanuvchiga sabab bilan ayt.
3. **Tasklar tartibi:** workstream faylidagi birinchi `[ ]` taskdan boshla; tugagach `[x]` + 1 qator izoh yoz.
4. **Tekshiruvsiz "tayyor" dema:** backend — `pytest -m smoke` va Swagger; frontend — `npm run lint && npm run build` + 375px/1280px.
5. **Fuqaro sahifalari** (`/`, `/yangi`, `/holat`, `/go`): `docs/10-ui-ux.md` §2 qoidalari majburiy — 70+ yoshli foydalanuvchi uchun.
6. **Commit prefikslari:** `[BE]` `[FE]` `[BOT]` `[AI]` `[OPS]` `[DOCS]`.
7. Frontendda ishlashdan oldin `frontend/AGENTS.md` ni ham o'qi (Next.js 16 ogohlantirishi).

Loyihani lokal ko'tarish: `docs/11-devops.md` §1.
