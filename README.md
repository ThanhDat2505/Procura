# Procura

Web frontend for Procura, a B2B sourcing platform for Vietnamese SMEs. Buyers find suppliers, send RFQs (requests for quotation) and compare the quotations they get back. Suppliers receive RFQs and submit quotations.

The UI is built from the approved Google Stitch designs (project "Procura B2B Sourcing Platform"). A copy of each screen's exported HTML is in [design/stitch/](design/stitch/), named by screen code.

## Quick start

Requires Node 22+.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit + flow tests (Vitest)
npm run build      # typecheck + production build
```

Demo accounts (password `123456`):

| Role | Email | Who |
|---|---|---|
| Buyer | `hoang.tn@anphuoc.vn` | Trần Nhật Hoàng, An Phước Logistics |
| Supplier | `quan.td@tanphatpack.vn` | Trần Đình Quân, Tân Phát Packaging |

The app runs on a mock backend in the browser, so no server is needed. Data is saved in `localStorage`. To restore the demo data, run `__procura.reset()` in the browser console.

The demo clock starts at **18/11/2025 09:30**, the date the designs use, and then moves forward in real time. That keeps countdowns like "Còn 2 ngày" matching the designs.

## What you can do in the demo

1. **Buyer: find suppliers.** Filter and select suppliers in *Tìm nhà cung cấp*, then use *Tạo RFQ với NCC đã chọn*.
2. **Buyer: create an RFQ.** The wizard has 4 steps: details and specs, suppliers, terms and evaluation weights, then review and send.
3. **Suppliers reply.** Suppliers without a demo login reply automatically within about 30 seconds of sending. Tân Phát answers only through the Supplier Portal.
4. **Supplier: quote.** Sign in as Tân Phát and open *Hộp thư RFQ*. From there you can submit, edit or withdraw a quotation before the deadline.
5. **Buyer: compare and award.** Open *So sánh báo giá*. The recommendation comes from a transparent weighted score that uses the buyer's own criteria weights. *Chọn nhà cung cấp trúng thầu* marks the RFQ as awarded and notifies the suppliers.

**Out of scope by product decision:** purchase orders, contracts, payments, deposits, logistics and delivery tracking. Choosing the winning supplier does not create an order.

## Architecture

```
src/
  domain/        Pure business rules and types (no React): RFQ status, deadlines, validation
                 schemas, quotation comparison scoring, supplier search, performance stats, formatting.
  services/      API contracts (contracts.ts) + two implementations:
    mock/        in-browser backend: seeded data, localStorage persistence, simulated suppliers
    http/        REST client for the future Procura API (same contracts)
  hooks/         TanStack Query hooks: the only way UI code talks to services
  components/
    ui/          Design-system components (Button, Card, Badge, Table, Form controls, Modal…)
    layout/      AppShell (sidebar, top bar, notifications, user menu) for Buyer and Supplier
  features/      Screens, grouped by role and flow (buyer/*, supplier/*, auth, account)
  i18n/          i18next setup + locales/{vi,en}/<namespace>.json (Vietnamese is the default)
  app/           Router, route guards, providers
```

- **Design tokens.** `tailwind.config.ts` copies the Stitch Material 3 colour roles and type scale under the same names, so classes from the Stitch HTML work unchanged. The main buttons use the DESIGN.md action blue `#0078F8`.
- **Connecting a backend.** Set `VITE_API_MODE=http` and `VITE_API_BASE_URL` (see `.env.example`). The REST client in `src/services/http` already lists one endpoint per contract method. Screens don't need any changes.
- **Languages.** Vietnamese is the default, and users can switch to English in the user menu, the login page or Settings. To add text to a feature, add keys to its namespace file in both `vi` and `en`.

## Screen map

| Code | Route |
|---|---|
| AUTH-01 | `/login` |
| BUY-01 | `/buyer` |
| BUY-02 | `/buyer/suppliers` |
| BUY-03 / 03b / 03c / 03d / 03e | `/buyer/suppliers/:id` and the tabs `products`, `history`, `legal`, `reviews` |
| BUY-04 | `/buyer/saved` |
| BUY-05 | `/buyer/rfqs` |
| BUY-06 / 06b / 06c / 06d | `/buyer/rfqs/:id/edit/1` … `/4` (`/buyer/rfqs/new` creates the draft) |
| BUY-06e | `/buyer/rfqs/:id/sent` |
| BUY-07 | `/buyer/rfqs/:id` |
| BUY-08 | `/buyer/rfqs/:id/compare` |
| BUY-09 | `/buyer/compare` |
| SUP-01 | `/supplier/inbox` |
| SUP-02 / SUP-04 | `/supplier/inbox/:rfqId` |
| SUP-03 | `/supplier/quotations` |
| SUP-04b | `/supplier/quotations/:id` |
| SUP-05 / 05b / 05c / 05d / 05e | `/supplier/profile` and the tabs `capacity`, `products`, `legal`, `contacts` |
| SUP-06 | `/supplier/performance` |
| SET-01, HELP-01 | `/buyer/settings`, `/buyer/help`, `/supplier/settings`, `/supplier/help` |
