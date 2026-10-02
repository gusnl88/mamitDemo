import { message as staticMessage } from "antd";
import { getMessageApi } from "@/lib/api/messageBridge";
import { ApiError } from "@/types/api";
import { loadCollection, saveCollection, nextId } from "@/lib/mock/storage";
import { useAuthStore } from "@/store/useAuthStore";
import {
  buildMembers,
  buildMoims,
  buildReports,
  buildBanners,
  buildTerms,
  buildAdminUsers,
  buildFaqs,
  DEMO_ACCOUNTS,
  DEMO_OTP_CODE,
  DEMO_MUST_CHANGE_PASSWORD_EMAILS,
  ROLE_PERMISSIONS,
  type MemberSeed,
  type MoimSeed,
  type ReportSeed,
  type BannerSeed,
  type BannerCategory,
  type TermsSeed,
  type AdminUserSeed,
  type FaqSeed,
  type Role,
  MEMBER_COUNT,
  MOIM_COUNT,
} from "@/lib/mock/seed";

// ───────────────────────── 초기 데이터 로드 (localStorage 우선, 없으면 seed) ─────────────────────────

const members = loadCollection<MemberSeed>("members", buildMembers(MEMBER_COUNT));
const moims = loadCollection<MoimSeed>(
  "moims",
  buildMoims(
    MOIM_COUNT,
    members.map((member) => member.id),
  ),
);
const reports = loadCollection<ReportSeed>(
  "reports",
  buildReports(
    30,
    moims.map((moim) => moim.id),
    members.map((member) => member.id),
  ),
);
const banners = loadCollection<BannerSeed>("banners", buildBanners());
const terms = loadCollection<TermsSeed>("terms", buildTerms());
const users = loadCollection<AdminUserSeed>("users", buildAdminUsers());
const faqs = loadCollection<FaqSeed>("faqs", buildFaqs());

const persist = {
  members: () => saveCollection("members", members),
  moims: () => saveCollection("moims", moims),
  reports: () => saveCollection("reports", reports),
  banners: () => saveCollection("banners", banners),
  terms: () => saveCollection("terms", terms),
  users: () => saveCollection("users", users),
  faqs: () => saveCollection("faqs", faqs),
};

// ───────────────────────── 공통 유틸 ─────────────────────────

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function delay(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, randomInt(200, 450)));
}

/** 실패 응답 — 실제 axios 인터셉터와 동일하게 message.error를 띄운 뒤 ApiError를 던진다. */
function fail(message: string, code: string): never {
  (getMessageApi() ?? staticMessage).error(message);
  throw new ApiError(message, code, null);
}

interface PageResult<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

function parseSort(sortParam: string | null): { field: string; desc: boolean }[] {
  if (!sortParam) return [];
  return sortParam.split(",").map((token) => {
    const desc = token.startsWith("-");
    return { field: desc ? token.slice(1) : token, desc };
  });
}

function applySort<T extends Record<string, unknown>>(
  items: T[],
  sortParam: string | null,
  defaultField = "id",
): T[] {
  const specs = parseSort(sortParam);
  if (specs.length === 0) specs.push({ field: defaultField, desc: true });

  return [...items].sort((a, b) => {
    for (const { field, desc } of specs) {
      const av = a[field];
      const bv = b[field];
      let cmp = 0;
      if (av == null && bv == null) cmp = 0;
      else if (av == null) cmp = -1;
      else if (bv == null) cmp = 1;
      else if (typeof av === "string" && typeof bv === "string") cmp = av.localeCompare(bv, "ko");
      else if (typeof av === "boolean" && typeof bv === "boolean")
        cmp = av === bv ? 0 : av ? 1 : -1;
      else if (av < bv) cmp = -1;
      else if (av > bv) cmp = 1;
      if (cmp !== 0) return desc ? -cmp : cmp;
    }
    return 0;
  });
}

function paginate<T>(items: T[], page: number, size: number): PageResult<T> {
  const totalElements = items.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / size));
  const start = (page - 1) * size;
  return {
    content: items.slice(start, start + size),
    page,
    size,
    totalElements,
    totalPages,
  };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// ───────────────────────── 회원 (members) ─────────────────────────

function toMemberListItem(member: MemberSeed) {
  return {
    id: member.id,
    nickname: member.nickname,
    profileImageUrl: member.profileImageUrl,
    lastLoginAt: member.lastLoginAt,
    status: member.status,
  };
}

