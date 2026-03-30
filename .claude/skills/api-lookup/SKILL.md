---
name: api-lookup
version: 1.0.0
description: ACA(아카데미 앱) API 명세를 로컬 docs에서 즉시 조회하는 스킬. "/A/aka-" 경로의 엔드포인트 스펙(request params, response schema)을 Apidog 호출 없이 확인한다. API 구현/수정 중 "이 API 뭐 받아?", "응답 스키마 알려줘", "cheonggu API spec" 같은 질문이 나올 때, 또는 코드에서 /A/aka-*/ 경로를 다룰 때 반드시 사용한다. Zod 스키마 작성, API 함수 구현, spec 대조 검증 시에도 트리거된다.
---

## 목적

에이전트가 ACA API 코드를 작성·수정·검증할 때, Apidog MCP를 호출하지 않고 `.claude/docs/apis/AKA/` 의 로컬 명세만으로 즉시 답변한다.

## 명세 파일 위치

```
.claude/docs/apis/AKA/
├── INDEX.md                           (prefix → 파일 매핑 인덱스)
├── aka-a-sueop-saengseong.md          (51) /A/aka-a/
├── aka-b-napip-bunseok.md             (8)  /A/aka-b/
├── aka-c-jojik-allim-balsin.md        (17) /A/aka-c/
├── aka-d-sueop-allim-balsin.md        (13) /A/aka-d/
├── aka-e-jojik-balsin-naeyeok.md      (8)  /A/aka-e/
├── aka-f-sueop-balsin-naeyeok.md      (15) /A/aka-f/
├── aka-g-minap-gwanri.md              (16) /A/aka-g/
├── aka-h-chulgyeol-gwanri.md          (26) /A/aka-h/
├── aka-i-chulgyeol-mobile.md          (10) /A/aka-i/
└── aka-j-jeonche-cheori.md            (80) /A/aka-j/
```

## 워크플로우

### Step 1. 대상 특정

사용자 질문 또는 현재 작업 중인 코드에서 다음 중 하나를 추출한다:

| 단서 | 예시 | 행동 |
|------|------|------|
| API 경로 | `/A/aka-j/jaewonsaengs` | prefix `aka-j` → `aka-j-jeonche-cheori.md` |
| prefix | `aka-c` | → `aka-c-jojik-allim-balsin.md` |
| 페이지명 | "전체처리", "jeonche-cheori" | INDEX.md 테이블에서 prefix 특정 |
| 도메인 키워드 | "재원생", "cheonggu", "출석" | INDEX.md 또는 `##` 섹션 헤더로 검색 |

**prefix를 바로 알 수 있으면 INDEX.md를 읽을 필요 없다** — 직접 해당 `.md` 파일로 간다.

### Step 2. 명세 조회

대상 파일에서 필요한 부분만 읽는다:

- **특정 엔드포인트 조회**: `Grep "### METHOD /A/aka-x/path"` 로 line 번호 특정 → 해당 섹션만 Read
- **섹션 전체 조회**: `Grep "## 재원생"` 로 섹션 시작 특정 → 다음 `##` 까지 Read
- **전체 목록 조회**: `Grep "^### "` 로 엔드포인트 헤더만 추출

파일이 크므로(aka-j는 1600+ lines) **전체 파일을 읽지 말 것**. 필요한 구간만 offset/limit으로 읽는다.

### 코드 대조가 필요하면?

명세와 코드의 정합성 검증은 이 스킬의 역할이 아니다. 다음 스킬을 사용한다:
- **정합성 검증**: `api-drift-check` — 명세 vs Zod 스키마 차이 감지
- **변경 영향 분석**: `api-impact` — 필드 변경 시 영향받는 코드 추적

## 검색 팁

```bash
# prefix로 파일 특정
Grep "prefix: /A/aka-j" → aka-j-jeonche-cheori.md

# 엔드포인트 경로로 직접 검색
Grep "/A/aka-j/jaewonsaengs" .claude/docs/apis/AKA/

# 섹션 헤더로 검색
Grep "## 재원생" .claude/docs/apis/AKA/

# 특정 파일의 모든 엔드포인트 목록
Grep "^### " .claude/docs/apis/AKA/aka-j-jeonche-cheori.md
```

## 주의사항

- 명세 파일이 원본(Apidog)의 사본이므로 최신성을 보장하지 않는다. 명세와 코드가 둘 다 맞는데 동작이 다르면 Apidog 원본 확인이 필요하다.
- aka-i, aka-j의 일부 API는 `src/domain/`에 위치한 legacy 코드다. `domain_path` frontmatter를 참조하여 올바른 위치에서 코드를 찾는다.
- 새 API를 추가할 때는 반드시 `src/aca/domain/`에 배치한다 (`src/domain/`에 추가 금지).
