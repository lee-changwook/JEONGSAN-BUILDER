# 새 API 추가

인자: $ARGUMENTS
형식: `<api-path> <domain-name>`
예시: `/add-api /api/A/aka-j/cheonggus/{nano-id} cheonggu`, `/add-api /api/T/dl/sueops sueop`

## 워크플로우

### Phase 1 — Apidog 스펙 조회

1. `mcp__apidog__refresh_project_oas_ws47c7`를 호출하여 최신 스펙을 가져온다
2. `$ARGUMENTS`에서 api-path를 추출한다
3. api-path를 `$ref` 경로로 변환한다:
   - `/` → `_`, `{` → `%7B`, `}` → `%7D`
   - 앞에 `/paths/` 붙이고 뒤에 `.json` 붙임
   - 예: `/api/A/aka-j/cheonggus/{nano-id}` → `/paths/_api_A_aka-j_cheonggus_%7Bnano-id%7D.json`
4. `mcp__apidog__read_project_oas_ref_resources_ws47c7`로 해당 스펙만 조회한다
5. 스펙에서 모든 HTTP method(GET, POST, PATCH, DELETE)의 request/response 스키마를 파악한다

### Phase 2 — 도메인 위치 결정

1. api-path의 prefix를 확인한다:
   - `/A/` prefix → `src/aca/domain/<domain-name>/api/` (academy app)
   - `/T/dl/` or `/T/feat/` prefix → `src/domain/<domain-name>/api/` (ERP)
2. 해당 도메인 디렉토리가 이미 존재하는지 확인한다
   - 존재하면: 기존 파일에 추가
   - 없으면: 새 디렉토리 + 파일 생성 (`<domain>.schema.ts`, `<domain>.api.ts`, `index.ts`)

### Phase 3 — Zod 스키마 생성 (schema.ts)

Apidog 스펙을 Zod 스키마로 **정확하게** 변환한다. 다음 규칙을 반드시 따른다:

**타입 매핑:**
| Apidog/OpenAPI | Zod |
|---|---|
| `"type": "string"` | `z.string()` |
| `"type": "number"` | `z.number()` |
| `"type": "integer"` | `z.number()` |
| `"type": "boolean"` | `z.boolean()` |
| `"type": "array"` | `z.array(...)` |
| `"type": "object"` | `z.object({...})` |
| `"type": ["string", "null"]` | `z.string().nullable()` |
| `"type": ["object", "null"]` | `z.object({...}).nullable()` |
| `"enum": [...]` | `z.enum([...])` |

**필수 규칙:**
- `required` 배열에 없는 필드는 `.optional()`을 붙인다
- nullable 타입은 반드시 `.nullable()`을 사용한다 (NOT `.optional()`)
- nullable + optional인 경우 `.nullable().optional()`
- `.passthrough()` 절대 사용 금지
- 스펙에 정의된 필드만 포함한다 (임의 추가 금지)
- 스키마 이름 컨벤션: Request → `<Action><Entity>RequestSchema`, Response → `<Action><Entity>ResponseSchema`
- 반드시 inferred type을 export한다: `export type XxxResponse = z.infer<typeof XxxResponseSchema>`

### Phase 4 — API 함수 + React Query Hook 생성 (api.ts)

**GET 엔드포인트:**
```typescript
export const getEntity = async (params: GetEntityRequest): Promise<GetEntityResponse> => {
  const validated = GetEntityRequestSchema.parse(params);
  const res = await apiClient.get('<api-path>', { params: validated });
  return parseOrThrow(GetEntityResponseSchema, res.data);
};

export const useGetEntityQuery = (params: GetEntityRequest, options?: { enabled?: boolean }) =>
  useAuthedQuery<GetEntityResponse, unknown>({
    queryKey: ['<domain>', '<entity>', params],
    queryFn: () => getEntity(params),
    enabled: options?.enabled ?? true,
  });
```

**POST/PATCH/DELETE 엔드포인트:**
```typescript
export const createEntity = async (data: CreateEntityRequest): Promise<CreateEntityResponse> => {
  const body = CreateEntityRequestSchema.parse(data);
  const res = await apiClient.post('<api-path>', body);
  return parseOrThrow(CreateEntityResponseSchema, res.data);
};

export const useCreateEntityMutation = () =>
  useAuthedMutation<CreateEntityResponse, unknown, CreateEntityRequest>({
    mutationFn: createEntity,
  });
```

**네이밍 컨벤션:**
- `/A/` prefix API 함수: `getAj<Entity>`, `useGetAj<Entity>Query` (Aj = aka-j, Ac = aka-c, Ah = aka-h, Ai = aka-i)
- `/T/` prefix API 함수: `get<Entity>`, `useGet<Entity>Query`
- Mutation: `use<Action><Entity>Mutation`
- DELETE mutation에 `meta: { successMessage: '삭제되었습니다.' }` 추가

### Phase 5 — Barrel export 업데이트 (index.ts)

`index.ts`에 `export * from './<domain>.api'`와 `export * from './<domain>.schema'`가 있는지 확인하고, 없으면 추가한다.

### Phase 6 — 검증

```bash
pnpm typecheck && pnpm lint 2>&1 | grep -A 5 "<domain-name>"
```

TypeScript, ESLint 에러가 있으면 수정한다.
