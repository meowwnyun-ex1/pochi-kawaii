/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_BASE_PATH?: string
  readonly VITE_ADMIN_PATH?: string
  readonly DEV?: boolean
  readonly MODE?: string
  readonly PROD?: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
