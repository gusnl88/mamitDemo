import { MEMBER_COUNT } from "@/lib/mock/seed";
import { MemberDetailPageView } from "@/components/members/MemberDetailPageView";

/**
 * 정적 export(output: "export")는 빌드 시점에 모든 동적 경로를 알아야 하므로,
 * 시드가 만드는 회원 id 범위(1..MEMBER_COUNT)를 그대로 정적 파라미터로 내보낸다.
 */
export function generateStaticParams() {
  return Array.from({ length: MEMBER_COUNT }, (_, index) => ({ id: String(index + 1) }));
}

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MemberDetailPageView id={id} />;
}
