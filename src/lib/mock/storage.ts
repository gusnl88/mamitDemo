// 시드 스키마가 바뀔 때마다 버전을 올려서, 과거에 캐시된(예전 필드 구성) localStorage 데이터를
// 새 코드가 잘못된 모양으로 읽어버리는 걸 방지한다 — 버전이 다르면 그냥 새 seed로 다시 시작.
const SCHEMA_VERSION = 3;
const PREFIX = `mamitdemo:v${SCHEMA_VERSION}:`;

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

/** 데모 데이터를 전부 지우고 새로고침 — 시연 중 초기 상태로 되돌릴 때 사용. 이전 스키마 버전의 잔여 데이터도 함께 정리. */
export function resetAllDemoData(): void {
  if (!isBrowser()) return;
  Object.keys(window.localStorage)
    .filter((storageKey) => storageKey.startsWith("mamitdemo:"))
    .forEach((storageKey) => window.localStorage.removeItem(storageKey));
  window.location.reload();
}

export function nextId<T extends { id: number }>(items: T[]): number {
  return items.reduce((max, item) => Math.max(max, item.id), 0) + 1;
}
