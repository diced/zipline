export enum RenderMode {
  Katex,
  Markdown,
  Highlight,
}

export function renderMode(extension: string) {
  switch (extension) {
    case 'tex':
      return RenderMode.Katex;
    case 'md':
      return RenderMode.Markdown;
    default:
      return RenderMode.Highlight;
  }
}
