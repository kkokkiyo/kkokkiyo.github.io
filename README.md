# kkokkiyo.github.io

이동찬의 포트폴리오 겸 블로그. Astro + MDX + Tailwind, GitHub Pages로 무료 배포.

## 개발

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # dist/ 생성
```

## 콘텐츠 추가

- 프로젝트: `src/content/projects/<slug>.mdx` (스키마는 `src/content.config.ts`)
  - 홈 대표 프로젝트와 순서는 `src/data/home.json`, `order`는 프로젝트 목록 정렬, `draft: true`면 숨김
  - 본문 블록은 import 없이 `<Figure src="/src/assets/..." alt="..." />` 처럼 사용
- 블로그: `src/content/blog/<slug>.mdx`
- 이미지: `src/assets/<projects|blog>/<slug>/`에 두고 블록의 `src`로 참조. 영상은 `<YouTube id="..." title="..." />`
- 사이트 정보·메뉴·푸터·댓글·통계: `src/data/site.json`
- 홈 화면 문구·버튼·섹션 순서·대표 프로젝트: `src/data/home.json`
- 페이지 문구: `src/data/pages/*.json`, 본문이 있는 페이지는 `src/content/pages/*.mdx`
- 추가 페이지: `src/content/custom/<주소>.mdx` → `/<주소>/`

## 주요 페이지

| 경로 | 내용 |
|---|---|
| `/playground/` | 이미지 → Dot Pad 60×40 핀 변환 체험 (hex·점자 내보내기, 키보드 그리기) |
| `/cv/` | 이력서. "PDF로 저장" 버튼 → A4 1장 |
| `/research/` | 연구 흐름 타임라인, 최근 연구 로그 |
| `/en/` | 영어 소개 페이지 |
| `/search/` | Pagefind 검색 (`npm run build` 후에만 동작) |
| `/accessibility/` | 접근성 정책 |
| `/rss.xml`, `/og/*.png` | RSS, 자동 생성 공유 이미지 |

- 연구 로그: `src/content/logs/<날짜>-<이름>.md` (`project`에 프로젝트 파일 이름)
- 수상·자격·기술: `src/data/profile.json` 한 곳만 고치면 About·CV·영어 페이지에 함께 반영

## 배포 (최초 1회)

1. GitHub에 **`kkokkiyo.github.io`** 이름으로 저장소 생성 후 push
2. 저장소 Settings → Pages → Source를 **GitHub Actions**로 변경
3. 이후 `main`에 push하면 `.github/workflows/deploy.yml`이 자동 배포

## 댓글 (giscus)

저장소 Settings에서 Discussions 활성화 → https://giscus.app 에서 설정값 확인 → `src/data/site.json`의 `giscus`에 입력.
