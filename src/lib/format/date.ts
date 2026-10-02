import dayjs from "dayjs";

/** 목록/상세 화면에서 반복되는 날짜·일시 포맷 — 값이 없으면 "-". */
export const formatDate = (value: string | null | undefined) =>
  value ? dayjs(value).format("YYYY-MM-DD") : "-";

export const formatDateTime = (value: string | null | undefined) =>
  value ? dayjs(value).format("YYYY-MM-DD HH:mm") : "-";
