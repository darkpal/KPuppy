import { useEffect, useRef } from 'preact/hooks'

export function useEventListener<K extends keyof DocumentEventMap>(
  eventName: K,
  handler: (event: DocumentEventMap[K]) => void,
  enabled: boolean = true
): void {
  const savedHandler = useRef(handler)

  useEffect(() => {
    savedHandler.current = handler
  }, [handler])

  useEffect(() => {
    if (!enabled) return

    const eventListener = (event: DocumentEventMap[K]) => savedHandler.current(event)
    document.addEventListener(eventName, eventListener)
    return () => document.removeEventListener(eventName, eventListener)
  }, [eventName, enabled])
}
