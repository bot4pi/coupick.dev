// vercel function: my current telegram avatar, served from this site.
// t.me/i/userpic always answers with a 302 to telegram's cdn, so the redirect is followed by hand:
// once, and only to a telegram host. anything unexpected falls back to the static /avatar.jpg.

const USERPIC_URL = 'https://t.me/i/userpic/320/bot4pi.jpg'
const ALLOWED_HOSTS = /(^|\.)(telesco\.pe|cdn-telegram\.org|t\.me|telegram\.org)$/

const fetchImage = async (source: URL, hops = 1): Promise<Response | null> => {
  const response = await fetch(source, { redirect: 'manual', signal: AbortSignal.timeout(5000) }).catch(() => null)

  if (response === null) {
    return null
  }

  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get('location')

    if (hops === 0 || location === null) {
      return null
    }

    const target = URL.canParse(location, source) ? new URL(location, source) : null

    if (target === null || target.protocol !== 'https:' || !ALLOWED_HOSTS.test(target.hostname)) {
      return null
    }

    return fetchImage(target, hops - 1)
  }

  return response.ok ? response : null
}

export async function GET (request: Request): Promise<Response> {
  const upstream = await fetchImage(new URL(USERPIC_URL))
  const type = upstream?.headers.get('content-type') ?? ''

  if (upstream === null || !type.startsWith('image/')) {
    return new Response(null, {
      status: 302,
      headers: { Location: new URL('/avatar.jpg', request.url).toString(), 'Cache-Control': 'public, max-age=300' }
    })
  }

  return new Response(await upstream.arrayBuffer(), {
    headers: {
      'Content-Type': type,
      // an hour is fresh enough for an avatar; serve the old one while the new one loads
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400'
    }
  })
}
