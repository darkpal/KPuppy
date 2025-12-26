import { useState, useEffect, useCallback } from 'preact/hooks'
import { requestDeviceCode, pollForToken, registerDevice, DeviceCodeResponse } from '../api/kinopub'
import { saveTokens, clearTokens, isAuthenticated as checkAuth } from '../storage'

export interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
  userCode: string | null
  verificationUri: string | null
  error: string | null
}

export interface UseAuthResult extends AuthState {
  startAuth: () => void
  logout: () => void
}

export function useAuth(): UseAuthResult {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: checkAuth(),
    isLoading: false,
    userCode: null,
    verificationUri: null,
    error: null
  })

  const [deviceCode, setDeviceCode] = useState<DeviceCodeResponse | null>(null)
  const [pollInterval, setPollInterval] = useState<number | null>(null)

  const startAuth = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const response = await requestDeviceCode()
      setDeviceCode(response)
      setPollInterval(response.interval * 1000)
      setState(prev => ({
        ...prev,
        isLoading: false,
        userCode: response.userCode,
        verificationUri: response.verificationUri
      }))
    } catch (err) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to start authentication'
      }))
    }
  }, [])

  const logout = useCallback(() => {
    clearTokens()
    setDeviceCode(null)
    setPollInterval(null)
    setState({
      isAuthenticated: false,
      isLoading: false,
      userCode: null,
      verificationUri: null,
      error: null
    })
  }, [])

  useEffect(() => {
    if (!deviceCode || !pollInterval || state.isAuthenticated) {
      return
    }

    const intervalId = setInterval(async () => {
      try {
        const result = await pollForToken(deviceCode.code)
        if (result) {
          saveTokens({
            access: result.accessToken,
            refresh: result.refreshToken,
            expiresAt: Date.now() + result.expiresIn * 1000
          })
          registerDevice().catch(err => {
            if (import.meta.env.DEV) console.error('registerDevice failed:', err)
          })
          setDeviceCode(null)
          setPollInterval(null)
          setState(prev => ({
            ...prev,
            isAuthenticated: true,
            userCode: null,
            verificationUri: null
          }))
        }
      } catch (err) {
        setState(prev => ({
          ...prev,
          error: err instanceof Error ? err.message : 'Authentication failed'
        }))
        setDeviceCode(null)
        setPollInterval(null)
      }
    }, pollInterval)

    return () => clearInterval(intervalId)
  }, [deviceCode, pollInterval, state.isAuthenticated])

  return {
    ...state,
    startAuth,
    logout
  }
}
