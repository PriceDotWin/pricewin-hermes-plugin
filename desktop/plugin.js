// PriceWin — inline result cards for the Hermes Desktop transcript.
//
// The agent gets hotel and flight data from the `pricewin` MCP catalog entry.
// This plugin only changes how one result LOOKS: instead of a wall of JSON the
// model writes a directive paragraph and the transcript renders a card.
//
//   ::pricewin-hotel{name="Liberty Central Riverside" price="58" stars="4"
//                    area="District 1, Ho Chi Minh City" ota="Booking.com"
//                    url="https://www.price.win/..."}
//   ::pricewin-flight{route="SGN → HAN" airline="Vietnam Airlines" price="72"
//                     depart="06:15" duration="2h10m" stops="0"
//                     url="https://www.price.win/..."}
//
// Constraints this file lives under, both enforced by the host:
//   - loaded uncompiled, so no JSX syntax — jsx()/jsxs() calls only;
//   - the only resolvable imports are @hermes/plugin-sdk, react and
//     react/jsx-runtime, so everything stays in this one file.
//
// Directive attributes are untrusted model output: every field is validated
// here and a bad one is dropped rather than guessed at.

import { host, TRANSCRIPT_DIRECTIVE_AREA } from '@hermes/plugin-sdk'
import { jsx, jsxs } from 'react/jsx-runtime'

/** Links may only point at PriceWin — a hallucinated host must not become a click target. */
const ALLOWED_HOST = 'price.win'

const BORDER = '1px solid color-mix(in oklab, currentColor 18%, transparent)'
const CARD_STYLE = {
  border: BORDER,
  borderRadius: '10px',
  padding: '10px 12px',
  margin: '6px 0',
  maxWidth: '34rem',
}

function text(value) {
  return typeof value === 'string' ? value.trim() : ''
}

/** USD amount as written by the model; anything unparseable renders no price at all. */
function money(value) {
  const amount = Number(text(value))
  if (!Number.isFinite(amount) || amount <= 0) return ''
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount)
}

function safeUrl(value) {
  const raw = text(value)
  if (!raw) return ''
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:') return ''
    const host_ = url.hostname.toLowerCase()
    if (host_ !== ALLOWED_HOST && !host_.endsWith('.' + ALLOWED_HOST)) return ''
    return url.toString()
  } catch {
    return ''
  }
}

function stars(value) {
  const count = Math.round(Number(text(value)))
  if (!Number.isFinite(count) || count < 1 || count > 5) return ''
  return '★'.repeat(count)
}

/** Drops empty parts so a card never shows a stray separator. */
function joinParts(parts) {
  return parts.filter(Boolean).join(' · ')
}

function openLink(ctx, url) {
  ctx.os.openExternal(url).then((ok) => {
    if (!ok) host.notify({ kind: 'info', message: url, title: 'Open this link in your browser' })
  })
}

function linkButton(ctx, url, label) {
  if (!url) return null
  return jsx('button', {
    type: 'button',
    className: 'mt-2 text-xs underline underline-offset-2',
    style: { opacity: 0.85 },
    onClick: () => openLink(ctx, url),
    children: label,
  })
}

function priceBlock(amount, unit) {
  if (!amount) return null
  return jsxs('div', {
    className: 'shrink-0 text-right',
    children: [
      jsx('div', { className: 'font-medium', children: amount }),
      jsx('div', { className: 'text-xs text-(--ui-text-tertiary)', children: unit }),
    ],
  })
}

/** Shared shell: title line + meta line on the left, price on the right, link underneath. */
function resultCard(ctx, { title, meta, amount, unit, url, linkLabel }) {
  return jsxs('div', {
    style: CARD_STYLE,
    className: 'text-sm',
    children: [
      jsxs('div', {
        className: 'flex items-start justify-between gap-3',
        children: [
          jsxs('div', {
            className: 'min-w-0',
            children: [
              jsx('div', { className: 'font-medium', children: title }),
              meta
                ? jsx('div', { className: 'text-xs text-(--ui-text-tertiary)', children: meta })
                : null,
            ],
          }),
          priceBlock(amount, unit),
        ],
      }),
      linkButton(ctx, url, linkLabel),
    ],
  })
}

function HotelCard({ ctx, attrs }) {
  const name = text(attrs.name)
  if (!name) return null
  return resultCard(ctx, {
    title: joinParts([name, stars(attrs.stars)]),
    meta: joinParts([text(attrs.area), text(attrs.ota), text(attrs.note)]),
    amount: money(attrs.price),
    unit: 'per night',
    url: safeUrl(attrs.url),
    linkLabel: 'View on PriceWin',
  })
}

function FlightCard({ ctx, attrs }) {
  const route = text(attrs.route)
  if (!route) return null
  const stops = text(attrs.stops)
  const stopLabel = stops === '0' ? 'non-stop' : stops ? stops + ' stop' + (stops === '1' ? '' : 's') : ''
  return resultCard(ctx, {
    title: joinParts([route, text(attrs.airline)]),
    meta: joinParts([text(attrs.depart), text(attrs.duration), stopLabel]),
    amount: money(attrs.price),
    unit: 'total',
    url: safeUrl(attrs.url),
    linkLabel: 'View on PriceWin',
  })
}

export default {
  id: 'pricewin',
  name: 'PriceWin',
  register(ctx) {
    ctx.register({
      id: 'hotel-card',
      area: TRANSCRIPT_DIRECTIVE_AREA,
      data: {
        name: 'pricewin-hotel',
        render: ({ attrs }) => jsx(HotelCard, { ctx, attrs: attrs || {} }),
      },
    })
    ctx.register({
      id: 'flight-card',
      area: TRANSCRIPT_DIRECTIVE_AREA,
      data: {
        name: 'pricewin-flight',
        render: ({ attrs }) => jsx(FlightCard, { ctx, attrs: attrs || {} }),
      },
    })
  },
}
