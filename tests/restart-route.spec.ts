/**
 * The /api/dsh-desktop-launcher/restart route contract: method gate, loopback
 * fence, systemctl dispatch, and the exit+relaunch fallback.
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { RESTART_DELAY_MS, makeRestartRoute } from '../src/restart.ts'

/** Capture the response state written by a handler. */
function fakeRes() {
  const state: { status: number; body: string } = { status: 0, body: '' }
  const res = {
    writeHead: (status: number, headers?: Record<string, unknown>) => {
      state.status = status
      void headers
    },
    end: (body?: string) => { state.body = body ?? '' },
  } as unknown as ServerResponse
  return { state, res }
}

/** Build a minimal loopback-looking request. */
function fakeReq(method: string, extra: Record<string, unknown> = {}): IncomingMessage {
  return {
    method,
    socket: { remoteAddress: '127.0.0.1' },
    headers: { host: '127.0.0.1:3080', ...extra },
  } as unknown as IncomingMessage
}

describe('restart route', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('rejects non-POST methods', async () => {
    const route = makeRestartRoute({
      fence: () => true,
      requestExit: () => {},
    })
    const { state, res } = fakeRes()
    await route.handler(fakeReq('GET'), res)
    expect(state.status).toBe(405)
  })

  it('rejects non-loopback requests', async () => {
    const route = makeRestartRoute({
      fence: () => false,
      requestExit: () => {},
    })
    const { state, res } = fakeRes()
    await route.handler(fakeReq('POST'), res)
    expect(state.status).toBe(403)
    expect(JSON.parse(state.body)).toEqual({ error: 'forbidden: loopback-only' })
  })

  it('acknowledges then dispatches a systemctl restart', async () => {
    vi.useFakeTimers()
    const exitCalls: number[] = []
    const route = makeRestartRoute({
      fence: () => true,
      requestExit: (code) => { exitCalls.push(code) },
      unit: 'dsh.service',
    })
    // systemctl exists in this environment; assert the route ack + scheduling seam.
    const { state, res } = fakeRes()
    const spy = vi.spyOn(globalThis, 'setTimeout')
    await route.handler(fakeReq('POST'), res)
    expect(state.status).toBe(200)
    expect(JSON.parse(state.body)).toEqual({ ok: true })
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('falls back to exit + relaunch when systemctl is unavailable', async () => {
    vi.useFakeTimers()
    const exits: number[] = []
    const route = makeRestartRoute({
      fence: () => true,
      requestExit: (code) => { exits.push(code) },
      unit: '',
    })
    // With unit '' the systemctl branch is skipped; the relaunchScript reads
    // /proc/self/cmdline which under vitest is not a dsh invocation, so it
    // falls back to a bounded exit only.
    const { state, res } = fakeRes()
    await route.handler(fakeReq('POST'), res)
    expect(state.status).toBe(200)
    await vi.advanceTimersByTimeAsync(RESTART_DELAY_MS)
    expect(exits).toEqual([0])
  })
})
