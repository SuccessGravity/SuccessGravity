# Stack share previews (Cloudflare Worker)

Gives every shared My Stack link its own preview: the stack's name and monthly total in the title, its top tools in the description, and a 1200×630 image of the stack.

`successgravity.com` is already proxied by Cloudflare, so the Worker runs in front of GitHub Pages. Only two paths go through it:

| Route | What it does |
|---|---|
| `successgravity.com/stack*` | For links with `?s=…`, serves the normal page with stack-specific `og:` / `twitter:` tags. Other requests pass straight through. |
| `successgravity.com/og/*` | `/og/stack.svg?s=…` draws the stack card as SVG. The `og:image` URL converts it to PNG via wsrv.nl (free image proxy). |

If anything fails, the Worker falls back to the normal page, so the site never breaks because of it.

## Deploy from the Cloudflare dashboard (about 3 minutes)

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Create Worker**. Name it `sg-stack-og` → **Deploy**.
2. **Edit code** → replace everything with the contents of `worker.js` → **Deploy**.
3. Worker → **Settings** → **Domains & Routes** → **Add** → **Route**:
   - Zone `successgravity.com`, route `successgravity.com/stack*`
   - Add a second route: `successgravity.com/og/*`
4. Test:
   - Open `https://successgravity.com/og/stack.svg?s=notion~~3,slack~~3,zoom~~2&n=Test` — you should see the card.
   - Paste a shared stack link into https://www.opengraph.xyz/ or the LinkedIn Post Inspector to see the preview.

## Or deploy with Wrangler

```
cd workers/stack-og
npx wrangler deploy
```
(`wrangler.toml` already lists both routes.)

## Local check

```
node workers/stack-og/test.mjs   # prints the meta tags for a sample stack and writes sample.svg
```

The link format (`s=id~price~seats,…&n=name`) must stay in sync with `encodeStack()` in `assets/stack.js`.