function listMembers(search: URLSearchParams) {
  const keyword = search.get("keyword");
  const page = Number(search.get("page") ?? 1);
  const size = Number(search.get("size") ?? 20);

  const filtered = keyword
    ? members.filter(
        (member) =>
          member.nickname.includes(keyword) || (member.phoneNumber?.includes(keyword) ?? false),
      )
    : members;
  const sorted = applySort(
    filtered as unknown as Record<string, unknown>[],
    search.get("sort"),
    "createdAt",
  );
  const { content, ...rest } = paginate(sorted, page, size);
  return {
    content: content.map((item) => toMemberListItem(item as unknown as MemberSeed)),
    ...rest,
  };
}

function membershipsForUser(id: number) {
  return moims.flatMap((moim) =>
    moim.memberships
      .filter((membership) => membership.userId === id)
      .map((membership) => ({
        moimId: moim.id,
        moimName: moim.name,
        role: membership.role,
        joinedAt: membership.joinedAt,
        leftAt: membership.leftAt,
      })),
  );
}

function getMemberDetail(id: number) {
  const member = members.find((item) => item.id === id);
  if (!member) fail("존재하지 않는 회원입니다.", "MEMBER_NOT_FOUND");

  const memberships = membershipsForUser(id);
  const joinedMoims = memberships
    .filter((item) => item.leftAt === null)
    .sort((a, b) => b.joinedAt.localeCompare(a.joinedAt));
  const leftMoims = memberships
    .filter((item) => item.leftAt !== null)
    .sort((a, b) => (b.leftAt as string).localeCompare(a.leftAt as string));

  return {
    id: member.id,
    nickname: member.nickname,
    profileImageUrl: member.profileImageUrl,
    realName: member.realName,
    phoneNumber: member.phoneNumber,
    createdAt: member.createdAt,
    withdrawnAt: member.withdrawnAt,
    status: member.status,
    joinedMoims,
    leftMoims,
  };
}

// ───────────────────────── 모임 (moims) ─────────────────────────

function activeMembers(moim: MoimSeed) {
  return moim.memberships.filter((membership) => membership.status === "ACTIVE");
}

function toMoimListItem(moim: MoimSeed) {
  return {
    id: moim.id,
    name: moim.name,
    status: moim.status,
    categoryName: moim.categoryName,
    regionName: moim.regionName,
    memberCount: activeMembers(moim).length,
    createdAt: moim.createdAt,
  };
}

function listMoims(search: URLSearchParams) {
  const keyword = search.get("keyword");
  const page = Number(search.get("page") ?? 1);
  const size = Number(search.get("size") ?? 20);

  const filtered = keyword ? moims.filter((moim) => moim.name.includes(keyword)) : moims;
  const withDerived = filtered.map((moim) => ({
    ...moim,
    memberCount: activeMembers(moim).length,
  }));
  const sorted = applySort(withDerived as unknown as Record<string, unknown>[], search.get("sort"));
  const { content, ...rest } = paginate(sorted, page, size);
  return { content: content.map((item) => toMoimListItem(item as unknown as MoimSeed)), ...rest };
}

function getMoimDetail(id: number) {
  const moim = moims.find((item) => item.id === id);
  if (!moim) fail("존재하지 않는 모임입니다.", "MOIM_NOT_FOUND");

  const memberItems = activeMembers(moim).map((membership) => {
    const member = members.find((item) => item.id === membership.userId);
    return {
      userId: membership.userId,
      nickname: member?.nickname ?? "알 수 없음",
      role: membership.role,
      joinedAt: membership.joinedAt,
    };
  });

  return {
    id: moim.id,
    name: moim.name,
    description: moim.description,
    categoryName: moim.categoryName,
    regionName: moim.regionName,
    maxMembers: moim.maxMembers,
    currentMembers: memberItems.length,
    status: moim.status,
    createdAt: moim.createdAt,
    members: memberItems,
  };
}

// ───────────────────────── 신고 (reports) ─────────────────────────

function reportWithNames(report: ReportSeed) {
  const moim = moims.find((item) => item.id === report.moimId);
  const reporter = members.find((item) => item.id === report.reporterUserId);
  const reported = members.find((item) => item.id === report.reportedUserId);
  return {
    ...report,
    moimName: moim?.name ?? "알 수 없음",
    reporterNickname: reporter?.nickname ?? "알 수 없음",
    reportedNickname: reported?.nickname ?? "알 수 없음",
  };
}

function listReports(search: URLSearchParams) {
  const keyword = search.get("keyword");
  const page = Number(search.get("page") ?? 1);
  const size = Number(search.get("size") ?? 20);

  const withNames = reports.map(reportWithNames);
  const filtered = keyword
    ? withNames.filter(
        (report) =>
          report.moimName.includes(keyword) ||
          report.reporterNickname.includes(keyword) ||
          report.reportedNickname.includes(keyword),
      )
    : withNames;
  const sorted = applySort(filtered as unknown as Record<string, unknown>[], search.get("sort"));
  const { content, ...rest } = paginate(sorted, page, size);
  const listItems = content.map((item) => {
    const r = item as unknown as ReturnType<typeof reportWithNames>;
    return {
      id: r.id,
      type: r.type,
      moimName: r.moimName,
      reporterNickname: r.reporterNickname,
      reportedNickname: r.reportedNickname,
      status: r.status,
      createdAt: r.createdAt,
    };
  });
  return { content: listItems, ...rest };
}

