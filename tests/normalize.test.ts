import { describe, expect, it } from 'vitest'
import { normalizeText, splitTags } from '../src/domain/normalize'

describe('normalizeText', () => {
  it('normalizes Japanese width, case and kana', () => {
    expect(normalizeText(' ＡＢＣ　カタカナ ')).toBe('abc かたかな')
  })

  it('flattens line breaks and repeated spaces', () => {
    expect(normalizeText('言葉\n  の  意味')).toBe('言葉 の 意味')
  })
})

describe('splitTags', () => {
  it('accepts commas, hashes and line breaks while removing duplicates', () => {
    expect(splitTags('企画, #読書\n企画')).toEqual(['企画', '読書'])
  })
})
