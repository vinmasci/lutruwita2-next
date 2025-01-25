export function cn(...inputs: (string | undefined | boolean)[]): string {
  return inputs
    .filter(Boolean)
    .join(' ')
    .trim();
}
