import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import { formatDate } from "@/lib/format/date";

/** `core.domain.banner.BannerCategory` 그대로. */
export type BannerCategory = "HOME" | "MOIM" | "CHAT";

export const CATEGORY_LABEL: Record<BannerCategory, string> = {
  HOME: "홈",
  MOIM: "모임",
  CHAT: "채팅",
};

export const CATEGORY_OPTIONS = (Object.keys(CATEGORY_LABEL) as BannerCategory[]).map((value) => ({
  value,
  label: CATEGORY_LABEL[value],
}));

/** `BannerResponse` 그대로. */
export interface BannerRow {
  id: number;
  category: BannerCategory;
  title: string;
  description: string | null;
  imageUrl: string;
  targetUrl: string | null;
  /** 비활성이면 null. */
  displayOrder: number | null;
  isActive: boolean;
  displayStartAt: string | null;
  displayEndAt: string | null;
  /** 활성 스위치 AND 노출기간 — 지금 앱에 실제로 보이는지. */
  visibleNow: boolean;
  createdAt: string;
  updatedAt: string;
}

export type BannerStatus = "ACTIVE" | "SCHEDULED" | "ENDED" | "INACTIVE";

export const STATUS_LABEL: Record<BannerStatus, string> = {
  ACTIVE: "노출중",
  SCHEDULED: "노출예정",
  ENDED: "노출종료",
  INACTIVE: "비활성",
};

export const STATUS_COLOR: Record<BannerStatus, string> = {
  ACTIVE: "green",
  SCHEDULED: "blue",
  ENDED: "default",
  INACTIVE: "red",
};

/** 서버는 상태 값을 주지 않는다 — 활성 스위치와 노출기간(visibleNow)으로 계산한다. */
export function bannerStatus(row: BannerRow): BannerStatus {
  if (!row.isActive) return "INACTIVE";
  if (row.visibleNow) return "ACTIVE";
  if (row.displayStartAt && dayjs(row.displayStartAt).isAfter(dayjs())) return "SCHEDULED";
  return "ENDED";
}

export const formatPeriod = (row: BannerRow) =>
  `${row.displayStartAt ? formatDate(row.displayStartAt) : "즉시"} ~ ${
    row.displayEndAt ? formatDate(row.displayEndAt) : "무기한"
  }`;

/** RangePicker 값 — 백엔드에서 둘 다 선택값이다: 시작이 비면 즉시 시작, 종료가 비면 무기한. */
export type BannerPeriod = [Dayjs | null, Dayjs | null] | null;

/** 배너의 노출기간 → RangePicker 값. 둘 다 비어 있으면 null(빈 RangePicker). */
export const toPeriodValue = (row: BannerRow): BannerPeriod =>
  row.displayStartAt || row.displayEndAt
    ? [
        row.displayStartAt ? dayjs(row.displayStartAt) : null,
        row.displayEndAt ? dayjs(row.displayEndAt) : null,
      ]
    : null;

/** RangePicker 값 → 노출기간 요청 바디. 날짜 단위로 고르므로 시작은 그날 0시, 종료는 그날 끝. */
export const toDisplayPeriod = (period: BannerPeriod | undefined) => ({
  displayStartAt: period?.[0] ? period[0].startOf("day").toISOString() : null,
  displayEndAt: period?.[1] ? period[1].endOf("day").toISOString() : null,
});

/** 카테고리 안에서 노출순서대로 정렬한 활성 배너 — 순서 이동·다음 순서 계산에 쓴다. */
export const orderedInCategory = (rows: BannerRow[], category: BannerCategory) =>
  rows
    .filter((row) => row.category === category && row.displayOrder != null)
    .sort((a, b) => a.displayOrder! - b.displayOrder!);

/** 카테고리의 맨 뒤 노출순서 + 1 (비어 있으면 1). */
export const nextDisplayOrder = (rows: BannerRow[], category: BannerCategory) => {
  const ordered = orderedInCategory(rows, category);
  return ordered.length ? ordered[ordered.length - 1].displayOrder! + 1 : 1;
};
