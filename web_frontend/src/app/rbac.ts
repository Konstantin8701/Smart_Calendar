export function canRead(role: number | null) {
  return role !== null
}

export function canWrite(role: number | null) {
  return role !== null && role >= 1
}

export function canManageMembers(role: number | null) {
  return role !== null && role >= 1
}

export function canDelete(role: number | null) {
  return role !== null && role >= 2
}

export default { canRead, canWrite, canManageMembers, canDelete }

export function roleLabel(role: number | null) {
  if (role === null) return 'unknown'
  if (role === 2) return 'owner'
  if (role === 1) return 'moderator'
  return 'reader'
}



export function canRemove(actorRole: number | null, targetRole: number | null, isSelf: boolean) {
  if (actorRole === null || targetRole === null) return false
  if (isSelf) return false 
  
  if (actorRole === 2) return targetRole < 2
  
  if (actorRole === 1) return targetRole === 0
  return false
}
