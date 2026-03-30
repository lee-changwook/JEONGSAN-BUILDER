# 컨텍스트 저장 예시

> 이 예시는 작성 시 각 섹션의 깊이, 톤, 구체성 수준을 보여준다.
> 실제 작성 시 이 예시와 동일한 수준으로 작성한다.

---

## 2026.03.15 | 14:30 | PRD 스킬 결정성 강화

### 프로젝트

- **경로**: /Users/woogy/Desktop/claude-masterpiece/claude-code-lab
- **브랜치**: main

### ⭐️ 작업 요약

PRD 스킬에 실제 CafeMasters 샘플, 44항목 품질 체크리스트, 구조화된 템플릿을 추가하여 출력 결정성 강화

### 🎯 작업 배경 및 목표

사용자 피드백으로 PRD 스킬이 빈 템플릿만 존재하여 AI 재량에 의존한다는 문제가 제기됨. idea-plan 스킬처럼 실제 샘플과 체크리스트를 추가하여, 어떤 Claude 인스턴스가 실행해도 동일한 품질의 PRD가 나오도록 결정성을 높이는 것이 목표.

### ✅ 완료된 태스크

- [x] `references/template.md` 생성 — 13개 섹션 구조화된 템플릿 (테이블 컬럼 가이드 포함)
- [x] `references/example.md` 생성 — CafeMasters 서비스 기반 전체 PRD 샘플
- [x] `references/checklist.md` 생성 — 44개 품질 체크리스트 + 5개 교차 검증
- [x] `SKILL.md` Step별 프로세스로 재구성 — 5단계 워크플로우 + 작성 규칙 7개
- [x] 기존 `reference.md` (빈 템플릿) 삭제

### ⏳ 남은 태스크

- [ ] save-context 스킬 결정성 강화
  - 현재 상태: 미착수
  - 다음 단계: 동일한 패턴(샘플/가이드/체크리스트)으로 판단 기준 추가

### 🧠 주요 결정 사항

| 결정 | 이유 | 대안 (기각됨) |
| ---- | ---- | ------------- |
| references/ 디렉토리로 분리 (template, example, checklist) | Progressive Disclosure 원칙: SKILL.md를 가볍게 유지하고 필요 시만 로드 | SKILL.md에 모두 인라인 → 500줄 초과, 컨텍스트 낭비 |
| CafeMasters를 PRD 예시로 사용 | 사용자의 기존 프로젝트라 도메인 이해도 높고 현실적 예시 가능 | 가상 서비스 → 비현실적 예시가 될 위험 |
| Step 5 품질 검증 단계 신설 | 작성 후 자가 검증 없이는 섹션 누락/불일치 발생 빈번 | 사용자 수동 검증 → 자동화 가능한 부분을 사람에게 위임하는 것은 비효율 |

### ⚠️ 발견한 이슈 및 주의사항

- idea-plan 스킬의 `references/example.md`가 좋은 레퍼런스 — 향후 다른 스킬 강화 시 이 패턴(template + example + checklist) 재사용 권장
- 기존 `reference.md`를 삭제했으므로, 이전 세션에서 해당 파일을 직접 참조하는 코드가 있다면 경로 업데이트 필요

### 🔀 관련 파일 및 변경 내역

| 파일 | 변경 내용 |
| ---- | --------- |
| `.claude/skills/prd/SKILL.md` | Step 1~5 프로세스 + 작성 규칙 7개로 전면 재작성 |
| `.claude/skills/prd/references/template.md` | 13개 섹션 구조화된 PRD 템플릿 신규 생성 |
| `.claude/skills/prd/references/example.md` | CafeMasters 전체 PRD 샘플 신규 생성 |
| `.claude/skills/prd/references/checklist.md` | 44항목 + 5교차검증 체크리스트 신규 생성 |
| `.claude/skills/prd/reference.md` | 삭제 (references/ 디렉토리로 이전) |

### 📝 커밋 히스토리

커밋 없음

### 재개 방법

다음 세션에서 아래 명령으로 컨텍스트를 복원하세요:

```
/absorb-previous-context /Users/woogy/Desktop/보관함/obsidian/claude-session-memory/claude-code-lab/2026.03.15 | 14:30.md
```

### 히스토리 링크

- 세션 jsonl: `~/.claude/projects/-Users-woogy-Desktop-claude-masterpiece-claude-code-lab/{session-id}.jsonl`
