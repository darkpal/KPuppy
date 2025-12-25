import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/preact'
import { useAuth } from '../../src/hooks/useAuth'

const mockFetch = vi.fn()
global.fetch = mockFetch

vi.mock('../../src/api/kinopub', async () => {
  const actual = await vi.importActual('../../src/api/kinopub')
  return {
    ...actual,
    requestDeviceCode: vi.fn(),
    pollForToken: vi.fn(),
    registerDevice: vi.fn()
  }
})

import { requestDeviceCode, pollForToken, registerDevice } from '../../src/api/kinopub'

const mockRequestDeviceCode = vi.mocked(requestDeviceCode)
const mockPollForToken = vi.mocked(pollForToken)
const mockRegisterDevice = vi.mocked(registerDevice)

describe('useAuth', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
    mockRequestDeviceCode.mockReset()
    mockPollForToken.mockReset()
    mockRegisterDevice.mockReset()
    mockRegisterDevice.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('initializes with correct state when not authenticated', () => {
    const { result } = renderHook(() => useAuth())

    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.userCode).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('initializes as authenticated when valid tokens exist', () => {
    const tokens = {
      access: 'test-token',
      refresh: 'refresh-token',
      expiresAt: Date.now() + 3600000
    }
    localStorage.setItem('kpuppy_tokens', JSON.stringify(tokens))

    const { result } = renderHook(() => useAuth())

    expect(result.current.isAuthenticated).toBe(true)
  })

  it('startAuth triggers device code request', async () => {
    mockRequestDeviceCode.mockResolvedValueOnce({
      code: 'device-code',
      userCode: 'ABCD-1234',
      verificationUri: 'https://kino.pub/device',
      expiresIn: 600,
      interval: 5
    })

    const { result } = renderHook(() => useAuth())

    await act(async () => {
      result.current.startAuth()
    })

    expect(mockRequestDeviceCode).toHaveBeenCalled()
    expect(result.current.userCode).toBe('ABCD-1234')
    expect(result.current.verificationUri).toBe('https://kino.pub/device')
  })

  it('polls at correct interval', async () => {
    mockRequestDeviceCode.mockResolvedValueOnce({
      code: 'device-code',
      userCode: 'ABCD-1234',
      verificationUri: 'https://kino.pub/device',
      expiresIn: 600,
      interval: 5
    })
    mockPollForToken.mockResolvedValue(null)

    const { result } = renderHook(() => useAuth())

    await act(async () => {
      result.current.startAuth()
    })

    expect(mockPollForToken).not.toHaveBeenCalled()

    await act(async () => {
      vi.advanceTimersByTime(5000)
    })

    expect(mockPollForToken).toHaveBeenCalledTimes(1)

    await act(async () => {
      vi.advanceTimersByTime(5000)
    })

    expect(mockPollForToken).toHaveBeenCalledTimes(2)
  })

  it('saves tokens on successful authentication', async () => {
    mockRequestDeviceCode.mockResolvedValueOnce({
      code: 'device-code',
      userCode: 'ABCD-1234',
      verificationUri: 'https://kino.pub/device',
      expiresIn: 600,
      interval: 5
    })
    mockPollForToken.mockResolvedValueOnce({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresIn: 3600
    })

    const { result } = renderHook(() => useAuth())

    await act(async () => {
      result.current.startAuth()
    })

    await act(async () => {
      vi.advanceTimersByTime(5000)
    })

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true)
    })

    const stored = localStorage.getItem('kpuppy_tokens')
    expect(stored).not.toBeNull()
    expect(JSON.parse(stored!).access).toBe('access-token')
  })

  it('handles errors gracefully', async () => {
    mockRequestDeviceCode.mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useAuth())

    await act(async () => {
      result.current.startAuth()
    })

    expect(result.current.error).toBe('Network error')
    expect(result.current.isLoading).toBe(false)
  })

  it('logout clears tokens and state', async () => {
    const tokens = {
      access: 'test-token',
      refresh: 'refresh-token',
      expiresAt: Date.now() + 3600000
    }
    localStorage.setItem('kpuppy_tokens', JSON.stringify(tokens))

    const { result } = renderHook(() => useAuth())

    expect(result.current.isAuthenticated).toBe(true)

    act(() => {
      result.current.logout()
    })

    expect(result.current.isAuthenticated).toBe(false)
    expect(localStorage.getItem('kpuppy_tokens')).toBeNull()
  })
})
