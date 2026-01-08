import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { apiFetch } from '../api'
import * as auth from '../auth'

describe('apiFetch', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    
    
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns parsed JSON on 200', async () => {
    const fakeJson = { a: 1 }
    const mockRes = {
      ok: true,
      status: 200,
      headers: { get: (k: string) => 'application/json' },
      text: async () => JSON.stringify(fakeJson)
    }
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(mockRes as any)))
    vi.stubGlobal('localStorage', { getItem: vi.fn(() => null) } as any)

    const res = await apiFetch('/test')
    expect(res.status).toBe(200)
    expect(res.body).toEqual(fakeJson)
  })

  it('sets Authorization header when token present', async () => {
    const fakeJson = { ok: true }
    const mockRes = {
      ok: true,
      status: 200,
      headers: { get: (k: string) => 'application/json' },
      text: async () => JSON.stringify(fakeJson)
    }
    const fetchMock = vi.fn((url: string, opts: any) => Promise.resolve(mockRes as any))
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('localStorage', { getItem: vi.fn(() => 'mytoken') } as any)

    const res = await apiFetch('/auth')
    expect(fetchMock).toHaveBeenCalled()
    const calledOpts = (fetchMock as any).mock.calls[0][1]
    expect(calledOpts.headers['Authorization']).toBe('Bearer mytoken')
  })

  it('handles 204 No Content', async () => {
    const mockRes = {
      ok: true,
      status: 204,
      headers: { get: (k: string) => '' },
      text: async () => ''
    }
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(mockRes as any)))
    vi.stubGlobal('localStorage', { getItem: vi.fn(() => null) } as any)

    const res = await apiFetch('/nocontent')
    expect(res.status).toBe(204)
    expect(res.body).toBeNull()
  })

  it('throws on 401 and calls onUnauthorized', async () => {
    const body = { error: 'no' }
    const mockRes = {
      ok: false,
      status: 401,
      headers: { get: (k: string) => 'application/json' },
      text: async () => JSON.stringify(body)
    }
    const fetchMock = vi.fn(() => Promise.resolve(mockRes as any))
    vi.stubGlobal('fetch', fetchMock)
    const unauthorizedSpy = vi.spyOn(auth, 'onUnauthorized').mockImplementation(() => {})
    vi.stubGlobal('localStorage', { getItem: vi.fn(() => null) } as any)

    await expect(apiFetch('/x')).rejects.toMatchObject({ status: 401 })
    expect(unauthorizedSpy).toHaveBeenCalled()
  })

  it('propagates network errors', async () => {
    const fetchMock = vi.fn(() => Promise.reject(new Error('network')))
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('localStorage', { getItem: vi.fn(() => null) } as any)

    await expect(apiFetch('/net')).rejects.toThrow('network')
  })

  it('non-JSON response throws', async () => {
    const mockRes = {
      ok: true,
      status: 200,
      headers: { get: (k: string) => 'text/plain' },
      text: async () => 'hello'
    }
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(mockRes as any)))
    vi.stubGlobal('localStorage', { getItem: vi.fn(() => null) } as any)

    await expect(apiFetch('/txt')).rejects.toMatchObject({ status: 200 })
  })

  it('invalid JSON results in readable error', async () => {
    const mockRes = {
      ok: true,
      status: 200,
      headers: { get: (k: string) => 'application/json' },
      text: async () => '{broken json'
    }
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(mockRes as any)))
    vi.stubGlobal('localStorage', { getItem: vi.fn(() => null) } as any)

    await expect(apiFetch('/badjson')).rejects.toMatchObject({ error: { message: 'Invalid JSON' } })
  })

  it('403 does not call onUnauthorized but rejects with 403', async () => {
    const body = { error: 'forbidden' }
    const mockRes = {
      ok: false,
      status: 403,
      headers: { get: (k: string) => 'application/json' },
      text: async () => JSON.stringify(body)
    }
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(mockRes as any)))
    const unauthorizedSpy = vi.spyOn(auth, 'onUnauthorized').mockImplementation(() => {})
    vi.stubGlobal('localStorage', { getItem: vi.fn(() => null) } as any)

    await expect(apiFetch('/forb')).rejects.toMatchObject({ status: 403 })
    expect(unauthorizedSpy).not.toHaveBeenCalled()
  })

  it('timeout/abort triggers AbortError handling', async () => {
    vi.useFakeTimers()
    
    let controllerResolve: any = null
    class FakeSignal {
      aborted = false
      listeners: Function[] = []
      addEventListener(_ev: string, cb: Function) { this.listeners.push(cb) }
    }
    class FakeController {
      signal: FakeSignal
      constructor() { this.signal = new FakeSignal() }
      abort() { this.signal.aborted = true; for (const l of this.signal.listeners) l() }
    }
    vi.stubGlobal('AbortController', FakeController as any)

    
    const fetchMock = vi.fn((url: string, opts: any) => {
      return new Promise((_, rej) => {
        const sig = opts.signal
        if (!sig) return 
        if (sig.aborted) return rej(Object.assign(new Error('Aborted'), { name: 'AbortError' }))
        sig.addEventListener('abort', () => rej(Object.assign(new Error('Aborted'), { name: 'AbortError' })))
      })
    })
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('localStorage', { getItem: vi.fn(() => null) } as any)

    const p = apiFetch('/hang', { timeoutMs: 50 })
    
    vi.advanceTimersByTime(100)
    await expect(p).rejects.toMatchObject({ status: 0 })
    vi.useRealTimers()
  })

  it('POST sets Content-Type and passes body as-is', async () => {
    const mockRes = {
      ok: true,
      status: 200,
      headers: { get: (k: string) => 'application/json' },
      text: async () => JSON.stringify({ok:true})
    }
    const fetchMock = vi.fn((url: string, opts: any) => Promise.resolve(mockRes as any))
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('localStorage', { getItem: vi.fn(() => null) } as any)

  const body = { a: 1 }
  await apiFetch('/post', { method: 'POST', body: body as any })
    const calledOpts = (fetchMock as any).mock.calls[0][1]
    expect(calledOpts.method).toBe('POST')
    expect(calledOpts.headers['Content-Type']).toBe('application/json')
    
    expect(calledOpts.body).toBe(body)
  })
})
