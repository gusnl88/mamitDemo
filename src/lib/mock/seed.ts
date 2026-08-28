/**
 * 데모용 초기 데이터. 실제 서버/DB가 없으므로 이 파일이 "시드"이고,
 * lib/mock/storage.ts가 localStorage에 저장해 CRUD 결과를 세션 동안 유지한다.
 */

export type Role = "SUPER_ADMIN" | "OPERATOR" | "CONTENT" | "VIEWER";

// ───────────────────────── 공통 유틸 ─────────────────────────

function pick<T>(pool: readonly T[]): T {
  return pool[Math.floor(Math.random() * pool.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function isoDaysAgo(days: number, hourJitter = true): string {
  const date = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  if (hourJitter) {
    date.setHours(randomInt(0, 23), randomInt(0, 59), randomInt(0, 59));
  }
  return date.toISOString();
}

function isoDaysFromNow(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

// ───────────────────────── 회원 (members) ─────────────────────────

export type MemberStatus = "ACTIVE" | "WITHDRAWN";

/** 데모 회원 수 — router.ts의 시드 로딩과 [id]/page.tsx의 generateStaticParams가 함께 참조한다. */
export const MEMBER_COUNT = 60;

export interface MemberSeed {
  id: number;
  nickname: string;
  profileImageUrl: string | null;
  realName: string | null;
  phoneNumber: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  status: MemberStatus;
  /** 탈퇴 전이면 null. */
  withdrawnAt: string | null;
}

const NICK_PREFIX = [
  "햇살",
  "토닥토닥",
  "몽글",
  "포근한",
  "쑥쑥",
  "새싹",
  "달콤한",
  "구름",
  "방울",
  "노을",
  "봄날",
  "포포",
  "말랑",
  "동글",
  "따스한",
  "초록",
  "산들",
  "별빛",
  "소소한",
  "느긋한",
];
const NICK_SUFFIX = [
  "맘",
  "엄마",
  "육아일기",
  "하루",
  "일상",
  "다이어리",
  "집사",
  "생활",
  "네",
  "이야기",
];
const SURNAMES = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임"];
const GIVEN = ["서연", "지우", "하윤", "민준", "예은", "도윤", "수아", "지호", "다은", "은우"];

function makeNickname(usedNames: Set<string>): string {
  let candidate = "";
  do {
    candidate = `${pick(NICK_PREFIX)}${pick(NICK_SUFFIX)}${randomInt(1, 999)}`;
  } while (usedNames.has(candidate));
  usedNames.add(candidate);
  return candidate;
}

export function buildMembers(count: number): MemberSeed[] {
  const usedNames = new Set<string>();
  return Array.from({ length: count }, (_, index) => {
    const hasRealInfo = Math.random() > 0.4;
    const everLoggedIn = Math.random() > 0.1;
    const withdrawn = Math.random() < 0.1;
    const createdDaysAgo = randomInt(5, 400);
    return {
      id: index + 1,
      nickname: makeNickname(usedNames),
      profileImageUrl: null,
      realName: hasRealInfo ? `${pick(SURNAMES)}${pick(GIVEN)}` : null,
      phoneNumber: hasRealInfo
        ? `010-${randomInt(1000, 9999)}-${randomInt(1000, 9999)}`
        : null,
      createdAt: isoDaysAgo(createdDaysAgo),
      lastLoginAt: everLoggedIn ? isoDaysAgo(randomInt(0, 30)) : null,
      status: withdrawn ? "WITHDRAWN" : "ACTIVE",
      withdrawnAt: withdrawn ? isoDaysAgo(randomInt(0, createdDaysAgo - 1)) : null,
    };
  });
}

// ───────────────────────── 모임 (moims) ─────────────────────────

export type MoimMemberRole = "OWNER" | "MEMBER";
export type MoimMemberStatus = "ACTIVE" | "LEFT" | "KICKED";

export interface MoimMembership {
  userId: number;
  role: MoimMemberRole;
  status: MoimMemberStatus;
  joinedAt: string;
  leftAt: string | null;
}

export interface MoimSeed {
  id: number;
  name: string;
  description: string;
  categoryName: string;
  regionName: string | null;
  maxMembers: number;
  status: "RECRUITING" | "ONGOING" | "CLOSED" | "COMPLETED" | "DELETED";
  createdAt: string;
  /** 첫 번째가 모임장(OWNER). 자진탈퇴(LEFT)/강퇴(KICKED) 이력도 함께 보관. */
  memberships: MoimMembership[];
}

/** 데모 모임 수 — router.ts의 시드 로딩과 [id]/page.tsx의 generateStaticParams가 함께 참조한다. */
export const MOIM_COUNT = 24;

const MOIM_CATEGORIES = ["육아정보", "취미", "운동", "스터디", "맛집/카페", "재테크", "소통"];
const MOIM_REGIONS = [
  "서울 강남구",
  "서울 마포구",
  "서울 송파구",
  "경기 성남시",
  "경기 고양시",
  "인천 연수구",
  "부산 해운대구",
  null,
];
const MOIM_ADJECTIVES = ["함께하는", "즐거운", "느긋한", "다정한", "알찬", "소소한", "새내기"];
const MOIM_TOPICS = [
  "이유식 스터디",
  "산책 모임",
  "육아 정보 나눔",
  "홈베이킹 클래스",
  "책 육아 모임",
  "요가 모임",
  "재테크 스터디",
  "동네 맛집 탐방",
  "중고 나눔",
  "사진 스터디",
  "홈트 모임",
  "베이비마사지",
];
const STATUS_POOL: MoimSeed["status"][] = [
  "RECRUITING",
  "RECRUITING",
  "ONGOING",
  "ONGOING",
  "ONGOING",
  "CLOSED",
  "COMPLETED",
  "DELETED",
];

function buildMembership(userId: number, role: MoimMemberRole, moimAgeDays: number): MoimMembership {
  const joinedDaysAgo = randomInt(0, moimAgeDays);
  const joinedAt = isoDaysAgo(joinedDaysAgo);
  // OWNER는 자기 모임을 나가지 않는다고 가정 — MEMBER만 일부 탈퇴/강퇴 처리.
  const left = role === "MEMBER" && Math.random() < 0.15;
  if (!left) {
    return { userId, role, status: "ACTIVE", joinedAt, leftAt: null };
  }
  const leftDaysAgo = randomInt(0, joinedDaysAgo);
  return {
    userId,
    role,
    status: Math.random() < 0.5 ? "LEFT" : "KICKED",
    joinedAt,
    leftAt: isoDaysAgo(leftDaysAgo),
  };
}

export function buildMoims(count: number, memberIds: number[]): MoimSeed[] {
  const usedNames = new Set<string>();
  return Array.from({ length: count }, (_, index) => {
    let name = "";
    do {
      name = `${pick(MOIM_ADJECTIVES)} ${pick(MOIM_TOPICS)}`;
    } while (usedNames.has(name));
    usedNames.add(name);

    const maxMembers = randomInt(6, 30);
    const memberCount = randomInt(2, maxMembers);
    const shuffled = [...memberIds].sort(() => Math.random() - 0.5);
    const memberIdsForMoim = shuffled.slice(0, memberCount);

    const createdDaysAgo = randomInt(3, 300);
    const memberships = memberIdsForMoim.map((userId, memberIndex) =>
      buildMembership(userId, memberIndex === 0 ? "OWNER" : "MEMBER", createdDaysAgo),
    );

    return {
      id: index + 1,
      name,
      description: `${name}입니다. 서로 정보를 나누고 소통하는 것을 목표로 해요. 초보 부모님들 언제든 환영합니다!`,
      categoryName: pick(MOIM_CATEGORIES),
      regionName: pick(MOIM_REGIONS),
      maxMembers,
      status: pick(STATUS_POOL),
      createdAt: isoDaysAgo(createdDaysAgo),
      memberships,
    };
  });
}

// ───────────────────────── 신고 (reports) ─────────────────────────

export type ReportType =
  | "INAPPROPRIATE_CONTENT"
  | "SPAM_ADVERTISEMENT"
  | "HATE_SPEECH"
  | "SAFETY_CONCERN"
  | "FRAUD_SCAM"
  | "ETC";

export type ReportStatus = "NEW" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";

export interface ReportSeed {
  id: number;
  type: ReportType;
  title: string;
  content: string;
  moimId: number;
  reporterUserId: number;
  reportedUserId: number;
  status: ReportStatus;
  adminComment: string | null;
  processedAt: string | null;
  createdAt: string;
}

const REPORT_TYPES: ReportType[] = [
  "INAPPROPRIATE_CONTENT",
  "SPAM_ADVERTISEMENT",
  "HATE_SPEECH",
  "SAFETY_CONCERN",
  "FRAUD_SCAM",
  "ETC",
];
const REPORT_STATUS_POOL: ReportStatus[] = [
  "NEW",
  "NEW",
  "NEW",
  "UNDER_REVIEW",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
];
const REPORT_TITLES: Record<ReportType, string> = {
  INAPPROPRIATE_CONTENT: "부적절한 게시글 신고합니다",
  SPAM_ADVERTISEMENT: "광고성 도배글 신고합니다",
  HATE_SPEECH: "다른 회원에게 욕설을 했습니다",
  SAFETY_CONCERN: "오프라인 모임에서 불편한 상황이 있었습니다",
  FRAUD_SCAM: "중고거래 사기 의심 신고합니다",
  ETC: "기타 사유로 신고합니다",
};

export function buildReports(count: number, moimIds: number[], memberIds: number[]): ReportSeed[] {
  return Array.from({ length: count }, (_, index) => {
    const type = pick(REPORT_TYPES);
    const status = pick(REPORT_STATUS_POOL);
    const isTerminal = status === "APPROVED" || status === "REJECTED";
    const createdAt = isoDaysAgo(randomInt(1, 60));
    const reporterUserId = pick(memberIds);
    let reportedUserId = pick(memberIds);
    while (reportedUserId === reporterUserId) {
      reportedUserId = pick(memberIds);
    }

    return {
      id: index + 1,
      type,
      title: REPORT_TITLES[type],
      content: `${REPORT_TITLES[type]} 자세한 내용은 다음과 같습니다: 상대방이 모임 채팅방에서 불쾌감을 주는 행동을 반복해서 신고합니다. 확인 후 조치 부탁드립니다.`,
      moimId: pick(moimIds),
      reporterUserId,
      reportedUserId,
      status,
      adminComment: isTerminal
        ? pick([
            "확인 결과 신고 내용이 사실로 확인되어 조치했습니다.",
            "검토 결과 커뮤니티 가이드라인 위반 사항이 확인되지 않았습니다.",
          ])
        : null,
      processedAt: isTerminal ? isoDaysAgo(randomInt(0, 5)) : null,
      createdAt,
    };
  });
}

// ───────────────────────── 배너 (banners) ─────────────────────────

export type BannerCategory = "HOME" | "MOIM" | "CHAT";
export type BannerStatusSeed = "always-active" | "scheduled" | "ended" | "inactive";

export interface BannerSeed {
  id: number;
  category: BannerCategory;
  title: string;
  description: string | null;
  imageUrl: string;
  targetUrl: string | null;
  startDate: string;
  endDate: string;
  displayOrder: number | null;
  active: boolean;
}

const BANNER_DEFS: { category: BannerCategory; title: string; kind: BannerStatusSeed }[] = [
  { category: "HOME", title: "여름맘 신규 가입 이벤트", kind: "always-active" },
  { category: "HOME", title: "동네 인기 모임 TOP 10", kind: "always-active" },
  { category: "HOME", title: "9월 육아 박람회 안내", kind: "scheduled" },
  { category: "MOIM", title: "이번 주 신규 모임 모아보기", kind: "always-active" },
  { category: "MOIM", title: "모임장 인터뷰 특집", kind: "always-active" },
  { category: "MOIM", title: "지난달 인기 모임 회고", kind: "ended" },
  { category: "CHAT", title: "채팅 에티켓 안내", kind: "always-active" },
  { category: "CHAT", title: "선물하기 이벤트 (종료)", kind: "inactive" },
  { category: "CHAT", title: "새 이모티콘 출시 안내", kind: "scheduled" },
];

export function buildBanners(): BannerSeed[] {
  const orderByCategory: Record<BannerCategory, number> = { HOME: 0, MOIM: 0, CHAT: 0 };

  return BANNER_DEFS.map((def, index) => {
    let startDate: string;
    let endDate: string;
    let active: boolean;

    switch (def.kind) {
      case "scheduled":
        startDate = isoDaysFromNow(randomInt(5, 20)).slice(0, 10);
        endDate = isoDaysFromNow(randomInt(30, 60)).slice(0, 10);
        active = true;
        break;
      case "ended":
        startDate = isoDaysAgo(randomInt(60, 90)).slice(0, 10);
        endDate = isoDaysAgo(randomInt(5, 20)).slice(0, 10);
        active = true;
        break;
      case "inactive":
        startDate = isoDaysAgo(randomInt(30, 60)).slice(0, 10);
        endDate = isoDaysFromNow(randomInt(30, 60)).slice(0, 10);
        active = false;
        break;
      default:
        startDate = isoDaysAgo(randomInt(10, 30)).slice(0, 10);
        endDate = isoDaysFromNow(randomInt(30, 90)).slice(0, 10);
        active = true;
    }

    const displayOrder = active && def.kind !== "ended" ? ++orderByCategory[def.category] : null;

    return {
      id: index + 1,
      category: def.category,
      title: def.title,
      description: `${def.title} 배너입니다. 클릭하면 상세 페이지로 이동합니다.`,
      imageUrl: `https://picsum.photos/seed/mamit-banner-${index + 1}/640/280`,
      targetUrl: "https://mommydndn.com",
      startDate,
      endDate,
      displayOrder,
      active,
    };
  });
}

// ───────────────────────── 약관 (terms) ─────────────────────────

export interface TermsSeed {
  id: number;
  code: string;
  title: string;
  version: string;
  required: boolean;
  contentUrl: string | null;
  effectiveAt: string;
  createdAt: string;
  agreementLocked: boolean; // true면 "회원 동의 기록 있음" 상태를 시뮬레이션 (삭제 불가)
}

export function buildTerms(): TermsSeed[] {
  const now = isoDaysAgo(30);
  const defs: Omit<TermsSeed, "id" | "createdAt" | "agreementLocked">[] = [
    {
      code: "TERMS_OF_SERVICE",
      title: "서비스 이용약관",
      version: "1.0",
      required: true,
      contentUrl: "https://mommydndn.com/terms/service",
      effectiveAt: now,
    },
    {
      code: "PRIVACY_POLICY",
      title: "개인정보 처리방침",
      version: "1.0",
      required: true,
      contentUrl: "https://mommydndn.com/terms/privacy",
      effectiveAt: now,
    },
    {
      code: "LOCATION_TERMS",
      title: "위치기반서비스 이용약관",
      version: "1.0",
      required: true,
      contentUrl: "https://mommydndn.com/terms/location",
      effectiveAt: now,
    },
    {
      code: "MARKETING_CONSENT",
      title: "마케팅 정보 수신 동의",
      version: "1.0",
      required: false,
      contentUrl: "https://mommydndn.com/terms/marketing",
      effectiveAt: now,
    },
    {
      code: "PUSH_NOTIFICATION",
      title: "푸시 알림 수신 동의",
      version: "1.0",
      required: false,
      contentUrl: "https://mommydndn.com/terms/push",
      effectiveAt: now,
    },
  ];

  return defs.map((def, index) => ({
    ...def,
    id: index + 1,
    createdAt: now,
    agreementLocked: true,
  }));
}

// ───────────────────────── 관리자 계정 (admin users) ─────────────────────────

export interface AdminUserSeed {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
}

/** 로그인 화면에 안내되는 고정 데모 계정 — 역할별 화면 차이를 보여주기 위한 용도. */
export const DEMO_ACCOUNTS: { email: string; name: string; role: Role }[] = [
  { email: "demo-super@mamit.demo", name: "데모 최고관리자", role: "SUPER_ADMIN" },
  { email: "demo-operator@mamit.demo", name: "데모 운영자", role: "OPERATOR" },
  { email: "demo-content@mamit.demo", name: "데모 콘텐츠관리자", role: "CONTENT" },
  { email: "demo-viewer@mamit.demo", name: "데모 조회전용", role: "VIEWER" },
];

/** 데모 로그인에서는 이메일과 무관하게 이 코드만 통과시킨다. */
export const DEMO_OTP_CODE = "000000";

/** 이 이메일로 로그인하면 최초 1회 비밀번호 변경 화면으로 강제 이동하는 흐름을 보여준다. */
export const DEMO_MUST_CHANGE_PASSWORD_EMAILS = ["sys.lee@mamit.demo"];

export function buildAdminUsers(): AdminUserSeed[] {
  const extras: Omit<AdminUserSeed, "id">[] = [
    { name: "김운영", email: "ops.kim@mamit.demo", phone: "010-2222-3333", role: "OPERATOR" },
    { name: "박콘텐츠", email: "content.park@mamit.demo", phone: "010-3333-4444", role: "CONTENT" },
    { name: "이총괄", email: "sys.lee@mamit.demo", phone: null, role: "SUPER_ADMIN" },
    { name: "최운영", email: "ops.choi@mamit.demo", phone: "010-4444-5555", role: "OPERATOR" },
    { name: "정조회", email: "view.jung@mamit.demo", phone: null, role: "VIEWER" },
  ];

  const all = [
    ...DEMO_ACCOUNTS.map((account) => ({
      name: account.name,
      email: account.email,
      phone: "010-1234-5678",
      role: account.role,
    })),
    ...extras,
  ];

  return all.map((admin, index) => ({ ...admin, id: index + 1 }));
}

// ───────────────────────── 고객센터 FAQ ─────────────────────────

export interface FaqSeed {
  id: number;
  category: string;
  question: string;
  answer: string;
  displayOrder: number;
  createdAt: string;
}

export const DEFAULT_FAQ_CATEGORIES = ["서비스 이용", "모임", "회원/계정", "결제", "기타"];

const FAQ_DEFS: { category: string; question: string; answer: string }[] = [
  {
    category: "서비스 이용",
    question: "마미든든은 어떤 서비스인가요?",
    answer: "마미든든은 동네 엄마들이 서로 정보를 나누고 소모임을 만들 수 있는 커뮤니티 서비스입니다.",
  },
  {
    category: "서비스 이용",
    question: "앱은 어디서 다운로드할 수 있나요?",
    answer: "앱스토어와 플레이스토어에서 '마미든든'을 검색하시면 다운로드하실 수 있습니다.",
  },
  {
    category: "서비스 이용",
    question: "위치 정보는 왜 필요한가요?",
    answer: "동네 기반 모임을 추천해 드리기 위해 대략적인 위치 정보를 사용합니다. 정확한 주소는 저장되지 않습니다.",
  },
  {
    category: "모임",
    question: "모임은 어떻게 만드나요?",
    answer: "홈 화면의 '모임 만들기' 버튼을 눌러 카테고리, 지역, 정원을 설정하면 바로 모임을 개설할 수 있습니다.",
  },
  {
    category: "모임",
    question: "모임 정원은 나중에 바꿀 수 있나요?",
    answer: "모임장은 모임 설정 화면에서 언제든 최대 정원을 조정할 수 있습니다. 단, 현재 인원보다 적게 설정할 수는 없습니다.",
  },
  {
    category: "모임",
    question: "모임에서 나가려면 어떻게 하나요?",
    answer: "모임 상세 화면 하단의 '모임 나가기' 버튼을 통해 언제든 탈퇴하실 수 있습니다.",
  },
  {
    category: "모임",
    question: "모임장을 다른 사람에게 넘길 수 있나요?",
    answer: "모임 관리 화면에서 '모임장 위임하기' 기능을 통해 다른 멤버에게 위임할 수 있습니다.",
  },
  {
    category: "회원/계정",
    question: "비밀번호 없이 로그인하는 이유가 궁금해요.",
    answer: "마미든든은 이메일로 발송되는 인증 코드로 로그인하는 방식을 사용해 비밀번호 유출 위험을 없앴습니다.",
  },
  {
    category: "회원/계정",
    question: "닉네임은 변경할 수 있나요?",
    answer: "설정 > 프로필 수정에서 닉네임을 자유롭게 변경할 수 있습니다. 단, 최근 변경 후 7일간은 재변경이 제한됩니다.",
  },
  {
    category: "회원/계정",
    question: "회원 탈퇴는 어떻게 하나요?",
    answer: "설정 > 계정 관리 > 회원 탈퇴에서 진행할 수 있으며, 탈퇴 시 작성한 게시글은 익명 처리됩니다.",
  },
  {
    category: "회원/계정",
    question: "다른 회원을 차단할 수 있나요?",
    answer: "상대방 프로필에서 '차단하기'를 선택하면 이후 서로의 게시글과 채팅이 보이지 않습니다.",
  },
  {
    category: "결제",
    question: "유료 기능이 있나요?",
    answer: "기본적인 모임 생성/참여 기능은 모두 무료이며, 프리미엄 배지 등 일부 부가 기능만 유료로 제공됩니다.",
  },
  {
    category: "결제",
    question: "결제 수단은 무엇을 지원하나요?",
    answer: "앱스토어/플레이스토어 인앱결제를 통해 신용카드 및 각 스토어의 결제 수단을 지원합니다.",
  },
  {
    category: "결제",
    question: "환불은 어떻게 요청하나요?",
    answer: "구매하신 앱스토어 또는 플레이스토어의 환불 정책에 따라 각 스토어 고객센터를 통해 요청하실 수 있습니다.",
  },
  {
    category: "기타",
    question: "신고한 내용은 어떻게 처리되나요?",
    answer: "신고 접수 후 운영팀이 검토하여 평균 1~2일 이내에 조치 결과를 안내해 드립니다.",
  },
  {
    category: "기타",
    question: "광고/제휴 문의는 어디로 하나요?",
    answer: "하단 '제휴 문의' 메뉴 또는 이메일(partner@mommydndn.com)로 문의해 주시면 담당자가 안내해 드립니다.",
  },
  {
    category: "기타",
    question: "앱 오류를 발견했어요. 어디로 알려야 하나요?",
    answer: "설정 > 문의하기를 통해 오류 상황과 스크린샷을 함께 보내주시면 빠르게 확인하겠습니다.",
  },
  {
    category: "기타",
    question: "다른 지역으로 이사했어요. 지역 설정도 바꿔야 하나요?",
    answer: "설정 > 내 동네 설정에서 새로운 지역으로 변경하시면 해당 지역 모임이 우선 추천됩니다.",
  },
];

export function buildFaqs(): FaqSeed[] {
  const now = isoDaysAgo(20);
  return FAQ_DEFS.map((def, index) => ({
    ...def,
    id: index + 1,
    displayOrder: index + 1,
    createdAt: now,
  }));
}
