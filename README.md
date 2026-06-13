# Finance Console

A static personal finance dashboard that reads live data from Google Sheets and turns it into cash-flow, balance, portfolio, and goals views.

## What It Connects To

The app is configured in `app.js` to use the larger dashboard workbook as the source of truth, with MP, Colette, and Together views:

- `mp bank transactions data for finances dashboard`
  - `BSA_Transactions`
  - `BSA_Balances`
  - `Colette_Income`
  - `Collette_Monthly_Expenses`
  - `COLETTE`
  - `Stock Overview`
  - `Fidelity_Stocks`
  - `Goals`

No private API keys, service account files, OAuth tokens, or credentials are included. The site reads public/client-accessible Google Sheets data through Google's visualization endpoint. If the sheets are private to your Google account, a deployed public site may fall back to demo data unless you publish/share the needed sheets appropriately.

Operating cash flow intentionally excludes transfer and debt-payment overlap categories such as `Transfers In`, `Transfers Out`, and `Debt Payments` so credit-card payments and account moves do not double-count as normal spending.

## Run Locally

This is a plain static website. You can open `index.html` directly, or run a small local preview server:

```bash
npm install
npm run dev
```

Then open the local URL printed by the command.

## Deploy To Vercel

1. Import this GitHub repository into Vercel.
2. Use the default static site settings.
3. Leave build command empty or use `npm run build`.
4. Set output directory to `.` if Vercel asks.
5. Deploy.

## Deploy To Netlify

1. Import this GitHub repository into Netlify.
2. Use `npm run build` as the build command.
3. Use `.` as the publish directory.
4. Deploy.

## Updating Sheet Sources

Edit the `SHEETS` object at the top of `app.js` if tab names, `gid` values, or ranges change.

The app intentionally keeps all source configuration in client-side JavaScript because it is a static website. Do not add private API keys or credentials to this repository.
