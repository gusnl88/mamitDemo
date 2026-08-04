import type { ThemeConfig } from "antd";

/**
 * mamitFront 로고에서 뽑아낸 색(coral red). 나중에 디자인 시스템이나
 * 정확한 브랜드 hex가 나오면 이 값만 바꾸면 됨 — ConfigProvider로
 * 테마 적용되는 모든 것(기본 버튼, 링크, 활성 메뉴 항목, 포커스
 * 링 등)이 자동으로 반영됨.
 */
export const BRAND_COLOR = "#F2504F";

export const themeConfig: ThemeConfig = {
  token: {
    colorPrimary: BRAND_COLOR,
  },
};
