---
name: api-impact
version: 1.0.0
description: API 필드 변경 시 영향받는 코드를 즉시 파악하는 스킬. 특정 API 엔드포인트나 필드가 변경되면 스키마 → API 함수 → 훅 → 컴포넌트 → 페이지까지 영향 트리를 생성한다. "이 필드 바꾸면 어디 영향?", "nabipAmount 쓰는 곳", "cheonggu API 변경 영향", "/api-impact", "API 변경 전 확인" 같은 질문에 트리거. update-api나 add-api 실행 전에 사전 조사 용도로도 사용한다.
---

## 목적

API 필드가 변경(추가/삭제/타입변경)될 때, 해당 변경이 코드베이스 어디까지 전파되는지를 Zod 스키마부터 페이지 컴포넌트까지 추적하여 영향 트리를 보여준다. 변경 전 사전 조사로 사용하면 수정 범위를 미리 파악할 수 있다.

## 의존성 체인 구조

이 프로젝트의 ACA API는 다음 체인으로 연결된다:

```
Zod 스키마 (.schema.ts)
  → 추론 타입 (z.infer<typeof XxxSchema>)
    → API 함수 (.api.ts) — apiClient.get/post 호출
      → React Query 훅 (useXxxQuery / useXxxMutation)
        → 컴포넌트 (section/, page.tsx)
          → 페이지 라우트 (src/app/td/acap/...)
```

### 네이밍 패턴

| 레이어 | 패턴 | 예시 |
|--------|------|------|
| 스키마 | `Get/Create/Update/Delete` + `Aj` + `<도메인>` + `RequestSchema/ResponseSchema` | `GetAjSueopGroupsResponseSchema` |
| 타입 | 스키마에서 `Schema` 제거 | `GetAjSueopGroupsResponse` |
| API 함수 | camelCase, `get/create/update/delete` + `Aj<도메인>` | `getAjSueopGroups()` |
| Query 훅 | `use` + `GetAj<도메인>` + `Query` | `useGetAjSueopGroupsQuery()` |
| Mutation 훅 | `use` + `Create/Update/Delete` + `Aj<도메인>` + `Mutation` | `useUpdateAjJaewonsaengMutation()` |

## 워크플로우

### Step 1. 대상 특정

사용자 입력에서 다음 중 하나를 추출한다:

- **필드명**: `nabipAmount`, `cheongguAt` 등
- **엔드포인트 경로**: `/A/aka-j/jaewonsaengs`
- **스키마/타입명**: `GetAjJaewonsaengOverallResponse`
- **도메인 키워드**: "재원생", "cheonggu", "출석"

### Step 2. 스키마 파일 특정

1. 경로/prefix가 주어진 경우 → INDEX.md의 prefix 테이블에서 `domain_path` 확인
2. 필드명만 주어진 경우 → `Grep "필드명"` on `src/aca/domain/**/*.schema.ts` + `src/domain/**/*.schema.ts`
3. 결과에서 해당 필드를 포함하는 스키마 파일과 스키마 상수명 확인

```bash
# 필드명으로 스키마 찾기
Grep "nabipAmount" --glob "*.schema.ts"

# 경로로 도메인 특정 후 스키마 파일 읽기
# /A/aka-j/ → domain_path: src/aca/domain/jeonche-cheori
```

### Step 3. 영향 체인 추적

스키마 상수명에서 타입명을 추론하고, 4단계 Grep으로 체인을 추적한다:

#### Level 1: 스키마 → 타입

스키마 파일에서 해당 필드를 포함하는 스키마 상수의 이름을 확인한다.
예: `GetAjJaewonsaengOverallResponseSchema` → 타입: `GetAjJaewonsaengOverallResponse`

#### Level 2: 타입 → API 함수/훅

같은 도메인의 `.api.ts` 파일에서 해당 타입을 사용하는 함수와 훅을 찾는다.

```bash
Grep "GetAjJaewonsaengOverallResponse" --glob "*.api.ts"
```

결과에서 훅 이름 추출 (예: `useGetAjJaewonsaengOverallQuery`)

#### Level 3: 훅 → 컴포넌트

훅 이름으로 전체 코드베이스를 검색한다.

```bash
Grep "useGetAjJaewonsaengOverallQuery" --glob "*.tsx"
```

#### Level 4: 컴포넌트 → 페이지 라우트

컴포넌트 파일 경로에서 페이지 라우트를 역추론한다.
- `src/app/td/acap/jos/[jo]/jeonche-cheori/dv/section/JaewonsaengDetailPanel/index.tsx`
  → 페이지: `jeonche-cheori/dv`

### Step 4. 영향 트리 출력

```
## 영향 분석: `nabipAmount` 필드

### 스키마
- src/aca/domain/jeonche-cheori/api/jeonche-cheori.schema.ts
  - GetAjJaewonsaengOverallResponseSchema.nabipAmount

### API 함수 / 훅
- src/aca/domain/jeonche-cheori/api/jeonche-cheori.api.ts
  - getAjJaewonsaengOverall() → useGetAjJaewonsaengOverallQuery()

### 컴포넌트 (3개)
- jeonche-cheori/dv/section/JaewonsaengDetailPanel/index.tsx:142
- jeonche-cheori/dv/section/JaewonsaengDetailPanel/MinapNabip/index.tsx:88
- chulgyeol-gwanri/tv/MainPanelContent.tsx:205

### 페이지 라우트 (2개)
- /td/acap/jos/[jo]/jeonche-cheori/dv
- /td/acap/jos/[jo]/chulgyeol-gwanri/tv
```

### Step 5. 명세 대조 (선택)

`api-lookup` 스킬의 명세 파일이 있으면, 해당 필드의 현재 명세(타입, nullable, required)도 함께 보여준다. 명세와 코드의 차이가 있으면 경고한다.

## 주의사항

- legacy 코드(`src/domain/`)에도 ACA API가 있다. `domain_path` frontmatter의 모든 경로를 검색 범위에 포함해야 한다.
- 동일 필드명이 여러 스키마에 존재할 수 있다 (예: `nanoId`, `name`). 이 경우 사용자에게 어떤 스키마/엔드포인트를 의미하는지 확인한다.
- 훅이 re-export되는 barrel 파일(`index.ts`)도 있으므로, import 경로가 barrel을 통할 수 있다.
