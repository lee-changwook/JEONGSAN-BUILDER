---
name: sync-api-docs
version: 1.0.0
description: Apidog MCP에서 최신 OAS를 가져와 .claude/docs/apis/AKA/ 명세 파일(aka-*.md)을 자동 갱신하는 스킬. "/sync-api-docs", "/sync-api-docs aka-j", "API 문서 갱신해줘", "스펙 최신화", "docs 동기화", "references 업데이트" 같은 요청 시 트리거한다. add-api나 update-api 후 문서 반영, 주기적 명세 갱신, api-lookup/api-drift-check의 신뢰도 확보를 위해 사용한다.
---

## 목적

Apidog의 최신 OpenAPI Spec을 `.claude/docs/apis/AKA/` 디렉토리의 명세 파일로 변환하여 동기화한다.
이 문서들은 `api-lookup`과 `api-drift-check` 스킬의 데이터 소스이므로, 항상 최신 상태를 유지해야 한다.

## 언제 사용하나

- `/add-api` 또는 `/update-api` 실행 후, 변경사항을 문서에 반영
- 새로운 엔드포인트가 백엔드에 추가되었을 때
- 정기적 명세 동기화 ("스펙 최신화해줘")
- `api-drift-check`에서 `NO_SPEC` 항목이 많이 발견될 때

## 입력

```
/sync-api-docs                  # 전체 갱신 (aka-a ~ aka-j)
/sync-api-docs aka-j            # 특정 prefix만 갱신
/sync-api-docs aka-b aka-g      # 여러 prefix 갱신
```

## Prefix → 파일 매핑

| prefix | spec 파일 | OAS path prefix |
|--------|-----------|-----------------|
| aka-a | aka-a-sueop-saengseong.md | /api/A/aka-a/ |
| aka-b | aka-b-napip-bunseok.md | /api/A/aka-b/ |
| aka-c | aka-c-jojik-allim-balsin.md | /api/A/aka-c/ |
| aka-d | aka-d-sueop-allim-balsin.md | /api/A/aka-d/ |
| aka-e | aka-e-jojik-balsin-naeyeok.md | /api/A/aka-e/ |
| aka-f | aka-f-sueop-balsin-naeyeok.md | /api/A/aka-f/ |
| aka-g | aka-g-minap-gwanri.md | /api/A/aka-g/ |
| aka-h | aka-h-chulgyeol-gwanri.md | /api/A/aka-h/ |
| aka-i | aka-i-chulgyeol-mobile.md | /api/A/aka-i/ |
| aka-j | aka-j-jeonche-cheori.md | /api/A/aka-j/ |

## 워크플로우

### Step 1. Apidog에서 최신 OAS 가져오기

> **MCP 도구명 규칙:** Apidog MCP 도구는 `mcp__API_specification__<action>_{project_id}` 형식이다.
> `{project_id}` 부분은 사용자의 Apidog 프로젝트 설정에 따라 다르다 (예: `k1819y`, `tmlnm5`, `n7hkco` 등).
> 사용 가능한 도구 목록에서 `read_project_oas`, `refresh_project_oas`, `read_project_oas_ref_resources`를 포함하는 도구명을 찾아 사용한다.

1. `refresh_project_oas_{project_id}`를 호출하여 OAS를 최신 상태로 갱신한다
2. `read_project_oas_{project_id}`를 호출하여 전체 OAS index를 가져온다
3. index에서 대상 prefix에 해당하는 path들을 필터링한다
   - 예: `aka-j` → `/api/A/aka-j/`로 시작하는 모든 path

### Step 2. 대상 엔드포인트 상세 스펙 조회

필터링된 각 path에 대해 `read_project_oas_ref_resources_{project_id}`로 상세 스펙을 조회한다.

**$ref 경로 변환 규칙:**
- `/` → `_`, `{` → `%7B`, `}` → `%7D`
- 앞에 `/paths/` 붙이고 뒤에 `.json` 붙임
- 예: `/api/A/aka-j/cheonggus/{nano-id}` → `/paths/_api_A_aka-j_cheonggus_%7Bnano-id%7D.json`

한 번에 최대 5개의 ref를 묶어서 조회하여 효율적으로 처리한다.

### Step 3. 기존 문서와 비교

1. 기존 `aka-*.md` 파일을 읽는다 (없으면 신규 생성 대상)
2. 기존 문서에서 `### METHOD /path` 패턴으로 엔드포인트 목록을 추출한다
3. Apidog 스펙과 비교하여 변경분을 분류한다:

| 변경 유형 | 설명 |
|----------|------|
| `NEW` | Apidog에 있지만 문서에 없는 엔드포인트 |
| `REMOVED` | 문서에 있지만 Apidog에서 삭제된 엔드포인트 |
| `MODIFIED` | 양쪽 다 있지만 스펙이 다른 엔드포인트 |
| `UNCHANGED` | 동일한 엔드포인트 |

변경분이 없으면 해당 파일은 건너뛴다.

### Step 4. 문서 갱신

변경이 감지된 파일만 업데이트한다.

#### 4-1. Frontmatter 업데이트

