const PREFIX = "mamitdemo:";

function isBrowser() {
  return typeof window !== "undefined";
}

/** localStorage에 저장된 컬렉션을 읽고, 없으면 seed로 초기화해서 저장한다. */
export function loadCollection<T>(key: string, seed: T[]): T[] {
  if (!isBrowser()) return seed;

  const raw = window.localStorage.getItem(PREFIX + key);
  if (raw) {
    try {
      return JSON.parse(raw) as T[];
    } catch {
      // 손상된 값이면 seed로 되돌린다.
    }
  }
  window.localStorage.setItem(PREFIX + key, JSON.stringify(seed));
  return seed;
}

export function saveCollection<T>(key: string, data: T[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(PREFIX + key, JSON.stringify(data));
}

/** 데모 데이터를 전부 지우고 새로고침 — 시연 중 초기 상태로 되돌릴 때 사용. */
export function resetAllDemoData(): void {
  if (!isBrowser()) return;
  Object.keys(window.localStorage)
    .filter((storageKey) => storageKey.startsWith(PREFIX))
    .forEach((storageKey) => window.localStorage.removeItem(storageKey));
  window.location.reload();
}

export function nextId<T extends { id: number }>(items: T[]): number {
  return items.reduce((max, item) => Math.max(max, item.id), 0) + 1;
}
