// vercel function: how many people have opened the site.
// the numbers live in upstash redis (vercel → storage → upstash for redis, connected to this project);
// without it the counter just stays hidden.
// visitors are a hyperloglog of hashed ip + user agent: it can count them, but nothing in it points back to anyone.

import { createHash } from 'node:crypto'

export interface Visits {
  configured: boolean
  // unique visitors, approximate (hyperloglog, ~1% error)
  visitors: number
  // page opens, one per tab session
  views: number
}

const VISITORS_KEY = 'coupick:visitors'
const VIEWS_KEY = 'coupick:views'
const BOTS = /bot|crawl|spider|slurp|preview|headless|lighthouse|monitor|facebookexternalhit/i

interface RedisConfig {
  url: string
  token: string
}

// the marketplace integration names its variables KV_REST_API_*, a manual setup uses UPSTASH_REDIS_REST_*
const redisConfig = (): RedisConfig | null => {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN

  return url && token ? { url, token } : null
}

// upstash's rest api: several commands in one round trip
const pipeline = async ({ url, token }: RedisConfig, commands: (string | number)[][]) => {
  const response = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
    signal: AbortSignal.timeout(5000)
  })

  if (!response.ok) {
    throw new Error(`upstash: ${response.status}`)
  }

  const results = await response.json() as { result?: unknown, error?: string }[]

  return results.map(item => {
    if (item.error !== undefined) {
      throw new Error(`upstash: ${item.error}`)
    }

    return item.result
  })
}

const respond = (visits: Visits) => Response.json(visits, { headers: { 'Cache-Control': 'no-store' } })

const unreachable = (error: unknown) => {
  console.error(error)

  return Response.json({ error: 'the counter is unreachable' }, { status: 502 })
}

const notConfigured: Visits = { configured: false, visitors: 0, views: 0 }

// reads the counters
export async function GET (): Promise<Response> {
  const config = redisConfig()

  if (config === null) {
    return respond(notConfigured)
  }

  try {
    const [visitors, views] = await pipeline(config, [['PFCOUNT', VISITORS_KEY], ['GET', VIEWS_KEY]])

    return respond({ configured: true, visitors: Number(visitors) || 0, views: Number(views) || 0 })
  } catch (error) {
    return unreachable(error)
  }
}

// counts the current visitor, then reads the counters; the page posts once per tab session
export async function POST (request: Request): Promise<Response> {
  const config = redisConfig()
  const agent = request.headers.get('user-agent') ?? ''

  if (config === null) {
    return respond(notConfigured)
  }

  if (BOTS.test(agent)) {
    return GET()
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
  const visitor = createHash('sha256').update(`${ip}|${agent}`).digest('hex')

  try {
    const [, views, visitors] = await pipeline(config, [
      ['PFADD', VISITORS_KEY, visitor],
      ['INCR', VIEWS_KEY],
      ['PFCOUNT', VISITORS_KEY]
    ])

    return respond({ configured: true, visitors: Number(visitors) || 0, views: Number(views) || 0 })
  } catch (error) {
    return unreachable(error)
  }
}