```yaml
---
name: AKA-X 한글이름
prefix: /A/aka-x
total: N          # Apidog 전체 엔드포인트 수로 갱신
implemented: M    # 기존 값 유지 (코드 분석 대상이 아님)
page: route-segment-name
domain_path: src/aca/domain/xxx, ...
---
```

- `total`은 Apidog 스펙 기준으로 갱신한다
- `implemented`는 기존 값을 유지한다 (이 스킬은 문서만 갱신, 코드 분석은 drift-check 역할)
- `name`, `page`, `domain_path`는 기존 값 유지 (변경 필요 시 사용자에게 알린다)

#### 4-2. 엔드포인트 섹션 작성

각 엔드포인트를 다음 형식으로 작성한다. 기존 문서의 섹션 그룹핑(## 소제목)을 최대한 유지한다.

**엔드포인트 포맷:**

```markdown
### METHOD /A/aka-x/path

설명 (OAS summary 또는 description)

**Path Parameters:**

| name | type | required |
|------|------|:--------:|
| nanoId | string | Y |

**Query Parameters:**

| name | type | required | description |
|------|------|:--------:|-------------|
| jojikNanoId | string | Y | |
| nameSearch | string | N | 검색 키워드 |

**Request Body:**

| name | type | required | description |
|------|------|:--------:|-------------|
| field1 | string | Y | |
| field2 | number | N | |

**Response 200:**

```ts
{
  items: {
    nanoId: string
    name: string
    count: number
  }[]
}
```

---
```

**작성 규칙:**

- Path/Query/Body 파라미터가 없는 섹션은 생략한다
- Response는 TypeScript 타입 표기법으로 작성한다 (Zod가 아님)
- nullable 필드: `fieldName: string | null`
- optional 필드: `fieldName?: string`
- 배열: `items: { ... }[]`
- 중첩 객체: 들여쓰기로 표현
- enum 값은 Query Parameters의 description에 옵션을 나열한다
- 엔드포인트 사이에 `---` 구분선을 넣는다

**OAS → 문서 타입 매핑:**

| OAS type | 문서 표기 |
|----------|----------|
| `"type": "string"` | `string` |
| `"type": "integer"` / `"type": "number"` | `number` |
| `"type": "boolean"` | `boolean` |
| `"type": "array", "items": {...}` | `Type[]` |
| `"type": ["string", "null"]` | `string \| null` |
| `"enum": ["a", "b"]` | `string` (enum 값은 description에) |

#### 4-3. 섹션 그룹핑

- 기존 문서에 `## 소제목 (N)` 형태의 그룹이 있으면 해당 구조를 유지한다
- 새 엔드포인트가 기존 그룹에 속하면 해당 그룹에 추가한다
- 그룹을 판단할 수 없는 새 엔드포인트는 `## 미분류` 섹션에 추가하고 사용자에게 알린다
- 그룹 제목의 `(N)` 숫자를 갱신한다

### Step 5. INDEX.md 갱신

1. INDEX.md의 "페이지 → 명세 파일 매핑" 테이블을 갱신한다
   - 새로 생성된 파일이 있으면 상태를 `작성 완료` 또는 `부분 작성 (M/N)` 으로 변경
   - `total` 값이 변경되었으면 반영
2. "Prefix → 도메인 매핑" 테이블의 정보는 변경하지 않는다 (프론트 구조에 의존하므로)

### Step 6. 변경 리포트

```
## sync-api-docs 완료

### 갱신 대상: aka-j (전체처리)

### 변경 요약:
| 유형 | 건수 |
|------|:----:|
| NEW | 3 |
| MODIFIED | 5 |
| REMOVED | 1 |
| UNCHANGED | 71 |

### 새로 추가된 엔드포인트:
- POST /A/aka-j/new-endpoint-1
- GET /A/aka-j/new-endpoint-2
- DELETE /A/aka-j/old-endpoint/{nano-id}/sub

### 수정된 엔드포인트:
- GET /A/aka-j/jaewonsaengs — Query Parameter 추가: newFilter
- PATCH /A/aka-j/cheonggus/{nano-id} — Response 필드 변경: amount 타입 변경

### 삭제된 엔드포인트:
- GET /A/aka-j/deprecated-endpoint

### 미분류 엔드포인트 (수동 그룹핑 필요):
- POST /A/aka-j/new-endpoint-1 → '## 미분류' 섹션에 임시 배치

### 갱신된 파일:
- .claude/docs/apis/AKA/aka-j-jeonche-cheori.md (total: 77 → 80)
- .claude/docs/apis/AKA/INDEX.md (테이블 갱신)
```

## 주의사항

- 이 스킬은 **문서만 갱신**한다. 코드(Zod 스키마, API 함수)는 건드리지 않는다
- 코드 갱신이 필요하면 `/update-api`나 `/add-api`를 안내한다
- Apidog MCP 호출이 실패하면 사용자에게 알리고 중단한다 (부분 갱신 방지)
- 기존 문서의 `implemented` 값은 절대 변경하지 않는다 (코드 기준 값이므로)
- 기존 문서에 수동으로 추가한 description이나 주석이 있으면 보존한다
- `(복합 — ...)` 같은 축약 표기는 Apidog 스펙으로 대체하되, 원본 축약이 의도적이었는지 사용자에게 확인한다
