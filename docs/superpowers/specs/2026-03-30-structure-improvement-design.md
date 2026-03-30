# SETTLA 구조 개선 설계서

## 개요

3가지 구조 개선을 순서대로 진행한다.

1. 공유 타입 정리
2. AcaSetup.tsx 컴포넌트 분리
3. 에러 바운더리 + Suspense 추가

---

## 1. 공유 타입 정리

### 방향

- 여러 feature에서 import하는 공유 타입만 `src/types/`로 이동
- feature 내부 전용 타입(`features/*/types.ts`)은 그대로 유지
- `aca/domain/` 타입도 그대로 유지 (도메인 결합)

### 파일 구조

```
src/types/
├── index.ts          # re-export
├── settlement.ts     # FindingSeverity, FindingCategory 등 공유 타입
└── student.ts        # StudentRow 등 cross-feature 타입
```

### 작업 내용

1. `features/validator/types.ts`에서 공유 타입 식별 → `src/types/`로 이동
2. 기존 import 경로 전부 수정
3. feature 내부 전용 타입은 원래 위치에 유지

---

## 2. AcaSetup.tsx 컴포넌트 분리

### 방향

421줄 단일 파일 → 오케스트레이터 + 4개 atomic 하위 컴포넌트

### 파일 구조

```
src/features/validator/sections/Step1Setup/
├── AcaSetup.tsx              # 오케스트레이터 (~60줄): store 연결 + 레이아웃
├── CourseFeeForm.tsx          # 수강료 입력 (회차, 단가, 교재비, 총액 계산)
├── ScheduleBuilder.tsx        # 회차별 일정 (요일 버튼 + 날짜 리스트)
├── ScheduleDateItem.tsx       # 회차 한 행 (날짜 입력 + 삭제 버튼)
└── StudentListTable.tsx       # 수강생 CRUD 테이블
```

### 설계 원칙

- `AcaSetup`만 store에 접근. 하위 컴포넌트는 props로 데이터/핸들러를 받는 순수 UI
- `ScheduleDateItem`은 `ScheduleBuilder` 내부에서 반복 렌더링되는 atomic 단위
- 기존 동작/UI 변경 없음. 순수 리팩토링

---

## 3. 에러 바운더리 + Suspense

### 에러 바운더리

- `react-error-boundary` 패키지 설치
- 공용 fallback 컴포넌트 생성

```
src/components/common/ErrorFallback/index.tsx
```

- 에러 메시지 표시 + 재시도 버튼

### 적용 위치 (ErrorBoundary)

| 위치 | 감싸는 영역 | 이유 |
|------|------------|------|
| ValidatorClient | Step2Validation | 검증 실행 실패 시 입력 데이터 보존 |
| PaybuilderEditor | CourseList + StudentTable 영역 | 엑셀 파싱 실패 시 업로드 폼 보존 |
| AcaSetup | FileUpload 영역 | 엑셀 파싱 실패 격리 |

### Suspense

- 실제 async인 지점만 적용 (A안)
- 엑셀 파싱(dynamic import + 파일 읽기) 등 현재 비동기 처리가 있는 부분

### 적용 위치 (Suspense)

| 위치 | fallback | 이유 |
|------|----------|------|
| PaybuilderEditor 결과 영역 | 스켈레톤/스피너 | 엑셀 파싱 완료 대기 |
| Step2Validation | 스피너 | 검증 결과 로딩 대기 |

---

## 작업 순서

1. **타입 정리** — 의존성 기반이므로 먼저
2. **AcaSetup 분리** — 타입 import 경로 정리 후
3. **에러 바운더리 + Suspense** — 컴포넌트 구조 확정 후 감싸기

---

## 제약 사항

- 기존 동작/UI 변경 없음 (순수 리팩토링)
- CODE_STYLE.md 준수: 코드에 주석 금지, CSS는 .tsx에 작성하지 않음
- 각 단계 완료 후 `pnpm typecheck && pnpm lint` 통과 필수
