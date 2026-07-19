import type { DictionaryEntry, DiscoveryMode } from './types'

const DAY = 86_400_000

export function discoveryWeight(entry: DictionaryEntry, mode: DiscoveryMode, now = Date.now()): number {
  if (entry.deletedAt) return 0
  if (mode === 'random') return 1
  if (mode === 'unseen') return entry.viewCount === 0 ? 10 : 0.2
  if (mode === 'growing') return entry.status === 'growing' ? 8 : 0.2
  if (mode === 'favorite') return entry.favorite ? 8 : 0.1

  const lastViewed = entry.lastViewedAt ? new Date(entry.lastViewedAt).getTime() : 0
  const daysSinceViewed = lastViewed ? Math.max(0, (now - lastViewed) / DAY) : 999
  const randomShown = entry.randomShownAt ? new Date(entry.randomShownAt).getTime() : 0
  const daysSinceRandom = randomShown ? Math.max(0, (now - randomShown) / DAY) : 999

  if (mode === 'dormant') {
    return Math.min(20, 1 + daysSinceViewed / 10)
  }

  let weight = 1
  if (entry.viewCount === 0) weight += 6
  if (daysSinceViewed >= 30) weight += 6
  else if (daysSinceViewed >= 7) weight += 3
  if (entry.randomShownCount === 0) weight += 3
  if (entry.status === 'growing') weight += 1.5
  if (entry.favorite) weight += 0.5
  if (daysSinceViewed < 1) weight *= 0.05
  if (daysSinceRandom < 3) weight *= 0.2
  return Math.max(weight, 0.01)
}

function pickWeighted<T>(items: T[], getWeight: (item: T) => number, random = Math.random): T | undefined {
  const weighted = items.map((item) => ({ item, weight: Math.max(0, getWeight(item)) }))
  const total = weighted.reduce((sum, item) => sum + item.weight, 0)
  if (total <= 0) return undefined
  let cursor = random() * total
  for (const item of weighted) {
    cursor -= item.weight
    if (cursor <= 0) return item.item
  }
  return weighted.at(-1)?.item
}

export function buildDiscoveryPage(
  entries: DictionaryEntry[],
  mode: DiscoveryMode = 'thoughtful',
  count = 5,
  random = Math.random,
  now = Date.now()
): DictionaryEntry[] {
  const pool = entries.filter((entry) => !entry.deletedAt)
  const selected: DictionaryEntry[] = []
  const selectedIds = new Set<string>()
  const tagCounts = new Map<string, number>()
  const sourceCounts = new Map<string, number>()

  while (selected.length < count && selectedIds.size < pool.length) {
    const candidates = pool.filter((entry) => !selectedIds.has(entry.id))
    const picked = pickWeighted(
      candidates,
      (entry) => {
        let weight = discoveryWeight(entry, mode, now)
        const crowdedTag = entry.tagIds.some((tagId) => (tagCounts.get(tagId) ?? 0) >= 2)
        if (crowdedTag) weight *= 0.35
        if (entry.sourceTitle && (sourceCounts.get(entry.sourceTitle) ?? 0) >= 2) weight *= 0.35
        return weight
      },
      random
    )
    if (!picked) break
    selected.push(picked)
    selectedIds.add(picked.id)
    for (const tagId of picked.tagIds) tagCounts.set(tagId, (tagCounts.get(tagId) ?? 0) + 1)
    if (picked.sourceTitle) sourceCounts.set(picked.sourceTitle, (sourceCounts.get(picked.sourceTitle) ?? 0) + 1)
  }

  return selected
}
