import { parseStringPromise } from 'xml2js'

export interface RssItem {
  title: string
  description: string
  link: string
}

const RSS_URL = 'https://ent.sbs.co.kr/news/xml/RSSFeed.do'

function asString(val: unknown): string {
  if (val == null) return ''
  if (typeof val === 'string') return val.trim()
  if (Array.isArray(val)) return asString(val[0])
  return String(val).trim()
}

function normalizeItems(parsed: unknown): Record<string, unknown>[] {
  if (!parsed || typeof parsed !== 'object') return []
  const root = parsed as Record<string, unknown>
  const rssNode = root.rss
  const rss = (Array.isArray(rssNode) ? rssNode[0] : rssNode) as
    | Record<string, unknown>
    | undefined
  if (!rss) return []

  const channelRaw = rss.channel
  const channel = Array.isArray(channelRaw)
    ? (channelRaw[0] as Record<string, unknown>)
    : (channelRaw as Record<string, unknown> | undefined)
  if (!channel) return []

  const itemRaw = channel.item
  if (!itemRaw) return []
  const list = Array.isArray(itemRaw) ? itemRaw : [itemRaw]
  return list.filter((x): x is Record<string, unknown> => x != null && typeof x === 'object')
}

/**
 * SBS 연예 RSS에서 최신 20개 기사의 title·description·link 반환
 */
export async function fetchRssItems(): Promise<RssItem[]> {
  const res = await fetch(RSS_URL, {
    next: { revalidate: 0 },
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; QuizBot/1.0)',
      Accept: 'application/rss+xml, application/xml, text/xml, */*',
    },
  })

  if (!res.ok) {
    throw new Error(`RSS fetch failed: ${res.status} ${res.statusText}`)
  }

  const xml = await res.text()
  const parsed = await parseStringPromise(xml, {
    explicitArray: false,
    trim: true,
    mergeAttrs: true,
    explicitCharkey: false,
  })

  const items = normalizeItems(parsed).slice(0, 20)

  return items.map((item) => ({
    title: asString(item.title),
    description: asString(item.description),
    link: asString(item.link),
  }))
}
