import { describe, expect, it } from 'vitest'
import { UI_MESSAGES } from '../ui-messages'

describe('UI message coverage', () => {
  it('keeps the same common and administration keys in every locale', () => {
    const expectedCommon = Object.keys(UI_MESSAGES.en.ui.common).sort()
    const expectedAdmin = Object.keys(UI_MESSAGES.en.ui.admin).sort()

    for (const messages of Object.values(UI_MESSAGES)) {
      expect(Object.keys(messages.ui.common).sort()).toEqual(expectedCommon)
      expect(Object.keys(messages.ui.admin).sort()).toEqual(expectedAdmin)
      expect(Object.values(messages.ui.common).every((value) => value.trim().length > 0)).toBe(true)
      expect(Object.values(messages.ui.admin).every((value) => value.trim().length > 0)).toBe(true)
    }
  })
})
