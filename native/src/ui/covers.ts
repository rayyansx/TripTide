/** Same two-stop covers as client/src/utils/gradients.ts (entityGradient). */
export const COVER_GRADIENTS: [string, string][] = [
  ['#667eea', '#764ba2'],
  ['#f093fb', '#f5576c'],
  ['#4facfe', '#00f2fe'],
  ['#43e97b', '#38f9d7'],
  ['#fa709a', '#fee140'],
  ['#a18cd1', '#fbc2eb'],
  ['#ff9a9e', '#fad0c4'],
  ['#30cfd0', '#330867'],
];

export function coverGradient(id: number): [string, string] {
  const i = ((id % COVER_GRADIENTS.length) + COVER_GRADIENTS.length) % COVER_GRADIENTS.length;
  return COVER_GRADIENTS[i] ?? COVER_GRADIENTS[0];
}
