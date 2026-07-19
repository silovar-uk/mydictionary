import { useCallback, useEffect, useState } from 'react'
import { db, dbEvents } from '../db/database'
import type { DictionaryEntry, Tag } from '../domain/types'

export function useDictionaryData(includeDeleted = false): {
  entries: DictionaryEntry[]
  tags: Tag[]
  loading: boolean
  refresh: () => Promise<void>
} {
  const [entries, setEntries] = useState<DictionaryEntry[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const [allEntries, allTags] = await Promise.all([db.entries.toArray(), db.tags.toArray()])
    setEntries(
      allEntries
        .filter((entry) => includeDeleted || !entry.deletedAt)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    )
    setTags(allTags.sort((a, b) => a.name.localeCompare(b.name, 'ja')))
    setLoading(false)
  }, [includeDeleted])

  useEffect(() => {
    void refresh()
    const handler = () => void refresh()
    dbEvents.addEventListener('changed', handler)
    return () => dbEvents.removeEventListener('changed', handler)
  }, [refresh])

  return { entries, tags, loading, refresh }
}
