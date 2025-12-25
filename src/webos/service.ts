declare global {
  interface Window {
    webOS?: {
      service: {
        request: (
          uri: string,
          params: {
            method?: string
            parameters?: Record<string, unknown>
            onSuccess?: (response: LunaResponse) => void
            onFailure?: (error: LunaError) => void
            onComplete?: (response: LunaResponse | LunaError) => void
            subscribe?: boolean
          }
        ) => { cancel: () => void }
      }
      platformBack?: () => void
      deviceInfo?: (callback: (info: DeviceInfo) => void) => void
    }
    PalmSystem?: {
      platformBack?: () => void
    }
  }
}

export interface LunaResponse {
  returnValue: boolean
  [key: string]: unknown
}

export interface LunaError {
  returnValue: false
  errorCode: number
  errorText: string
}

export interface DeviceInfo {
  modelName?: string
  version?: string
  sdkVersion?: string
  screenWidth?: number
  screenHeight?: number
  uhd?: boolean
  hdr10?: boolean
  dolbyVision?: boolean
}

export function isWebOS(): boolean {
  return typeof window !== 'undefined' && !!window.webOS
}

export function lunaRequest<T extends LunaResponse>(
  uri: string,
  method: string,
  parameters: Record<string, unknown> = {}
): Promise<T> {
  return new Promise((resolve, reject) => {
    if (!window.webOS) {
      reject(new Error('Not running on webOS'))
      return
    }

    window.webOS.service.request(uri, {
      method,
      parameters,
      onSuccess: (response) => resolve(response as T),
      onFailure: (error) => reject(new Error(error.errorText || 'Luna request failed'))
    })
  })
}

export function platformBack(): void {
  if (window.webOS?.platformBack) {
    window.webOS.platformBack()
  } else if (window.PalmSystem?.platformBack) {
    window.PalmSystem.platformBack()
  }
}

export {}
