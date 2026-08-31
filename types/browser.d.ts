declare global {
  interface Navigator {
    share?: (data?: ShareData) => Promise<void>
    clipboard: Clipboard
  }
}

export {}
