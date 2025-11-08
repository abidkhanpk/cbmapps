declare module 'html-to-image' {
  export function toPng(node: HTMLElement, options?: { backgroundColor?: string }): Promise<string>
}
