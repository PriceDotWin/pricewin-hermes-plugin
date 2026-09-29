# PriceWin plugin for Hermes

Live hotel and flight prices compared across Booking.com, Agoda, Trip.com and
Traveloka, in one install. A portable Agent Plugins v1 package that bundles:

- **`mcp.json`** — the PriceWin MCP server, `https://mcp.price.win/mcp`
  (Streamable HTTP, no account, no API key);
- **`skills/pricewin-travel-search`** — how to run a search (results arrive in
  two steps), ask for what the guest has not said, and read prices in USD;
- **`desktop/plugin.js`** — inline hotel and flight cards in the Hermes Desktop
  transcript instead of raw text.

## Install

```bash
hermes plugins install pricewin
hermes plugins enable pricewin
```

Start a new session so the MCP tools load. The tools appear as
`mcp_pricewin_<tool>`.

The server exposes all twelve of its tools, including the four that act on a
booking: `request_booking` sends a request the hotel confirms (nothing is
charged, no room is held, the guest pays at the property), `check_booking_status`
reads it back, and cancelling takes a single-use token emailed to the guest
(`request_cancel_token`, then `cancel_booking`), so nothing is cancelled without
the guest's own inbox.

## What it renders

The agent writes a directive on its own paragraph and the transcript replaces it
with a card:

```
::pricewin-hotel{name="Liberty Central Riverside" price="58" stars="4"
                 area="District 1, Ho Chi Minh City" ota="agoda"
                 link="agoda.com/liberty-central/hotel/ho-chi-minh-city-vn.html?..."}

::pricewin-flight{route="SGN → HAN" airline="Vietnam Airlines" price="72"
                  depart="06:15" duration="2h10m" stops="0"
                  link="trip.com/flights/..."}
```

**`link` has no `https://` and no `www.`.** Hermes Desktop turns any URL in a
message into a hyperlink before it looks for directives, and a directive with a
hyperlink inside is no longer one — it shows as raw text. The PriceWin MCP
server gives every result a ready-made `link` in this form, trimmed to the dates
and party so it fits the 1024-character attribute limit. A directive that uses
`url="https://…"` instead is still read when it survives.

The desktop half is **off by default** after install: turn it on under
Capabilities → Plugins → PriceWin → Desktop.

| Directive | Attributes |
|---|---|
| `pricewin-hotel` | `name` (required), `price` (USD), `stars` (1–5), `area`, `ota`, `note`, `link` |
| `pricewin-flight` | `route` (required), `price` (USD), `airline`, `depart`, `duration`, `stops`, `link` |

The `pricewin-travel-search` skill is what teaches the agent to emit these.

## Safety

Directive attributes are untrusted model output, so the plugin validates all of
them and drops anything it cannot parse:

- The link (`link`, or the older `url`) must resolve to `https:` **and** be on PriceWin or one of the OTAs the search
  results link to (Agoda, Booking.com, Traveloka, Trip.com), subdomains
  included. Any other host renders no link at all, so a hallucinated URL never
  becomes a click target. The button label names the site from the URL itself,
  never from the model's text.
- `price` must be a positive number; `stars` must be 1–5.
- A card with no `name` (hotel) or `route` (flight) renders nothing.

The Desktop half makes no network requests, reads no files, and stores no
state. Links open in the system browser through `ctx.os.openExternal`. A card
never takes a booking or a payment: an OTA result is booked on the linked site,
and no step anywhere in this plugin takes money.

## Development

`desktop/plugin.js` is loaded uncompiled — there is no build step, and JSX
syntax will not parse. UI is written with `jsx()` / `jsxs()` calls, and
`@hermes/plugin-sdk`, `react` and `react/jsx-runtime` are the only importable
specifiers, which is why the plugin is a single file.

To develop against a live app, symlink the package into the Hermes home and
reload desktop plugins (⌘K → **Reload desktop plugins**):

```bash
ln -s "$PWD" ~/.hermes/plugins/pricewin
hermes plugins doctor pricewin
hermes plugins validate pricewin
```

## License

MIT