function getReportDetail(id: number) {
  const report = reports.find((item) => item.id === id);
  if (!report) fail("존재하지 않는 신고입니다.", "REPORT_NOT_FOUND");
  return reportWithNames(report);
}

/** 실제 admin API(AdminReportProcessRequest)와 동일 — 액션은 승인/거절 둘뿐, 검토중 전환 API는 없다. */
function processReport(id: number, action: "APPROVE" | "REJECT", comment?: string) {
  const report = reports.find((item) => item.id === id);
  if (!report) fail("존재하지 않는 신고입니다.", "REPORT_NOT_FOUND");

  const isTerminal = report.status === "APPROVED" || report.status === "REJECTED";
  if (isTerminal) fail("이미 처리 완료된 신고입니다.", "REPORT_ALREADY_PROCESSED");

  report.status = action === "APPROVE" ? "APPROVED" : "REJECTED";
  report.adminComment = comment ?? null;
  report.processedAt = new Date().toISOString();
  persist.reports();
  return reportWithNames(report);
}

// ───────────────────────── 배너 (banners) ─────────────────────────
// 실제 admin API(AdminBannerController)와 동일 — 목록은 페이지네이션·검색 없이 카테고리 → 노출순서로
// 정렬된 전체를 준다. 등록은 이미지와 함께(/with-image), 노출기간·활성·순서는 각각 별도 API.
// (카테고리, 노출순서)는 유니크 — 겹치면 실패하고, 비활성 배너는 순서가 비어(null) 있다.

const BANNER_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const BANNER_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
/** localStorage 용량(보통 5MB)을 넘지 않도록 업로드 이미지를 이 너비 이하로 줄여서 저장한다. */
const BANNER_IMAGE_MAX_WIDTH = 1280;

const CATEGORY_ORDER: BannerCategory[] = ["HOME", "MOIM", "CHAT"];

function isBannerVisibleNow(banner: BannerSeed): boolean {
  if (!banner.isActive) return false;
  const now = new Date().toISOString();
  if (banner.displayStartAt && banner.displayStartAt > now) return false;
  if (banner.displayEndAt && banner.displayEndAt < now) return false;
  return true;
}

function toBannerResponse(banner: BannerSeed) {
  return { ...banner, visibleNow: isBannerVisibleNow(banner) };
}

function findBanner(id: number): BannerSeed {
  const banner = banners.find((item) => item.id === id);
  if (!banner) fail("존재하지 않는 배너입니다.", "BANNER_NOT_FOUND");
  return banner;
}

function touchBanner(banner: BannerSeed) {
  banner.updatedAt = new Date().toISOString();
  persist.banners();
  return toBannerResponse(banner);
}

function listBanners() {
  return [...banners]
    .sort(
      (a, b) =>
        CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) ||
        (a.displayOrder ?? Infinity) - (b.displayOrder ?? Infinity) ||
        a.id - b.id,
    )
    .map(toBannerResponse);
}

function ensureDisplayOrderFree(category: BannerCategory, displayOrder: number, exceptId?: number) {
  if (!Number.isInteger(displayOrder) || displayOrder < 1) {
    fail("노출순서는 1 이상의 정수여야 합니다.", "VALIDATION_FAILED");
  }
  const taken = banners.some(
    (item) =>
      item.category === category && item.displayOrder === displayOrder && item.id !== exceptId,
  );
  if (taken) {
    fail(
      `같은 카테고리에 이미 노출순서 ${displayOrder}번 배너가 있습니다.`,
      "BANNER_DISPLAY_ORDER_DUPLICATED",
    );
  }
}

/** 업로드 파일을 검증하고, 크면 줄여서 data URL 로 만든다 (실제 서버의 이미지 업로드 대신). */
async function bannerImageToDataUrl(file: FormDataEntryValue | null): Promise<string> {
  if (!(file instanceof File)) fail("배너 이미지를 첨부해 주세요.", "VALIDATION_FAILED");
  if (!BANNER_IMAGE_TYPES.includes(file.type)) {
    fail("JPG, PNG, GIF, WEBP 이미지만 업로드할 수 있습니다.", "INVALID_FILE_TYPE");
  }
  if (file.size > BANNER_IMAGE_MAX_BYTES) {
    fail("이미지는 10MB 이하만 업로드할 수 있습니다.", "FILE_TOO_LARGE");
  }

  try {
    const bitmap = await createImageBitmap(file);
    if (bitmap.width <= BANNER_IMAGE_MAX_WIDTH && file.size < 300 * 1024) {
      bitmap.close();
      return readFileAsDataUrl(file);
    }
    const scale = Math.min(1, BANNER_IMAGE_MAX_WIDTH / bitmap.width);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return canvas.toDataURL("image/webp", 0.85);
  } catch {
    // 브라우저가 디코딩하지 못하면 원본 그대로 저장한다.
    return readFileAsDataUrl(file);
  }
}

