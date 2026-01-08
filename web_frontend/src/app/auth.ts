const TOKEN_KEY = 'calendar_token'

export function saveToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export function onUnauthorized() {
  clearToken()
  window.location.href = '/login'
}

export function parseRole(n: number) {
  if (n === 2) return 'owner'
  if (n === 1) return 'moderator'
  return 'reader'
}

export default { saveToken, getToken, clearToken, onUnauthorized, parseRole }



export function b64urlDecode(input: string): string {
  
  let s = input.replace(/-/g, '+').replace(/_/g, '/')
  
  while (s.length % 4 !== 0) s += '='
  
  try {
    return atob(s)
  } catch (e) {
    
    return ''
  }
}

export function getCurrentUserId(): string | null {
  const token = getToken()
  if (!token) return null
  const parts = token.split('.')
  if (parts.length < 2) return null
  try {
    const decoded = b64urlDecode(parts[1])
    if (!decoded) return null
    const payload = JSON.parse(decoded)
    
    return payload.sub || payload.user_id || payload.id || null
  } catch (e) {
    return null
  }
}




export function getCurrentUserDisplayName(): string | null {
  const token = getToken()
  if (!token) return null
  const parts = token.split('.')
  if (parts.length < 2) return null
  try {
    const decoded = b64urlDecode(parts[1])
    if (!decoded) return null
    const payload = JSON.parse(decoded)
    const fields = ['nickname','name','username','display_name','email']
    for (const f of fields) {
      if (payload[f]) return String(payload[f])
    }
    const id = payload.sub || payload.user_id || payload.id
    if (typeof id === 'string' && id.length > 0) return id.slice(0,8)
    return 'user'
  } catch (e) {
    return null
  }
}
