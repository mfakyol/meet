/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Optional TURN server (for NAT traversal when direct P2P fails).
  readonly VITE_TURN_URL?: string;
  readonly VITE_TURN_USERNAME?: string;
  readonly VITE_TURN_CREDENTIAL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
