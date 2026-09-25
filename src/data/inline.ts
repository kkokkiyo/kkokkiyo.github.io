// 한 줄 텍스트의 **굵게**, *기울임*, [링크](주소)를 HTML로 변환
const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function inline(text: string | null | undefined): string {
  return escape(text ?? '')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[(.+?)\]\(((?:https?:\/\/|mailto:|\/)[^)\s]*)\)/g, '<a href="$2">$1</a>');
}