function formText(form: FormData, key: string): string | null {
  const value = form.get(key);
  return value == null || value === "" ? null : String(value);
}

async function createBannerWithImage(body: unknown) {
  if (!(body instanceof FormData)) fail("잘못된 업로드 요청입니다.", "INVALID_UPLOAD");
  const category = formText(body, "category") as BannerCategory | null;
  const title = formText(body, "title");
  if (!category || !CATEGORY_ORDER.includes(category)) {
    fail("카테고리를 선택해 주세요.", "VALIDATION_FAILED");
  }
  if (!title) fail("타이틀을 입력해 주세요.", "VALIDATION_FAILED");
  const displayOrder = Number(formText(body, "displayOrder"));
  ensureDisplayOrderFree(category, displayOrder);
  const imageUrl = await bannerImageToDataUrl(body.get("image"));

  const now = new Date().toISOString();
  const banner: BannerSeed = {
    id: nextId(banners),
    category,
    title,
    description: formText(body, "description"),
    imageUrl,
    targetUrl: formText(body, "targetUrl"),
    displayOrder,
    isActive: true,
    displayStartAt: null,
    displayEndAt: null,
    createdAt: now,
    updatedAt: now,
  };
  banners.push(banner);
  return touchBanner(banner);
}

function updateBanner(id: number, body: Record<string, unknown>) {
  const banner = findBanner(id);
  if (!body.title) fail("타이틀을 입력해 주세요.", "VALIDATION_FAILED");
  banner.title = String(body.title);
  banner.description = (body.description as string) || null;
  banner.imageUrl = String(body.imageUrl ?? banner.imageUrl);
  banner.targetUrl = (body.targetUrl as string) || null;
  return touchBanner(banner);
}

async function updateBannerWithImage(id: number, body: unknown) {
  const banner = findBanner(id);
  if (!(body instanceof FormData)) fail("잘못된 업로드 요청입니다.", "INVALID_UPLOAD");
  const title = formText(body, "title");
  if (!title) fail("타이틀을 입력해 주세요.", "VALIDATION_FAILED");
  const imageUrl = await bannerImageToDataUrl(body.get("image"));
  banner.title = title;
  banner.description = formText(body, "description");
  banner.targetUrl = formText(body, "targetUrl");
  banner.imageUrl = imageUrl;
  return touchBanner(banner);
}

function changeBannerDisplayPeriod(id: number, body: Record<string, unknown>) {
  const banner = findBanner(id);
  const start = (body.displayStartAt as string | null) ?? null;
  const end = (body.displayEndAt as string | null) ?? null;
  if (start && end && start > end) {
    fail("노출 종료일은 시작일보다 뒤여야 합니다.", "VALIDATION_FAILED");
  }
  banner.displayStartAt = start;
  banner.displayEndAt = end;
  return touchBanner(banner);
}

function activateBanner(id: number, displayOrder: number) {
  const banner = findBanner(id);
  if (banner.isActive) fail("이미 활성화된 배너입니다.", "BANNER_ALREADY_ACTIVE");
  ensureDisplayOrderFree(banner.category, displayOrder, id);
  banner.isActive = true;
  banner.displayOrder = displayOrder;
  return touchBanner(banner);
}

function deactivateBanner(id: number) {
  const banner = findBanner(id);
  banner.isActive = false;
  banner.displayOrder = null;
  return touchBanner(banner);
}

function changeBannerDisplayOrder(id: number, displayOrder: number) {
  const banner = findBanner(id);
  if (!banner.isActive) fail("비활성 배너는 순서를 바꿀 수 없습니다.", "BANNER_INACTIVE");
  ensureDisplayOrderFree(banner.category, displayOrder, id);
  banner.displayOrder = displayOrder;
  return touchBanner(banner);
}

function deleteBanner(id: number) {
  const index = banners.findIndex((item) => item.id === id);
  if (index === -1) fail("존재하지 않는 배너입니다.", "BANNER_NOT_FOUND");
  banners.splice(index, 1);
  persist.banners();
}

