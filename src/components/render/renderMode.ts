export enum RenderMode {
  Katex = 'katex',
  Markdown = 'md',
  Highlight = 'hl',
}

export function renderMode(extension: string) {
  switch (extension.toLowerCase()) {
    case 'tex':
    case 'katex':
      return RenderMode.Katex;
    case 'md':
      return RenderMode.Markdown;
    default:
      return RenderMode.Highlight;
  }
}
