import Dexie, { type Table } from 'dexie'
import type { DictionaryEntry, SettingRecord, Tag } from '../domain/types'

export class MyDictionaryDatabase extends Dexie {
  entries!: Table<DictionaryEntry, string>
  tags!: Table<Tag, string>
  settings!: Table<SettingRecord, string>

  constructor() {
    super('watashi-jiten')
    this.version(1).stores({
      entries: '&id,normalizedHeadword,normalizedReading,entryType,language,createdAt,updatedAt,encounteredDate,lastViewedAt,randomShownAt,status,favorite,deletedAt,*tagIds,importBatchId',
      tags: '&id,&normalizedName,name,createdAt,updatedAt',
      settings: '&key'
    })
  }
}

export const db = new MyDictionaryDatabase()
export const dbEvents = new EventTarget()
export function notifyDatabaseChanged(): void {
  dbEvents.dispatchEvent(new Event('changed'))
}
