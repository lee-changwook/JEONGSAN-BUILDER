---
name: api-drift-check
version: 1.0.0
description: ACA API 명세(.claude/docs/apis/AKA/*.md)와 실제 Zod 스키마(src/aca/domain/, src/domain/)의 정합성을 검증하는 스킬. "/api-drift-check", "/api-drift-check aka-j", "스펙이랑 코드 맞아?", "API 스키마 검증해줘", "drift check" 같은 요청 시 트리거한다. update-api나 add-api 전에 현재 상태를 파악하거나, PR 전 정합성 점검에 사용한다.
---

## 목적

`.claude/docs/apis/AKA/` 의 API 명세(Apidog 원본 사본)와 `src/aca/domain/` (또는 `src/domain/`)의 실제 Zod 스키마를 대조하여 불일치를 찾아 리포트를 생성한다.

## 언제 사용하나

- `update-api`나 `add-api` 실행 전, 현재 drift 상태 파악
- PR 생성 전 API 정합성 점검
- 주기적 점검 ("스펙이랑 코드 맞아?")
- 특정 도메인의 스키마가 명세와 다른지 의심될 때

## 입력

```
/api-drift-check              # 전체 검사 (aka-a ~ aka-j)
/api-drift-check aka-j         # 특정 prefix만 검사
/api-drift-check jeonche-cheori # 페이지 이름으로도 가능
```

## 워크플로우

### Step 1. 대상 특정

인자가 있으면 해당 prefix/page만, 없으면 전체 `aka-*.md` 파일을 대상으로 한다.

매핑 테이블:

| prefix | page | spec 파일 | domain 경로 |
|--------|------|-----------|-------------|
| aka-a | sueop-saengseong | aka-a-sueop-saengseong.md | src/aca/domain/ 내 다수 |
| aka-b | napip-bunseok | aka-b-napip-bunseok.md | src/aca/domain/napip-bunseok |
| aka-c | hagwon-allim-balsong | aka-c-jojik-allim-balsin.md | src/aca/domain/hagwon-allim |
| aka-d | sueop-allim-balsong | aka-d-sueop-allim-balsin.md | src/aca/domain/sueop-allim |
| aka-e | hagwon-allim-balsong-naeyeok | aka-e-jojik-balsin-naeyeok.md | src/aca/domain/hagwon-allim |
| aka-f | sueop-allim-balsong-naeyeok | aka-f-sueop-balsin-naeyeok.md | src/aca/domain/sueop-allim |
| aka-g | minap-gwanri | aka-g-minap-gwanri.md | src/aca/domain/minap-gwanri |
| aka-h | chulgyeol-gwanri | aka-h-chulgyeol-gwanri.md | src/aca/domain/chulgyeol-gwanri |
| aka-i | chulgyeol-mobile | aka-i-chulgyeol-mobile.md | src/domain/ (dirty code) |
| aka-j | jeonche-cheori | aka-j-jeonche-cheori.md | src/aca/domain/jeonche-cheori |

### Step 2. 명세에서 엔드포인트 목록 추출

spec 파일(`.claude/docs/apis/AKA/aka-*.md`)을 읽고 `### METHOD /path` 패턴으로 모든 엔드포인트를 추출한다.

각 엔드포인트에서:
- **Request**: Path Parameters, Query Parameters, Request Body 테이블의 `name`과 `type` 컬럼 추출
- **Response**: TypeScript 코드블록 내 필드명과 타입 추출

### Step 3. 코드에서 Zod 스키마 탐색

1. `Grep`으로 해당 prefix의 API URL을 `*.api.ts` 파일에서 검색
   - 예: `/A/aka-j/jaewonsaengs` → 어떤 `.api.ts`에서 사용되는지 특정
2. 해당 `.api.ts`에서 import하는 `.schema.ts` 파일을 특정
3. `.schema.ts`에서 Request/Response 스키마의 Zod 필드를 파싱

**Zod 필드 추출 규칙:**
- `z.string()` → `string`
- `z.number()`, `z.integer()` → `number`
- `z.boolean()` → `boolean`
- `z.array(...)` → `type[]`
- `z.object({...})` → nested object
- `.nullable()` → `type | null`
- `.optional()` → optional

### Step 4. 대조 및 불일치 분류

각 엔드포인트에 대해 spec과 code를 비교하고, 불일치를 다음 카테고리로 분류한다:

| 카테고리 | 의미 | 심각도 |
|---------|------|--------|
| `MISSING_IN_CODE` | spec에는 있지만 Zod 스키마에 없는 필드 | HIGH |
| `MISSING_IN_SPEC` | Zod 스키마에는 있지만 spec에 없는 필드 | MEDIUM |
| `TYPE_MISMATCH` | 필드는 있지만 타입이 다름 | HIGH |
| `NULLABLE_MISMATCH` | nullable 여부가 다름 | LOW |
| `OPTIONAL_MISMATCH` | optional/required 여부가 다름 | LOW |
| `NOT_IMPLEMENTED` | spec에 있지만 코드에 API 함수가 없음 | INFO |
| `NO_SPEC` | 코드에 있지만 spec에 없는 엔드포인트 | INFO |

### Step 5. 리포트 생성

`.claude/results/` 디렉토리에 리포트를 저장한다.

**파일명**: `api-drift-{prefix}-{timestamp}.md` 또는 `api-drift-all-{timestamp}.md`

**리포트 형식:**

```markdown
# API Drift Check Report

- 검사 일시: 2026-03-23T12:00:00
- 대상: aka-j (전체처리)
- spec 엔드포인트: 80개
- 구현된 엔드포인트: 58개
- 불일치 발견: 12건

## Summary

| 카테고리 | 건수 |
|---------|:----:|
| MISSING_IN_CODE | 3 |
| TYPE_MISMATCH | 2 |
| NOT_IMPLEMENTED | 7 |

## Details

### MISSING_IN_CODE (3)

#### GET /A/aka-j/jaewonsaengs

| 필드 | 위치 | spec 타입 | 비고 |
|------|------|----------|------|
| boninName | Response | string | schema에 없음 |

**spec 파일**: .claude/docs/apis/AKA/aka-j-jeonche-cheori.md:358
**schema 파일**: src/aca/domain/jeonche-cheori/api/jeonche-cheori.schema.ts:42

---

### NOT_IMPLEMENTED (7)

| Method | Path | spec 섹션 |
|--------|------|----------|
| POST | /A/aka-j/bubun-cheonggus/{nano-id}/bunhal | 부분청구 |
...
```

### Step 6. 결과 요약

터미널에 요약을 출력한다:

```
API Drift Check 완료
- 검사: aka-j (80 endpoints)
- HIGH: 5건, MEDIUM: 3건, LOW: 2건, INFO: 7건
- 리포트: .claude/results/api-drift-aka-j-20260323.md
```

## 주의사항

- spec의 `(복합 — ...)` 같은 축약 표기는 상세 필드 대조를 건너뛴다 (해당 엔드포인트는 `PARTIAL_SPEC`으로 표기)
- dirty code(src/domain/ 내 /A/ prefix)도 검사 대상에 포함한다
- 한 엔드포인트가 여러 `.api.ts`에서 중복 정의된 경우 모두 리포트한다
- Response에 `(empty)` 표기된 엔드포인트는 Response 검증을 건너뛴다
