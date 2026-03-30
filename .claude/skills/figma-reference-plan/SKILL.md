---
name: figma-reference-plan
version: 1.0.0
author: lee-changwook
description: 피그마 URL과 참조할 기존 파일 경로가 함께 제공될 때, 피그마 디자인을 분석하고 참조 코드와 대조하여 구현 계획서를 작성한다. 기존 페이지 구조를 재사용하여 빠르게 구현하고 싶을 때 사용.
context: fork
agent: figma-analyzer
argument-hint: "[Figma URL] [참조 파일 경로]"
---

# Figma Reference Plan

피그마 디자인 분석 결과와 사용자가 지정한 참조 코드를 대조하여 `.claude/plans/design/`에 구현 계획서를 작성한다.

**Always read first:**
- 원칙: [figma-plan/PRINCIPLES.md](../figma-plan/PRINCIPLES.md)
- 템플릿: [TEMPLATE.md](TEMPLATE.md)
- 체크리스트: [figma-plan/CHECKLIST.md](../figma-plan/CHECKLIST.md)

## 활성화 조건

다음 조건이 **모두** 충족될 때:
- 피그마 URL 또는 node ID가 제공됨
- 참조할 기존 파일 경로가 명시적으로 제공됨

## 워크플로우

### Step 1: 원칙과 템플릿 읽기

`figma-plan/PRINCIPLES.md`, 자체 `TEMPLATE.md`, `figma-plan/CHECKLIST.md`를 읽는다.

### Step 2: 디자인 분석 (서브에이전트)

`figma-analyzer` 에이전트를 호출하여 피그마 디자인 데이터를 조회한다.
에이전트에 피그마 URL을 그대로 전달한다.

### Step 3: 참조 코드 읽기

사용자가 지정한 참조 파일을 Read로 읽는다.
같은 디렉토리의 관련 `.tsx`/`.ts` 파일도 함께 읽는다:
- 스타일 파일 (style.ts, styles.ts 등)
- 하위 컴포넌트 파일
- Provider/Context 파일 (있는 경우)

### Step 4: 참조 코드 패턴 파악

읽은 코드에서 다음 패턴을 파악한다:
- 스타일링 방식 (어떤 CSS 솔루션을 사용하는지)
- 컴포넌트 구조 (단일 파일, 디렉토리 분리 등)
- 상태관리 패턴 (useState, 외부 라이브러리 등)

### Step 5: 계획서 작성

분석 결과를 TEMPLATE.md 구조에 따라 계획서를 작성한다.
PRINCIPLES.md의 6가지 원칙을 준수한다.
참조 코드와의 대조 결과를 재사용/변경/신규로 분류한다.

### Step 6: 자체 검증

CHECKLIST.md의 항목으로 계획서를 검증한다.
참조 대조 검증 섹션도 포함하여 검증한다.
실패 항목이 있으면 수정 후 재검증한다.

### Step 7: 저장

검증 통과 시 `.claude/plans/design/{페이지명}-plan.md`에 저장한다.

## 파일명 규칙

동일 페이지에 대해 figma-plan과 figma-reference-plan을 동시에 사용하지 않는다.
참조 코드가 없으면 figma-plan, 있으면 figma-reference-plan.
