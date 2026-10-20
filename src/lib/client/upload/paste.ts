export function getPastedContent(event: ClipboardEvent): { files: File[]; text: string } | null {
  if (event.defaultPrevented || !event.clipboardData) return null;

  const editable = event
    .composedPath()
    .some(
      (target) =>
        target instanceof HTMLElement && (target.matches('input, textarea') || target.isContentEditable),
    );
  if (editable) return null;

  const files = Array.from(event.clipboardData.items)
    .filter((item) => item.kind === 'file')
    .map((item) => item.getAsFile())
    .filter((file): file is File => file !== null);

  return { files, text: files.length > 0 ? '' : event.clipboardData.getData('text/plain') };
}
