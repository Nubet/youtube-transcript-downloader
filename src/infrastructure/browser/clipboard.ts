export function copyTranscript(text: string): Promise<void> {
  return navigator.clipboard.writeText(text)
}
