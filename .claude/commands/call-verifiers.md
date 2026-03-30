# 검증기 병렬 실행 [플래그] [범위]

`/call-verifiers [플래그] [범위] [p:<계획서>]`

## 플래그

1-letter 플래그로 실행할 검증기를 선택한다. **플래그 생략 시 기본(`pcl`) 실행.**

| 플래그 | 검증기               | 설명                          |
| ------ | -------------------- | ----------------------------- |
| `p`    | plan-verifier        | 계획서 ↔ 구현 일치 검증       |
| `c`    | convention-verifier  | 코드 컨벤션 준수 검증         |
| `s`    | security-verifier    | 보안 취약점 검증              |
| `f`    | performance-verifier | 렌더링 성능 패턴 검증         |
| `a`    | a11y-verifier        | 웹 접근성 검증                |
| `l`    | typecheck + lint     | `pnpm typecheck && pnpm lint` |

### 조합 예시

```
/call-verifiers                  → 기본: p + c + l
/call-verifiers sa               → security + a11y
/call-verifiers pclsfa           → 전체 실행
/call-verifiers sf src/app       → security + performance, 범위 지정
/call-verifiers pcl p:plan.md    → 기본 + 계획서 지정
```

## 인자

- **범위** — 검증할 경로 (생략 시 `git diff --name-only`로 자동 감지)
- **`p:`** — 계획서 경로 (생략 시 `.claude/plans/` 최신 파일, `p` 플래그에만 적용)

## 실행

1. 인자 파싱:
   - 첫 번째 인자가 `[pclsfa]+` 패턴(플래그 문자만으로 구성)이면 → 플래그로 인식
   - 첫 번째 인자가 플래그 패턴이 아니면 → 플래그 없음(기본 `pcl`), 해당 인자는 범위로 처리
   - `p:\S+` → 계획서 경로
   - 나머지 → 범위 (없으면 git diff)

2. 플래그에 해당하는 검증기를 **모두 병렬** 실행:

   | 플래그 | 실행 방법                                            |
   | ------ | ---------------------------------------------------- |
   | `p`    | Agent(`plan-verifier`): 계획서 + 범위                |
   | `c`    | Agent(`convention-verifier`): 범위                   |
   | `l`    | Bash: `pnpm typecheck && pnpm lint 2>&1 \| tail -50` |
   | `s`    | Agent(`security-verifier`): 범위                     |
   | `f`    | Agent(`performance-verifier`): 범위                  |
   | `a`    | Agent(`a11y-verifier`): 범위                         |

3. 모든 결과를 PASS/FAIL로 통합 출력:

```
## 통합 결과

| 검증기               | 결과  |
| -------------------- | ----- |
| plan-verifier        | ✅/❌ |
| convention-verifier  | ✅/❌ |
| typecheck            | ✅/❌ |
| lint                 | ✅/❌ |
| security-verifier    | ✅/❌ |
| performance-verifier | ✅/❌ |
| a11y-verifier        | ✅/❌ |
```

> 선택되지 않은 검증기는 테이블에서 제외한다.

$ARGUMENTS
