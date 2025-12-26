/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CLIENT_SECRET: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