// ───────────────────────── 약관 (terms) ─────────────────────────
// 실제 admin API(AdminTermsController)와 동일 — 기존 행은 절대 수정하지 않고, 같은 code로
// 새 버전 행을 추가하는 개정 이력 모델. 페이지네이션·검색 없음(code별 전체 이력을 다 준다).

/** code별로 "발효일이 지난 것 중 가장 최신" 버전이 지금 앱에 보이는 버전(active)이다. */
function computeActiveTermsIds(): Set<number> {
  const now = new Date().toISOString();
  const byCode = new Map<string, TermsSeed[]>();
  terms.forEach((term) => {
    const list = byCode.get(term.code) ?? [];
    list.push(term);
    byCode.set(term.code, list);
  });

  const activeIds = new Set<number>();
  byCode.forEach((versions) => {
    const eligible = versions
      .filter((term) => term.effectiveAt <= now)
      .sort((a, b) => b.effectiveAt.localeCompare(a.effectiveAt));
    if (eligible.length > 0) activeIds.add(eligible[0].id);
  });
  return activeIds;
}

function listTerms() {
  const activeIds = computeActiveTermsIds();
  return [...terms]
    .sort((a, b) => a.code.localeCompare(b.code) || b.effectiveAt.localeCompare(a.effectiveAt))
    .map((term) => ({ ...term, isActive: activeIds.has(term.id) }));
}

/**
 * 개정본 등록 — 새 code를 처음 만들 때도, 기존 code에 새 버전을 추가할 때도 같은 API.
 * 새 code면 title·required가 필수(이어받을 게 없음), 기존 code면 생략 시 최신본에서 이어받는다.
 */
function addTermsVersion(code: string, body: unknown) {
  if (!(body instanceof FormData)) fail("잘못된 업로드 요청입니다.", "INVALID_UPLOAD");
  const form = body;

  const version = String(form.get("version") ?? "");
  if (!code) fail("약관 코드는 필수입니다.", "VALIDATION_FAILED");
  if (!version) fail("버전은 필수입니다.", "VALIDATION_FAILED");

  const file = form.get("file");
  if (!(file instanceof File)) fail("약관 문서를 첨부해 주세요.", "VALIDATION_FAILED");

  const history = terms
    .filter((term) => term.code === code)
    .sort((a, b) => b.effectiveAt.localeCompare(a.effectiveAt));
  if (history.some((term) => term.version === version)) {
    fail(`이미 등록된 버전입니다: ${version}`, "DUPLICATE_TERMS_VERSION");
  }

  const titleRaw = form.get("title");
  const requiredRaw = form.get("required");
  if (history.length === 0 && (!titleRaw || requiredRaw === null)) {
    fail("새 약관은 title과 required를 함께 보내야 합니다.", "VALIDATION_FAILED");
  }

  const latest = history[0];
  const title = titleRaw ? String(titleRaw) : latest.title;
  const required = requiredRaw !== null ? requiredRaw === "true" : latest.required;
  const effectiveAtRaw = form.get("effectiveAt");
  const effectiveAt = effectiveAtRaw ? String(effectiveAtRaw) : new Date().toISOString();

  const term: TermsSeed = {
    id: nextId(terms),
    code,
    title,
    version,
    required,
    contentUrl: "", // 파일을 읽어 data URL로 채운다(아래).
    effectiveAt,
    createdAt: new Date().toISOString(),
    agreementLocked: false,
  };
  terms.push(term);
  persist.terms();
  return { term, file };
}

async function finalizeTermsVersion(code: string, body: unknown) {
  const { term, file } = addTermsVersion(code, body);
  term.contentUrl = await readFileAsDataUrl(file);
  persist.terms();
  const activeIds = computeActiveTermsIds();
  return { ...term, isActive: activeIds.has(term.id) };
}

function deleteTermsVersion(code: string, version: string) {
  const index = terms.findIndex((term) => term.code === code && term.version === version);
  if (index === -1) {
    fail(`해당 약관 버전을 찾을 수 없습니다: ${code} v${version}`, "TERMS_NOT_FOUND");
  }
  if (terms[index].agreementLocked) {
    fail(
      "이미 동의한 사용자가 있어 삭제할 수 없습니다. 새 개정본을 올려 대체하세요.",
      "TERMS_IN_USE",
    );
  }
  terms.splice(index, 1);
  persist.terms();
}

// ───────────────────────── 관리자 계정 (accounts) ─────────────────────────
// 실제 admin API(AdminAccountController)와 동일 — 셀프 회원가입/수정/삭제가 없다.
// 등록은 이메일·이름·역할만 받고(휴대폰 없음), 이후로는 역할변경/정지·활성화/임시비밀번호
// 재발급 세 가지 액션뿐이다. 본인 계정의 역할·상태는 못 바꾸고, 마지막 활성 SUPER_ADMIN은
// 역할을 바꾸거나 정지할 수 없다.

