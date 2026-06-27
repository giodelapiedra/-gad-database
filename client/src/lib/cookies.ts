const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function setCookie(name: string, value: string): void {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${MAX_AGE}; SameSite=Strict`;
}

export function removeCookie(name: string): void {
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Strict`;
}
