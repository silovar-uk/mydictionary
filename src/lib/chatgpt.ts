import type { DictionaryEntry, Tag } from '../domain/types'
import { ENTRY_TYPE_LABELS, SOURCE_TYPE_LABELS, STATUS_LABELS } from '../domain/types'

const CHATGPT_BASE_URL = 'https://chatgpt.com/'
const PROMPT_URL_LIMIT = 7000

function add(lines: string[], label: string, value: string | undefined) {
  const normalized = String(value || '').trim()
  if (normalized) lines.push(`${label}: ${normalized}`)
}

export function buildEntryChatPrompt(entry: DictionaryEntry, tags: Tag[]): string {
  const lines: string[] = [`【${entry.headword}】`]

  add(lines, '読み', entry.reading)
  lines.push(`種類: ${ENTRY_TYPE_LABELS[entry.entryType]}`)
  lines.push(`状態: ${STATUS_LABELS[entry.status]}`)
  add(lines, '一言での意味', entry.shortMeaning)
  add(lines, '意味・解釈', entry.meaning)

  if (entry.encounteredDate || entry.encounterContext) {
    lines.push('', '【出会ったとき】')
    add(lines, '日付', entry.encounteredDate)
    add(lines, '場面', entry.encounterContext)
  }

  if (entry.quotation) {
    lines.push('', '【原文・引用】', entry.quotation.trim())
  }

  if (entry.sourceTitle || entry.sourceAuthor || entry.sourceUrl || entry.sourceLocator || entry.sourceType) {
    lines.push('', '【出典】')
    if (entry.sourceType) lines.push(`種別: ${SOURCE_TYPE_LABELS[entry.sourceType]}`)
    add(lines, 'タイトル', entry.sourceTitle)
    add(lines, '著者', entry.sourceAuthor)
    add(lines, '位置', entry.sourceLocator)
    add(lines, 'URL', entry.sourceUrl)
  }

  if (entry.whySaved) {
    lines.push('', '【なぜ気になったか】', entry.whySaved.trim())
  }

  if (entry.usageNotes) {
    lines.push('', '【こんな時に使う】', entry.usageNotes.trim())
  }

  if (entry.examples.length > 0) {
    lines.push('', '【用例】', ...entry.examples.map((example) => `- ${example}`))
  }

  const tagNames = entry.tagIds
    .map((id) => tags.find((tag) => tag.id === id)?.name)
    .filter((name): name is string => Boolean(name))
  if (tagNames.length > 0) lines.push('', `タグ: ${tagNames.map((name) => `#${name}`).join(' ')}`)

  return lines.join('\n').trim()
}

async function writeClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.append(textarea)
  textarea.select()
  const copied = document.execCommand('copy')
  textarea.remove()
  if (!copied) throw new Error('copy failed')
}

export async function openChatGPTForEntry(entry: DictionaryEntry, tags: Tag[]) {
  const prompt = buildEntryChatPrompt(entry, tags)
  const url = `${CHATGPT_BASE_URL}?prompt=${encodeURIComponent(prompt)}`

  if (url.length <= PROMPT_URL_LIMIT) {
    window.open(url, '_blank', 'noopener,noreferrer')
    return
  }

  window.open(CHATGPT_BASE_URL, '_blank', 'noopener,noreferrer')
  try {
    await writeClipboard(prompt)
    window.alert('内容が長いため、語句情報をコピーしてChatGPTを開きました。入力欄へ貼り付けてください。')
  } catch {
    window.alert('ChatGPTは開きましたが、語句情報をコピーできませんでした。')
  }
}
