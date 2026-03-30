# 티키타 FE TEAM Claude Code

## Overview

팀원들의 생산성 증가를 목표로 한 클로드 코드 하네스 공유입니다.<br>
하네스 카테고리는 아래와 같이 운영되면 좋을 것 같습니다.

- 공유 카테고리: agents/commands/references/researches/rules/skills
  - references: 에이전트를 위한 컨텍스트를 저장하는 참조 문서 스토리지입니다.
  - researches: 개발자를 위한 연구, 분석 결과를 저장하는 문서 스토리지입니다.
- 개인 카테고리: plans

## 등록된 하네스 리스트

### 🤖 서브 에이전트

| 이름                                                      | 설명                              | 모델    | 모드        |
| --------------------------------------------------------- | --------------------------------- | ------- | ----------- |
| [security-verifier](#security-verifier)                   | 보안 패턴 read-only 검증          | Sonnet  | plan        |
| [performance-verifier](#performance-verifier)             | 성능 패턴 read-only 검증          | Sonnet  | plan        |
| [a11y-verifier](#a11y-verifier)                           | 웹 접근성 read-only 검증          | Sonnet  | plan        |
| [convention-verifier](#convention-verifier)               | 코드 컨벤션 준수 여부 검증        | Sonnet  | plan        |
| [plan-verifier](#plan-verifier)                           | 계획서 대비 구현 코드 검증        | Sonnet  | plan        |
| [code-architecture-reviewer](#code-architecture-reviewer) | 아키텍처 일관성 및 코드 품질 리뷰 | Sonnet  | plan        |
| [documentation-architect](#documentation-architect)       | 문서 작성 및 업데이트             | Inherit | acceptEdits |
| [web-research-specialist](#web-research-specialist)       | 인터넷 기술 조사 및 디버깅 리서치 | Sonnet  | default     |
| [figma-analyzer](#figma-analyzer)                         | Figma 디자인 데이터 분석          | Sonnet  | plan        |

### ⚡️ 스킬: 5

| 이름                                          | 설명                                                       | 활성화 명령어           |
| --------------------------------------------- | ---------------------------------------------------------- | ----------------------- |
| [react-best-practices](#react-best-practices) | React/Next.js 성능 최적화 40+ 룰 가이드                    | `/react-best-practices` |
| [excalidraw](#excalidraw)                     | 코드베이스 분석 후 아키텍처 다이어그램(.excalidraw) 생성   | `/excalidraw`           |
| [save-context](#save-context)                 | 세션 작업 내용을 옵시디언 볼트에 저장 후 컨텍스트 초기화   | `/save-context`         |
| [figma-plan](#figma-plan)                     | Figma 디자인 분석 및 구현 계획서 작성 (처음부터 구현)      | `/figma-plan`           |
| [figma-reference-plan](#figma-reference-plan) | Figma + 참조 코드 대조 구현 계획서 작성 (기존 코드 재활용) | `/figma-reference-plan` |

### ⌨️ 커맨드: 4

| 이름                                                | 설명                                                         | 활성화 명령어              |
| --------------------------------------------------- | ------------------------------------------------------------ | -------------------------- |
| [absorb-previous-context](#absorb-previous-context) | Obsidian vault에서 이전 작업 맥락 흡수 및 재개               | `/absorb-previous-context` |
| [call-verifiers](#call-verifiers)                   | plan/convention/security/a11y/performance verifier 병렬 실행 | `/call-verifiers`          |
| [pr](#pr)                                           | PR 생성 (`[prefix] 커밋 메시지 \| base 브랜치`)              | `/pr`                      |
| [sync-dev](#sync-dev)                               | dev에서 pull, 충돌 블록 단위로 현재 변경사항 우선 적용       | `/sync-dev`                |

### 📝 룰: 2

| 이름                          | 설명                                                  |
| ----------------------------- | ----------------------------------------------------- |
| [ARCHITECTURE](#architecture) | 디렉토리 구조, 도메인 모듈, API 레이어 패턴 가이드    |
| [CODE_STYLE](#code_style)     | 코드 스타일 규칙 (Emotion, Hooks, 검증 체크리스트 등) |

---

💡 Created by lee-changwook
