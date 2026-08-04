# Mamit Admin — Demo (Static, No Backend)

`mamitFront`(실제 Spring Boot 백엔드 연동 관리자 패널)와 동일한 화면/기능을 보여주는
**정적 데모 사이트**입니다. 서버도 DB도 없고, 모든 데이터는 브라우저 `localStorage`에
저장되는 mock 데이터입니다. 새로고침해도 CRUD 결과가 유지되고, 완전히 초기 상태로
되돌리고 싶으면 `localStorage`를 지우고 새로고침하면 됩니다.

## 로그인

이메일 인증코드 방식은 실제와 동일하지만, 실제로 이메일이 발송되지는 않습니다.
로그인 화면에 안내되는 것처럼:

- 인증 코드는 항상 **000000**
- 데모 계정 3개 (역할별 화면 차이 확인용)
  - `demo-sys@mamit.demo` — 총괄관리자(SYS_ADMIN)
  - `demo-ops@mamit.demo` — 운영관리자(OPS_ADMIN)
  - `demo-biz@mamit.demo` — 업무관리자(BIZ_ADMIN)
- 위 3개 외의 이메일을 입력해도 총괄관리자 권한으로 로그인됩니다.

## mamitFront와의 차이점

- **대시보드/설정**: 실제 서비스에서도 아직 미개발 상태라 자리표시자 그대로 두었습니다.
- **고객센터(FAQ)**: 실 백엔드에 테이블이 아직 없어서, 이 데모에서 새로 설계해 넣었습니다
  (목록/등록/수정삭제/노출순서 변경 + 카테고리 관리).
- 나머지 페이지(회원/모임/신고/배너/약관/관리자계정)는 실제 페이지와 동일한 UI·상호작용이며,
  데이터만 `src/lib/mock/`의 mock 라우터가 처리합니다.
- 약관 5종(서비스 이용약관 등)과 배너 일부는 "삭제 불가/사용 중" 같은 실제 백엔드의
  비즈니스 규칙(409 에러 케이스)도 그대로 재현해뒀습니다.

## 로컬 실행

```bash
pnpm install
pnpm dev
```

## 정적 빌드 (Vercel 배포용)

`next.config.ts`에 `output: "export"`가 설정되어 있어 `pnpm build` 실행 시
서버리스 함수 없이 순수 정적 파일이 `out/` 폴더에 생성됩니다.

```bash
pnpm build
```

## Vercel 배포

1. 이 폴더(`mamitdemo`)를 GitHub 저장소로 push
2. Vercel에서 New Project → 해당 저장소 선택 → Framework Preset은 Next.js로 두면 됨
   (Root Directory를 이 폴더로 지정)
3. 별도 환경변수 필요 없음 (백엔드 연동이 없으므로)
4. 배포 후 나오는 URL이 그대로 데모 링크

또는 Vercel CLI로 바로 배포:

```bash
npx vercel --prod
```

## 데이터 초기화

브라우저 개발자 도구 콘솔에서 아래 실행 후 새로고침하면 모든 데모 데이터가
초기 시드 상태로 재생성됩니다 (재생성 시 이름/날짜 등은 랜덤이라 매번 조금씩 다릅니다).

```js
Object.keys(localStorage)
  .filter((k) => k.startsWith("mamitdemo:"))
  .forEach((k) => localStorage.removeItem(k));
location.reload();
```
