import { beforeEach } from 'vitest'

/**
 * Product default language is Russian. Screen/component tests assert English
 * UI strings, so pin English unless a test intentionally clears language.
 */
beforeEach(() => {
  if (!localStorage.getItem('kpuppy_language')) {
    localStorage.setItem('kpuppy_language', 'en')
  }
  if (!localStorage.getItem('kpuppy_device_defaults_applied')) {
    localStorage.setItem('kpuppy_device_defaults_applied', '1')
  }
})

const originalClear = Storage.prototype.clear
Storage.prototype.clear = function clearWithTestDefaults(this: Storage) {
  originalClear.call(this)
  this.setItem('kpuppy_language', 'en')
  this.setItem('kpuppy_device_defaults_applied', '1')
}
