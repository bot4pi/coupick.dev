// vercel function: what's playing on spotify right now.
// needs SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET and SPOTIFY_REFRESH_TOKEN in the project env.

const TOKEN_URL = 'https://accounts.spotify.com/api/token'
const API_URL = 'https://api.spotify.com/v1'

export interface Artist {
  name: string
  url: string
}

export interface Track {
  name: string
  url: string
  artists: Artist[]
  album: {
    name: string
    image: string | null
  }
  durationMs: number
  progressMs: number
  playing: boolean
}

export interface NowPlaying {
  configured: boolean
  track: Track | null
  recent: Track[]
  fetchedAt: number
}

interface SpotifyTrack {
  name: string
  duration_ms: number
  external_urls: { spotify: string }
  artists: { name: string, external_urls: { spotify: string } }[]
  album: { name: string, images: { url: string, width: number | null }[] }
}

let cachedToken: { value: string, expiresAt: number } | null = null

const getAccessToken = async (): Promise<string | null> => {
  if (cachedToken !== null && cachedToken.expiresAt > Date.now() + 10_000) {
    return cachedToken.value
  }

  const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN } = process.env

  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET || !SPOTIFY_REFRESH_TOKEN) {
    return null
  }

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: SPOTIFY_REFRESH_TOKEN }),
    signal: AbortSignal.timeout(6000)
  })

  if (!response.ok) {
    throw new Error(`spotify token: ${response.status}`)
  }

  const json = await response.json() as { access_token: string, expires_in: number }

  cachedToken = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 }

  return cachedToken.value
}

const toTrack = (item: SpotifyTrack, progressMs: number, playing: boolean): Track => {
  // spotify sorts covers from the largest; 300px is plenty for a 100px tile
  const image = item.album.images.find(i => i.width !== null && i.width <= 320) ?? item.album.images[0]

  return {
    name: item.name,
    url: item.external_urls.spotify,
    artists: item.artists.map(a => ({ name: a.name, url: a.external_urls.spotify })),
    album: { name: item.album.name, image: image?.url ?? null },
    durationMs: item.duration_ms,
    progressMs,
    playing
  }
}

const getCurrent = async (token: string): Promise<Track | null> => {
  const response = await fetch(`${API_URL}/me/player/currently-playing?additional_types=track`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(6000)
  })

  // 204: nothing is playing at all
  if (response.status === 204) {
    return null
  }

  if (!response.ok) {
    throw new Error(`spotify current: ${response.status}`)
  }

  const json = await response.json() as { is_playing: boolean, progress_ms: number | null, item: SpotifyTrack | null }

  if (json.item === null) {
    return null
  }

  return toTrack(json.item, json.progress_ms ?? 0, json.is_playing)
}

const getRecent = async (token: string): Promise<Track[]> => {
  const response = await fetch(`${API_URL}/me/player/recently-played?limit=3`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(6000)
  })

  // the refresh token may lack user-read-recently-played; recent tracks are optional
  if (!response.ok) {
    return []
  }

  const json = await response.json() as { items: { track: SpotifyTrack }[] }

  return json.items.map(i => toTrack(i.track, 0, false))
}

export async function GET (): Promise<Response> {
  const headers = { 'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=10' }

  try {
    const token = await getAccessToken()

    if (token === null) {
      return Response.json({ configured: false, track: null, recent: [], fetchedAt: Date.now() } satisfies NowPlaying, { headers })
    }

    const track = await getCurrent(token)
    const recent = track === null ? await getRecent(token) : []

    return Response.json({ configured: true, track, recent, fetchedAt: Date.now() } satisfies NowPlaying, { headers })
  } catch (error) {
    console.error(error)

    return Response.json({ error: 'spotify is unreachable' }, { status: 502 })
  }
}
