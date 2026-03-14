const hasWindow = typeof window !== 'undefined'

const browserProtocol = hasWindow ? window.location.protocol : 'http:'
const browserHostname = hasWindow ? window.location.hostname : 'localhost'

const wsProtocol = browserProtocol === 'https:' ? 'wss:' : 'ws:'
const httpProtocol = browserProtocol === 'https:' ? 'https:' : 'http:'

export const WS_BASE_URL =
  import.meta.env.VITE_WS_BASE_URL || `${wsProtocol}//${browserHostname}:8000`

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || `${httpProtocol}//${browserHostname}:8000`
