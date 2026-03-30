---
name: figma-plan
version: 1.0.0
author: lee-changwook
description: Figma URL 또는 node ID가 주어지면 디자인을 분석하고 구현 계획서를 작성한다. 참조할 기존 코드 없이 처음부터 구현할 때 사용. 참조 코드가 있으면 figma-reference-plan을 사용.
context: fork
agent: figma-analyzer
argument-hint: "[Figma URL]"
---

# Figma Plan

피그마 디자인을 분석하고 `.claude/plans/design/`에 구현 계획서를 작성한다.

**Always read first:** [PRINCIPLES.md](PRINCIPLES.md), [TEMPLATE.md](TEMPLATE.md), [CHECKLIST.md](CHECKLIST.md)

## 🔑 활성화 조건

### 활성화 키워드

- "피그마 계획서", "피그마 분석", "디자인 구현 계획"
- "figma plan", "피그마 URL"로 시작하는 요청
- Figma URL이 제공되고 참조할 기존 코드가 없을 때

### 사용하지 않을 때

- 참조할 기존 코드가 있음 → `figma-reference-plan`
- 계획서 없이 바로 구현 → `execute-figma-plan` (계획서 선행 필요)
- 피그마 없이 디자인 → `frontend-design`

## 워크플로우

### Step 1: 원칙과 템플릿 읽기

PRINCIPLES.md, TEMPLATE.md, CHECKLIST.md를 읽는다.

### Step 2: 디자인 분석 (서브에이전트)

`figma-analyzer` 에이전트를 호출하여 피그마 디자인 데이터를 조회한다.
에이전트에 피그마 URL을 그대로 전달한다.

### Step 3: 계획서 작성

figma-analyzer의 분석 결과를 바탕으로 TEMPLATE.md 구조에 따라 계획서를 작성한다.
PRINCIPLES.md의 6가지 원칙을 준수한다.

### Step 4: 자체 검증

CHECKLIST.md의 항목으로 계획서를 검증한다.
(참조 대조 검증 섹션은 건너뛴다 — figma-plan에서는 해당 없음)
실패 항목이 있으면 수정 후 재검증한다.

### Step 5: 저장

검증 통과 시 `.claude/plans/design/{페이지명}-plan.md`에 저장한다.

## 파일명 규칙

동일 페이지에 대해 figma-plan과 figma-reference-plan을 동시에 사용하지 않는다.
참조 코드가 없으면 figma-plan, 있으면 figma-reference-plan.
