# dev로 PR 생성

인자: $ARGUMENTS
형식: `[prefix] 커밋 메시지 | base 브랜치 (기본값: dev)`
예시: `/pr [feat] 검색 필터 추가`, `/pr [fix] 버튼 스타일 수정`

## 워크플로우

1. `$ARGUMENTS`를 `|` 기준으로 파싱하여 `[prefix] 커밋 메시지`와 base 브랜치를 분리한다 (base 브랜치 없으면 `dev`)
2. `git status`와 `git diff`로 현재 변경사항을 확인한다
3. 커밋되지 않은 변경사항이 있으면 `[prefix] 커밋 메시지` 형식으로 커밋한다
4. 현재 브랜치를 remote에 push한다 (`-u` 플래그 사용)
5. base 브랜치로 PR을 생성한다:
   - PR 제목: `[prefix] 커밋 메시지`
   - PR 본문:
     ```
     ## Summary
     {변경사항 분석 기반 요약}
     ```

## 주의사항

- 스킬은 사용하지 않는다
- 현재 브랜치가 `main` 또는 `dev`이면 중단하고 경고한다
- 이미 PR이 존재하면 알려준다