function currentAdmin(): AdminUserSeed | null {
  const email = useAuthStore.getState().user?.email;
  if (!email) return null;
  return users.find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? null;
}

function ensureNotLastActiveSuperAdmin(target: AdminUserSeed, what: string) {
  if (target.role !== "SUPER_ADMIN") return;
  const remaining = users.filter(
    (user) => user.role === "SUPER_ADMIN" && user.status === "ACTIVE" && user.id !== target.id,
  ).length;
  if (remaining === 0) {
    fail(
      `마지막 최고 관리자입니다. ${what} 다른 최고 관리자를 먼저 지정해 주세요.`,
      "VALIDATION_FAILED",
    );
  }
}

function toAccountResponse(user: AdminUserSeed) {
  return { ...user, permissions: ROLE_PERMISSIONS[user.role] };
}

function listAccounts() {
  return [...users].sort((a, b) => a.id - b.id).map(toAccountResponse);
}

function createAccount(body: Record<string, unknown>) {
  const email = String(body.email ?? "")
    .trim()
    .toLowerCase();
  const name = String(body.name ?? "").trim();
  const role = body.role as Role;
  if (!email) fail("이메일은 필수입니다.", "VALIDATION_FAILED");
  if (!name) fail("이름은 필수입니다.", "VALIDATION_FAILED");
  if (!role) fail("역할은 필수입니다.", "VALIDATION_FAILED");
  if (users.some((user) => user.email.toLowerCase() === email)) {
    fail("이미 등록된 이메일입니다.", "VALIDATION_FAILED");
  }

  const user: AdminUserSeed = {
    id: nextId(users),
    name,
    email,
    role,
    status: "ACTIVE",
    mustChangePassword: true,
    lastLoginAt: null,
  };
  users.push(user);
  persist.users();
  return toAccountResponse(user);
}

function changeAccountRole(targetId: number, role: Role) {
  const target = users.find((user) => user.id === targetId);
  if (!target) fail("존재하지 않는 관리자 계정입니다.", "ADMIN_NOT_FOUND");

  const actor = currentAdmin();
  if (actor && actor.id === target.id) {
    fail("본인의 역할은 바꿀 수 없습니다. 다른 관리자에게 요청해 주세요.", "VALIDATION_FAILED");
  }
  if (target.role !== role) {
    ensureNotLastActiveSuperAdmin(target, "역할을 바꾸려면");
  }

  target.role = role;
  persist.users();
  return toAccountResponse(target);
}

function changeAccountStatus(targetId: number, active: boolean) {
  const target = users.find((user) => user.id === targetId);
  if (!target) fail("존재하지 않는 관리자 계정입니다.", "ADMIN_NOT_FOUND");

  const actor = currentAdmin();
  if (actor && actor.id === target.id) {
    fail("본인 계정은 정지할 수 없습니다.", "VALIDATION_FAILED");
  }
  if (!active) {
    ensureNotLastActiveSuperAdmin(target, "정지하려면");
  }

  target.status = active ? "ACTIVE" : "SUSPENDED";
  persist.users();
  return toAccountResponse(target);
}

function resetAccountPassword(targetId: number) {
  const target = users.find((user) => user.id === targetId);
  if (!target) fail("존재하지 않는 관리자 계정입니다.", "ADMIN_NOT_FOUND");
  target.mustChangePassword = true;
  persist.users();
}

// ───────────────────────── 고객센터 FAQ ─────────────────────────
// 실제 admin API(AdminFaqController)와 동일 — 페이지네이션·검색 없음, id 역순 전체 목록.
// 카테고리는 자유 문자열이라 별도 카테고리 관리 API가 없다.

function listFaqs(category: string | null) {
  const filtered = category ? faqs.filter((faq) => faq.category === category) : faqs;
  return [...filtered].sort((a, b) => b.id - a.id);
}

