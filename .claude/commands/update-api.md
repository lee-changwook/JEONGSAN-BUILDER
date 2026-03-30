# 기존 API 스펙 변경 반영

인자: $ARGUMENTS
형식: `<api-path> [변경사항 설명]`
예시: `/update-api /api/A/aka-j/cheonggus/{nano-id} bubunCheonggus에 nabipAmount 필드 추가`

## 워크플로우

### Phase 1 — Apidog 스펙 조회 + 코드 비교

1. `mcp__apidog__refresh_project_oas_ws47c7`를 호출하여 최신 스펙 가져온다
2. `$ARGUMENTS`에서 api-path를 추출한다
3. api-path를 `$ref` 경로로 변환하여 `mcp__apidog__read_project_oas_ref_resources_ws47c7`로 스펙 조회한다:
   - `/` → `_`, `{` → `%7B`, `}` → `%7D`, 앞에 `/paths/`, 뒤에 `.json`
4. 코드베이스에서 해당 API의 스키마 파일을 찾는다:
   - `src/aca/domain/`과 `src/domain/` 양쪽에서 endpoint 경로 문자열을 Grep한다
5. Apidog 스펙과 현재 Zod 스키마를 비교하여 **변경 목록(diff)**을 생성한다

### Phase 2 — 변경 분류

변경사항을 다음 3단계로 분류한다:

#### 🟢 Level 1: 단순 스키마 변경 (자동 적용)

즉시 코드를 수정한다. 사용자 확인 불필요:

- **필드 추가**: 새 필드를 Zod 스키마에 추가
- **필드 제거**: 스키마에서 삭제 + 코드에서 해당 필드 참조를 Grep하여 모두 제거
- **필드명 변경 (오타 수정)**: 스키마 + 코드 전체에서 rename
- **타입 변경**: `string` → `number`, nullable 추가/제거 등
- **optional ↔ required 변경**

적용 후 바로 Phase 4(검증)로 진행한다.

**적용 규칙:**
- nullable: `"type": ["string", "null"]` → `z.string().nullable()` (절대 `.optional()`으로 대체하지 않음)
- optional: `required` 배열에 없는 필드 → `.optional()`
- enum: `"enum": [...]` → `z.enum([...])`
- `.passthrough()` 사용 금지
- 스펙에 없는 필드 추가 금지

#### 🟡 Level 2: UI 반영 필요 (디자인 컨텍스트 필요)

**새 필드를 화면에 표시해야 하는 경우** 또는 **기존 UI 요소를 변경해야 하는 경우:**

1. 스키마 변경은 먼저 적용한다 (Level 1과 동일)
2. 사용자에게 다음을 질문한다:
   ```
   API 변경으로 인해 UI 변경이 필요합니다:
   - [변경 내용 요약]

   다음 정보가 필요합니다:
   1. Figma 디자인 URL (해당 화면)
   2. 또는 어떻게 표시할지 설명

   제공해주세요.
   ```
3. 디자인 컨텍스트를 받은 후 UI를 수정한다

**이 레벨에 해당하는 경우:**
- 새 필드를 테이블 컬럼, 폼 필드, 상세 패널 등에 추가해야 할 때
- 기존 필드의 표시 형식이 변경될 때 (예: 날짜 → 날짜+시간)
- 필드 삭제로 인해 UI 컬럼/필드를 제거해야 할 때

#### 🔴 Level 3: 로직 변경 필요 (심층 분석 모드)

**API 변경이 컴포넌트 로직, 상태 관리, 또는 API 호출 흐름에 영향을 미치는 경우:**

1. 스키마 변경은 먼저 적용한다
2. **`api-impact` 스킬을 실행**하여 영향 트리를 생성한다
   - 변경된 필드명 또는 엔드포인트 경로를 입력으로 전달
   - 스킬이 스키마 → API 함수 → 훅 → 컴포넌트 → 페이지 체인을 자동 추적
3. 영향 트리 결과를 사용자에게 보여주고 승인을 받은 후 변경을 적용한다

**이 레벨에 해당하는 경우:**
- API 응답 구조가 근본적으로 변경 (nested object 평탄화, 배열→단일 객체 등)
- 필드 의미 변경으로 기존 조건문/필터 로직이 영향받을 때
- API 호출 순서나 의존성이 변경될 때
- 새로운 API가 기존 API를 대체할 때
- 삭제된 필드가 다른 API의 request에 사용되고 있을 때

### Phase 3 — 코드 수정 적용

Level에 따라 수정을 적용한다:

1. **스키마 파일 수정** (`*.schema.ts`): Apidog 스펙과 정확히 일치하도록 업데이트
2. **API 함수 수정** (`*.api.ts`): 필요시 파라미터, 경로, 반환 타입 수정
3. **컴포넌트 수정** (Level 2, 3): 영향받는 UI/로직 수정
4. **사용하지 않는 코드 제거**: 삭제된 필드 참조, 미사용 import 등 정리

### Phase 4 — 검증

```bash
pnpm typecheck && pnpm lint 2>&1 | grep -A 5 "<관련 폴더>"
```

에러가 있으면 수정한다. 특히:
- TypeScript 타입 에러 (스키마 변경으로 인한 필드 접근 오류)
- ESLint unused variable 경고 (삭제된 필드 관련)
- ESLint no-unused-vars (제거된 import)

### Phase 5 — 변경 요약 보고

```
## API 변경 적용 완료

### 엔드포인트: `<METHOD> <api-path>`
### 변경 레벨: 🟢/🟡/🔴

### 스키마 변경:
- [변경 1]
- [변경 2]

### 코드 변경:
- `<file-path>`: [변경 내용]

### 검증: ✅ typecheck + lint 통과
```
