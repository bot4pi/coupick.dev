# coupick.dev

sources of my [coupick.dev](https://coupick.dev) website.

preact + vite + typescript, deployed on vercel. the server-side bits are three vercel functions:
[`api/now-playing.ts`](api/now-playing.ts) asks spotify what i'm listening to,
[`api/wakatime.ts`](api/wakatime.ts) sums up my coding time from wakatime,
[`api/avatar.ts`](api/avatar.ts) serves my current telegram avatar.

## the glyph thing

every animated block of letters on the site (the intro, the avatar, the album cover, the project covers,
the idle spotify card, the footer and the 404 page) is one small engine in [`src/ascii`](src/ascii):

- [`field.ts`](src/ascii/field.ts) draws a grid of glyphs whose brightness follows drifting simplex noise,
  optionally with a word or a picture burned into it. glyphs come from a pre-rendered atlas, so a full
  screen is a few thousand `drawImage` calls a frame
- [`assemble.ts`](src/ascii/assemble.ts) measures every character of the page that is on screen and flies a
  glyph out of the field into each of them. once they land, the real page is swapped in underneath

the intro plays once per tab session. `?intro` forces it, `prefers-reduced-motion` skips it.

in december it snows over the page (glyphs again, of course). it's the visitor's own calendar, so nothing
on the server is involved; `?snow` shows it any other month.

## running

```sh
npm install
npm run dev
```

the dev server runs the functions from `api` itself and reads their secrets from `.env.local`.
without them every widget just says it isn't connected; open `/?demo` to see them with sample data.

## building

```sh
npm run build
```

the static site lands in `dist`.

## deploying

import the repo on vercel (the vite preset is picked up from `vercel.json`), attach the `coupick.dev` domain
and set these environment variables:

| variable | where to get it |
|---|---|
| `SPOTIFY_CLIENT_ID` | an app on [developer.spotify.com](https://developer.spotify.com/dashboard) |
| `SPOTIFY_CLIENT_SECRET` | the same app |
| `SPOTIFY_REFRESH_TOKEN` | needs `user-read-currently-playing`; add `user-read-recently-played` to also show recent tracks |
| `WAKATIME_API_KEY` | optional, [wakatime.com/settings/api-key](https://wakatime.com/settings/api-key): switches the card to the last 7 days, day by day |
| `WAKATIME_USERNAME` | optional, `coup` by default: whose public all-time stats to show when there is no api key |

the spotify credentials from [spotify-telegram-sync](https://github.com/bot4pi/spotify-telegram-sync) work as is.
without them the site still works, the player just says nothing is playing.

the avatar comes from my telegram (`api/avatar.ts` proxies `t.me/i/userpic/320/bot4pi.jpg`, cached for an hour);
`public/avatar.jpg` is only the fallback when telegram doesn't answer.

## credits

the spotify block was inspired by [starkow.dev](https://starkow.dev)
([sources](https://github.com/nitreojs/starkow.dev), mit, © 2024 starkow).
the simplex noise follows stefan gustavson's public domain reference implementation.
brand icons come from [simple icons](https://simpleicons.org) (cc0), coin icons from tele-wiki,
the fonts are [geist and geist mono](https://github.com/vercel/geist-font) (ofl).