function createFaq(body: Record<string, unknown>) {
  const now = new Date().toISOString();
  const faq: FaqSeed = {
    id: nextId(faqs),
    category: String(body.category ?? ""),
    question: String(body.question ?? ""),
    answer: String(body.answer ?? ""),
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
  faqs.push(faq);
  persist.faqs();
  return faq;
}

/** null인 필드는 변경하지 않음(부분 수정) — 실제 API와 동일. */
function updateFaq(id: number, body: Record<string, unknown>) {
  const faq = faqs.find((item) => item.id === id);
  if (!faq) fail("존재하지 않는 FAQ입니다.", "FAQ_NOT_FOUND");
  if (body.category != null) faq.category = String(body.category);
  if (body.question != null) faq.question = String(body.question);
  if (body.answer != null) faq.answer = String(body.answer);
  faq.updatedAt = new Date().toISOString();
  persist.faqs();
  return faq;
}

function changeFaqActiveStatus(id: number, isActive: boolean) {
  const faq = faqs.find((item) => item.id === id);
  if (!faq) fail("존재하지 않는 FAQ입니다.", "FAQ_NOT_FOUND");
  faq.isActive = isActive;
  faq.updatedAt = new Date().toISOString();
  persist.faqs();
  return faq;
}

function deleteFaq(id: number) {
  const index = faqs.findIndex((item) => item.id === id);
  if (index === -1) fail("존재하지 않는 FAQ입니다.", "FAQ_NOT_FOUND");
  faqs.splice(index, 1);
  persist.faqs();
}

// ───────────────────────── 인증 (auth) ─────────────────────────

function requestLoginCode(email: string, password: string) {
  if (!email) fail("이메일을 입력해 주세요.", "INVALID_EMAIL");
  if (!password) fail("비밀번호를 입력해 주세요.", "INVALID_PASSWORD");
  return { email, expiresInSeconds: 20 };
}

/** 인증번호 재발송 — 유효시간이 남아 있어도, 만료됐어도 이메일만으로 다시 보낼 수 있다(기획). */
function resendLoginCode(email: string) {
  if (!email) fail("이메일을 입력해 주세요.", "INVALID_EMAIL");
  return { email, expiresInSeconds: 20 };
}

function verifyLoginCode(email: string, code: string) {
  if (code !== DEMO_OTP_CODE) fail("인증 코드가 올바르지 않습니다.", "INVALID_CODE");
  return buildLoginResult(email);
}

function buildLoginResult(email: string) {
  const existing = users.find((user) => user.email.toLowerCase() === email.toLowerCase());

  if (existing) {
    return {
      accessToken: `demo-token-${existing.id}`,
      email: existing.email,
      name: existing.name,
      role: existing.role,
      permissions: ROLE_PERMISSIONS[existing.role],
      mustChangePassword: existing.mustChangePassword,
    };
  }

  // 데모 계정 목록에 없는 이메일이면, 모든 기능을 볼 수 있도록 최고관리자 권한으로 임시 로그인시킨다.
  const fallback = DEMO_ACCOUNTS[0];
  return {
    accessToken: "demo-token-guest",
    email,
    name: email.split("@")[0] || fallback.name,
    role: fallback.role,
    permissions: ROLE_PERMISSIONS[fallback.role],
    mustChangePassword: DEMO_MUST_CHANGE_PASSWORD_EMAILS.includes(email.toLowerCase()),
  };
}

/** 임시 비밀번호 변경 — 데모에서는 실제 비밀번호를 저장하지 않고, mustChangePassword만 실제로 내린다. */
function changePassword(email: string) {
  const existing = users.find((user) => user.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    existing.mustChangePassword = false;
    persist.users();
  }
  return { ...buildLoginResult(email), mustChangePassword: false };
}

// ───────────────────────── 라우팅 ─────────────────────────

export type MockMethod = "get" | "post" | "put" | "patch" | "delete";

const ID_SEGMENT = "([^/]+)";

function match(pattern: string, pathname: string): string[] | null {
  const regex = new RegExp(`^${pattern.replace(/:id/g, ID_SEGMENT)}$`);
  const result = regex.exec(pathname);
  return result ? result.slice(1) : null;
}

export async function dispatchMockRequest<T>(
  method: MockMethod,
  url: string,
  body?: unknown,
): Promise<{ data: T }> {
  await delay();

  const parsed = new URL(url, "http://mock.local");
  const pathname = parsed.pathname;
  const search = parsed.searchParams;
  const asBody = (body ?? {}) as Record<string, unknown>;

  let idMatch: string[] | null;

  // ── auth ──
  if (method === "post" && pathname === "/auth/login") {
    return {
      data: requestLoginCode(String(asBody.email ?? ""), String(asBody.password ?? "")) as T,
    };
  }
  if (method === "post" && pathname === "/auth/resend") {
    return { data: resendLoginCode(String(asBody.email ?? "")) as T };
  }
  if (method === "post" && pathname === "/auth/verify-login") {
    return { data: verifyLoginCode(String(asBody.email ?? ""), String(asBody.code ?? "")) as T };
  }
  if (method === "post" && pathname === "/auth/change-password") {
    return { data: changePassword(String(asBody.email ?? "")) as T };
  }
  if (method === "post" && pathname === "/auth/logout") {
    return { data: null as T };
  }

  // ── members ──
  if (method === "get" && pathname === "/members") return { data: listMembers(search) as T };
  if (method === "get" && (idMatch = match("/members/:id", pathname))) {
    return { data: getMemberDetail(Number(idMatch[0])) as T };
  }

  // ── moims ──
  if (method === "get" && pathname === "/moims") return { data: listMoims(search) as T };
  if (method === "get" && (idMatch = match("/moims/:id", pathname))) {
    return { data: getMoimDetail(Number(idMatch[0])) as T };
  }

  // ── reports ──
  if (method === "get" && pathname === "/reports") return { data: listReports(search) as T };
  if (method === "get" && (idMatch = match("/reports/:id", pathname))) {
    return { data: getReportDetail(Number(idMatch[0])) as T };
  }
  if (method === "post" && (idMatch = match("/reports/:id/process", pathname))) {
    return {
      data: processReport(
        Number(idMatch[0]),
        asBody.action as "APPROVE" | "REJECT",
        asBody.comment as string | undefined,
      ) as T,
    };
  }

  // ── banners ──
  if (method === "get" && pathname === "/banners") return { data: listBanners() as T };
  if (method === "post" && pathname === "/banners/with-image") {
    return { data: (await createBannerWithImage(body)) as T };
  }
  if (method === "put" && (idMatch = match("/banners/:id/with-image", pathname))) {
    return { data: (await updateBannerWithImage(Number(idMatch[0]), body)) as T };
  }
  if (method === "put" && (idMatch = match("/banners/:id/display-period", pathname))) {
    return { data: changeBannerDisplayPeriod(Number(idMatch[0]), asBody) as T };
  }
  if (method === "put" && (idMatch = match("/banners/:id/activate", pathname))) {
    return { data: activateBanner(Number(idMatch[0]), Number(asBody.displayOrder)) as T };
  }
  if (method === "put" && (idMatch = match("/banners/:id/deactivate", pathname))) {
    return { data: deactivateBanner(Number(idMatch[0])) as T };
  }
  if (method === "put" && (idMatch = match("/banners/:id/display-order", pathname))) {
    return { data: changeBannerDisplayOrder(Number(idMatch[0]), Number(asBody.displayOrder)) as T };
  }
  if (method === "put" && (idMatch = match("/banners/:id", pathname))) {
    return { data: updateBanner(Number(idMatch[0]), asBody) as T };
  }
  if (method === "delete" && (idMatch = match("/banners/:id", pathname))) {
    deleteBanner(Number(idMatch[0]));
    return { data: null as T };
  }

  // ── terms ──
  if (method === "get" && pathname === "/terms") return { data: listTerms() as T };
  {
    const addVersionMatch = /^\/terms\/([^/]+)\/versions$/.exec(pathname);
    if (method === "post" && addVersionMatch) {
      return {
        data: (await finalizeTermsVersion(decodeURIComponent(addVersionMatch[1]), body)) as T,
      };
    }
  }
  {
    const versionMatch = /^\/terms\/([^/]+)\/versions\/([^/]+)$/.exec(pathname);
    if (method === "delete" && versionMatch) {
      deleteTermsVersion(decodeURIComponent(versionMatch[1]), decodeURIComponent(versionMatch[2]));
      return { data: null as T };
    }
  }

  // ── 관리자 계정 (accounts) ──
  if (method === "get" && pathname === "/accounts") return { data: listAccounts() as T };
  if (method === "post" && pathname === "/accounts") return { data: createAccount(asBody) as T };
  if (method === "patch" && (idMatch = match("/accounts/:id/role", pathname))) {
    return { data: changeAccountRole(Number(idMatch[0]), asBody.role as Role) as T };
  }
  if (method === "patch" && (idMatch = match("/accounts/:id/status", pathname))) {
    return { data: changeAccountStatus(Number(idMatch[0]), Boolean(asBody.active)) as T };
  }
  if (method === "post" && (idMatch = match("/accounts/:id/password-reset", pathname))) {
    resetAccountPassword(Number(idMatch[0]));
    return { data: null as T };
  }

  // ── FAQ ──
  if (method === "get" && pathname === "/faqs")
    return { data: listFaqs(search.get("category")) as T };
  if (method === "post" && pathname === "/faqs") return { data: createFaq(asBody) as T };
  if (method === "put" && (idMatch = match("/faqs/:id/active", pathname))) {
    return { data: changeFaqActiveStatus(Number(idMatch[0]), Boolean(asBody.isActive)) as T };
  }
  if (method === "patch" && (idMatch = match("/faqs/:id", pathname))) {
    return { data: updateFaq(Number(idMatch[0]), asBody) as T };
  }
  if (method === "delete" && (idMatch = match("/faqs/:id", pathname))) {
    deleteFaq(Number(idMatch[0]));
    return { data: null as T };
  }

  fail(`데모에 구현되지 않은 요청입니다: ${method.toUpperCase()} ${pathname}`, "NOT_IMPLEMENTED");
}
