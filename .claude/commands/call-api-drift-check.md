# API 정합성 체크

목적: API 명세(.claude/docs/apis/AKA/\*.md)와 실제 Zod 스키마(src/aca/domain/, src/domain/)의 정합성을 검증한다.
실행: `api-drift-check` 스킬의 워크플로우를 따라 실행한다.
대상: $ARGUMENTS (비어있으면 전체 aka-a ~ aka-j)
결과: `.claude/results/` 에 마크다운 문서로 저장하고 요약을 출력해야 한다.
