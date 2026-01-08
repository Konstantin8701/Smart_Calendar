import { describe, it, expect } from 'vitest'
import { canRead, canWrite, canManageMembers, canDelete, canRemove, roleLabel } from '../rbac'

describe('rbac helpers', () => {
  it('role label and basic permissions', () => {
    expect(roleLabel(null)).toBe('unknown')
    expect(roleLabel(2)).toBe('owner')
    expect(roleLabel(1)).toBe('moderator')
    expect(roleLabel(0)).toBe('reader')

    expect(canRead(null)).toBe(false)
    expect(canRead(0)).toBe(true)
    expect(canWrite(0)).toBe(false)
    expect(canWrite(1)).toBe(true)
    expect(canDelete(1)).toBe(false)
    expect(canDelete(2)).toBe(true)
  })

  it('canRemove semantics', () => {
    
    expect(canRemove(2, 1, false)).toBe(true)
    expect(canRemove(2, 0, false)).toBe(true)
    expect(canRemove(2, 2, false)).toBe(false)
    
    expect(canRemove(1, 0, false)).toBe(true)
    expect(canRemove(1, 1, false)).toBe(false)
    
    expect(canRemove(2, 1, true)).toBe(false)
    
    expect(canRemove(null, 1 as any, false)).toBe(false)
    expect(canRemove(1 as any, null, false)).toBe(false)
  })
})
