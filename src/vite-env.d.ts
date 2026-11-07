/// <reference types="vite/client" />

/** Day bundles and characters baked into the static preview build; empty in every other build. */
declare module 'virtual:preview-data' {
  const data: {
    days: Record<string, import('./server/dayBundle').DayBundle>
    characters: import('./content/types').PublicCharacter[]
  }
  export default data
}
