# Slide Type Guide

각 슬라이드 타입별 HTML 구조 패턴이다. TEMPLATE.html의 CSS 클래스를 사용하며, 내용만 프로젝트에 맞게 교체한다.

## 공통 규칙

모든 슬라이드는 `<div class="slide">` 안에 들어간다.
- 첫 번째 슬라이드에만 `class="slide active"` 부여
- 다크 배경: `style="background: #0f0f1a; padding: 40px 48px"`
- 라이트 배경: 기본 (추가 스타일 불필요) 또는 `style="background: var(--bg)"`
- 모든 슬라이드 하단에 `<div class="slide-number">N / TOTAL</div>`
- 다크 슬라이드의 slide-number에는 `style="color: #bbb"` 추가

---

## 1. Cover (표지)

라이트 배경. 왼쪽에 프로젝트명+태그라인, 오른쪽에 KPI 티저.

```html
<div class="slide active" style="background: var(--bg)">
  <div class="accent-bar" style="background: var(--blue)"></div>
  <div style="flex: 1; display: flex; align-items: center">
    <!-- 왼쪽: 프로젝트 정보 -->
    <div style="flex: 1">
      <div style="font-size: 38px; font-weight: 800; color: var(--blue); letter-spacing: -1px; margin-bottom: 4px">
        {{상위_브랜드명}}
      </div>
      <div class="slide-title" style="font-size: 36px">:{{프로젝트명}}</div>
      <div class="slide-subtitle" style="margin-top: 12px">{{태그라인}}</div>
      <div style="margin-top: 24px; display: flex; gap: 8px">
        <span class="pill blue-fill">{{발표자}} PT</span>
        <span class="pill blue">{{날짜 정보}}</span>
      </div>
    </div>
    <!-- 오른쪽: KPI 티저 (2~3개) -->
    <div style="display: flex; flex-direction: column; gap: 10px; opacity: 0.7">
      <!-- KPI 아이템 반복 -->
      <div style="display: flex; align-items: center; gap: 8px">
        <div style="width: 3px; height: 28px; background: var(--blue); border-radius: 2px"></div>
        <div>
          <div style="font-size: 10px; color: var(--gray); font-weight: 500">{{KPI_라벨}}</div>
          <div class="mono" style="font-size: 14px; font-weight: 700; color: var(--dark)">{{KPI_값}}</div>
        </div>
      </div>
    </div>
  </div>
  <div class="slide-number">1 / {{TOTAL}}</div>
</div>
```

---

## 2. Dark Flow (다크 배경 흐름도)

어두운 배경에 네온 컬러로 단계별 프로세스를 보여준다. 현재 프로세스(AS-IS) 또는 솔루션 플로우(TO-BE) 모두에 사용.

**네온 컬러 팔레트** (다크 슬라이드 전용):
- 초록: `#4ade80` — 데이터/소스/자동화
- 핑크: `#f472b6` — 수동작업/페인포인트/핵심기능
- 시안: `#22d3ee` — 시스템/디지털
- 옐로: `#facc15` — 비용/시간/산출물

```html
<div class="slide" style="background: #0f0f1a; padding: 40px 48px">
  <div class="slide-label" style="color: #bbb">{{SECTION_LABEL}}</div>
  <div class="slide-title" style="font-size: 24px; color: #e0e0e0; margin-bottom: 20px">
    {{제목}}
  </div>
  <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 12px">

    <!-- 데이터 소스 행: 카드 가로 배열 -->
    <div style="display: flex; gap: 10px; align-items: stretch">
      <div style="flex: 1; background: #1a1a2e; border: 1px solid #2a2a4a; border-radius: 10px; padding: 14px 16px; text-align: center">
        <div style="font-size: 18px; margin-bottom: 4px">{{이모지}}</div>
        <div style="font-size: 12px; font-weight: 700; color: {{네온색}}">{{카드명}}</div>
        <div style="font-size: 9px; color: #bbb; margin-top: 2px">{{부가설명}}</div>
      </div>
      <!-- 추가 카드 반복... -->
    </div>

    <!-- 화살표 구분선 -->
    <div style="text-align: center; color: {{네온색}}; font-size: 14px; line-height: 1">▼ ▼ ▼</div>

    <!-- 프로세스 스텝 박스 (그라데이션 배경 + 네온 테두리) -->
    <div style="background: linear-gradient(135deg, #1a0a0a, #2a1020); border: 1.5px solid {{네온색}}; border-radius: 10px; padding: 16px 20px">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px">
        <span style="background: {{네온색}}; color: #0f0f1a; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 12px">
          STEP {{N}} · {{담당자}}
        </span>
        <span style="font-size: 14px; font-weight: 700; color: {{네온색}}">{{스텝명}}</span>
        <span style="font-size: 10px; color: {{네온색}}; opacity: 0.7; margin-left: auto">{{소요시간}}</span>
      </div>
      <!-- 세부 설명 카드 (가로 배열) -->
      <div style="display: flex; gap: 12px; font-size: 10px; color: #d4d4d4">
        <div style="flex: 1; background: rgba({{네온RGB}}, 0.08); border-radius: 6px; padding: 8px 10px">
          {{설명1}}
        </div>
        <!-- 추가 설명 반복... -->
      </div>
    </div>

    <!-- 산출물/결과 (하단) -->
    <div style="display: flex; gap: 10px; align-items: center; justify-content: center">
      <div style="background: #1a1a2e; border: 1px dashed {{네온색}}; border-radius: 8px; padding: 8px 16px; text-align: center">
        <div style="font-size: 10px; color: {{네온색}}; font-weight: 600">{{결과라벨}}</div>
        <div style="font-size: 9px; color: #bbb; margin-top: 2px">{{결과설명}}</div>
      </div>
    </div>

  </div>
  <div class="slide-number" style="color: #bbb">{{N}} / {{TOTAL}}</div>
</div>
```

**그라데이션 배경색 규칙** (스텝 박스):
- 네온색이 핑크(#f472b6)면: `linear-gradient(135deg, #1a0a0a, #2a1020)`
- 네온색이 초록(#4ade80)면: `linear-gradient(135deg, #0a1a0a, #0a2010)`
- 네온색이 옐로(#facc15)면: `linear-gradient(135deg, #0a0a1a, #0a1a2a)`
- 네온색이 시안(#22d3ee)면: `linear-gradient(135deg, #0a0a1a, #100a20)`

---

## 3. Comparison (AS-IS vs TO-BE)

라이트 배경. 좌우 2열로 문제(빨강 계열)와 해결(파랑 계열)을 대비.

```html
<div class="slide">
  <div class="slide-label">PROBLEM</div>
  <div class="slide-title" style="font-size: 26px; margin-bottom: 20px">{{제목}}</div>
  <div class="two-col" style="gap: 20px">

    <!-- 왼쪽: AS-IS -->
    <div style="background: var(--red10); border-radius: 10px; padding: 20px">
      <div style="font-size: 15px; font-weight: 700; color: var(--red); margin-bottom: 16px">
        AS-IS ({{기존시스템명}})
      </div>
      <div style="display: flex; flex-direction: column; gap: 14px">
        <!-- 문제점 항목 반복 -->
        <div>
          <div style="font-size: 12px; font-weight: 600; color: var(--dark)">{{N}}. {{문제_제목}}</div>
          <div style="font-size: 10px; color: var(--gray); margin-top: 2px">{{문제_설명}}</div>
        </div>
      </div>
    </div>

    <!-- 오른쪽: TO-BE -->
    <div style="background: var(--blue100); border-radius: 10px; padding: 20px">
      <div style="font-size: 15px; font-weight: 700; color: var(--blue); margin-bottom: 16px">
        TO-BE ({{새시스템명}})
      </div>
      <div style="display: flex; flex-direction: column; gap: 14px">
        <!-- 해결책 항목 반복 -->
        <div>
          <div style="font-size: 12px; font-weight: 600; color: var(--dark)">{{N}}. {{해결_제목}}</div>
          <div style="font-size: 10px; color: var(--gray); margin-top: 2px">{{해결_설명}}</div>
        </div>
      </div>
    </div>

  </div>
  <div class="slide-number">{{N}} / {{TOTAL}}</div>
</div>
```

---

## 4. Kick (핵심 포인트 상세)

라이트 배경. 상단에 pill 뱃지 + 제목 + 설명, 중간에 KPI 카드 또는 데이터 테이블.
개발이면 기능 데모, 디자인이면 시안 쇼케이스, 기획이면 전략 포인트 등 역할에 따라 내용이 달라진다.

```html
<div class="slide">
  <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px">
    <span class="pill {{색상}}-fill">KICK {{N}}</span>
    <div class="slide-title" style="font-size: 24px">{{기능명}}</div>
  </div>
  <div class="slide-subtitle" style="margin-bottom: 16px; font-size: 13px">
    "{{한 줄 인용 또는 설명}}"
  </div>

  <!-- KPI 카드 행 (선택) -->
  <div class="kpi-row" style="grid-template-columns: repeat({{N}}, 1fr); margin-bottom: 14px">
    <div class="kpi-card">
      <div class="label"><span class="dot" style="background: var(--blue)"></span>{{지표명}}</div>
      <div class="value">{{값}}</div>
    </div>
    <!-- 추가 KPI 카드 반복... -->
  </div>

  <!-- 데이터 테이블 (선택) -->
  <div style="border: 1px solid var(--border); border-radius: 10px; overflow: hidden; flex: 1">
    <table class="mini-table">
      <thead>
        <tr>
          <th>{{컬럼1}}</th>
          <th>{{컬럼2}}</th>
          <th class="right">{{컬럼3}}</th>
          <!-- 추가 컬럼... -->
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>{{데이터}}</td>
          <td>{{데이터}}</td>
          <td class="right mono">{{숫자}}</td>
        </tr>
        <!-- 강조 행: 배경색 변경 -->
        <tr style="background: #fff5f5">
          <td style="font-weight: 600">{{강조데이터}}</td>
          <td>{{데이터}}</td>
          <td class="right mono" style="color: var(--red); font-weight: 700">{{차이값}}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="slide-number">{{N}} / {{TOTAL}}</div>
</div>
```

**KICK pill 색상**: KICK 1 = `red-fill`, KICK 2 = `blue-fill`, KICK 3 = `purple-fill` (관례, 변경 가능)

---

## 5. Split (접근 방식 + 일정)

라이트 배경. 2열 레이아웃 + 하단 강조 배너.
왼쪽/오른쪽 영역의 주제는 역할에 따라 자유롭게: 아키텍처+로드맵, 디자인시스템+컴포넌트, 사업전략+마일스톤, 리서치인사이트+액션플랜 등.

```html
<div class="slide">
  <div class="slide-label">{{SECTION_LABEL}}</div>
  <div class="slide-title" style="font-size: 26px; margin-bottom: 20px">{{제목}}</div>
  <div class="two-col" style="gap: 20px; margin-bottom: 20px">

    <!-- 왼쪽: 아키텍처 -->
    <div style="background: var(--surface-alt); border-radius: 10px; padding: 18px">
      <div style="font-size: 13px; font-weight: 700; margin-bottom: 12px">{{아키텍처_제목}}</div>
      <div style="display: flex; flex-direction: column; gap: 7px; font-size: 11px; color: var(--dark)">
        <div>▸ {{항목}} <span class="mono" style="color: var(--gray)">{{보조설명}}</span></div>
        <!-- 추가 항목 반복... -->
      </div>
    </div>

    <!-- 오른쪽: 로드맵 -->
    <div style="background: var(--surface-alt); border-radius: 10px; padding: 18px">
      <div style="font-size: 13px; font-weight: 700; margin-bottom: 12px">{{로드맵_제목}}</div>
      <div style="display: flex; flex-direction: column; gap: 10px">
        <div style="display: flex; align-items: center; gap: 8px">
          <span class="pill blue-fill" style="font-size: 9px; min-width: 55px; justify-content: center">{{Phase명}}</span>
          <span style="font-size: 11px">{{Phase설명}}</span>
        </div>
        <!-- 추가 Phase 반복... -->
      </div>
    </div>

  </div>

  <!-- 하단 강조 배너 -->
  <div style="background: var(--blue); border-radius: 10px; padding: 18px 24px; color: #fff">
    <div style="font-size: 16px; font-weight: 700; margin-bottom: 6px">{{슬로건_제목}}</div>
    <div style="font-size: 13px; line-height: 1.6; opacity: 0.95">{{슬로건_본문}}</div>
  </div>
  <div class="slide-number">{{N}} / {{TOTAL}}</div>
</div>
```

---

## 6. Closing (마무리)

다크 배경. 중앙 정렬. KPI 요약 카드 + 핵심 메시지.

```html
<div class="slide" style="background: #0f0f1a; padding: 48px 56px; justify-content: center; align-items: center">
  <div style="text-align: center; max-width: 700px">
    <div style="font-size: 13px; color: #4ade80; font-weight: 600; letter-spacing: 2px; margin-bottom: 16px">
      SUMMARY
    </div>
    <div style="font-size: 28px; font-weight: 800; color: #e0e0e0; line-height: 1.4; margin-bottom: 32px">
      {{메인_메시지_라인1}}<br>
      <span style="color: #4ade80">{{메인_메시지_강조}}</span>
    </div>

    <!-- KPI 요약 카드 (가로 배열) -->
    <div style="display: flex; gap: 12px; justify-content: center; margin-bottom: 32px">
      <div style="background: #1a1a2e; border: 1px solid {{네온색}}; border-radius: 10px; padding: 16px 20px; text-align: center; min-width: 140px">
        <div style="font-size: 24px; font-weight: 800; color: {{네온색}}; font-family: var(--font-mono)">
          {{KPI_값}}
        </div>
        <div style="font-size: 10px; color: #bbb; margin-top: 4px">{{KPI_라벨}}</div>
      </div>
      <!-- 추가 KPI 반복... -->
    </div>

    <div style="font-size: 12px; color: #bbb; line-height: 1.6">{{보조_메시지}}</div>
    <div style="margin-top: 36px; font-size: 22px; font-weight: 800; letter-spacing: -0.5px">
      <span style="color: var(--blue)">{{브랜드}}</span>
      <span style="color: #bbb">{{접속사}}</span>
      <span style="color: #4ade80">{{가치}}</span>
    </div>
  </div>
  <div class="slide-number" style="color: #bbb">{{N}} / {{TOTAL}}</div>
</div>
```

---

## 7. Data Detail (데이터 상세 — 확장 타입)

SETTLA 원본의 Slide 7(강사 급여)처럼 사이드바 + 테이블 + 요약 등 데이터가 많은 슬라이드.

```html
<div class="slide">
  <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px">
    <span class="pill {{색상}}-fill">KICK {{N}}</span>
    <div class="slide-title" style="font-size: 24px">{{기능명}}</div>
  </div>
  <div class="slide-subtitle" style="margin-bottom: 10px; font-size: 13px">"{{설명}}"</div>

  <div style="display: grid; grid-template-columns: 150px 1fr; gap: 12px; flex: 1">

    <!-- 사이드바: 목록 -->
    <div style="background: var(--surface-alt); border-radius: 8px; padding: 10px">
      <div style="font-size: 9px; color: var(--gray); margin-bottom: 8px; font-weight: 600">
        {{목록_제목}} ({{개수}})
      </div>
      <!-- 선택된 항목 -->
      <div style="background: var(--blue100); border: 1px solid rgba(95,131,255,0.2); border-radius: 6px; padding: 8px; margin-bottom: 5px">
        <div style="font-size: 12px; font-weight: 700; color: var(--blue)">{{선택된_이름}}</div>
        <div style="font-size: 9px; color: var(--gray)">{{선택된_부가정보}}</div>
      </div>
      <!-- 일반 항목 반복 -->
      <div style="padding: 5px 8px; margin-bottom: 3px">
        <div style="font-size: 11px; font-weight: 600">{{이름}}</div>
        <div style="font-size: 9px; color: var(--gray)">{{부가정보}}</div>
      </div>
    </div>

    <!-- 메인 영역 -->
    <div>
      <!-- 상세 테이블, 요약 등 자유 배치 -->
    </div>

  </div>
  <div class="slide-number">{{N}} / {{TOTAL}}</div>
</div>
```

---

## 8. Workflow Steps (워크플로우 단계)

라이트 배경. 가로로 이어지는 단계별 흐름 + 하단 키포인트.

SETTLA 원본의 Slide 6(Pay 문서)에서 사용한 패턴. 단계가 가로로 이어지는 플로우 + 하단에 핵심 포인트 카드.

```html
<!-- 가로 플로우 -->
<div style="display: flex; align-items: center; gap: 0">
  <div style="flex: 1; border: 1px solid var(--border); border-radius: 8px 0 0 8px; padding: 10px 12px; text-align: center; background: var(--surface)">
    <div style="font-size: 10px; font-weight: 700; color: var(--dark); margin-bottom: 2px">{{단계1}}</div>
    <div style="font-size: 8px; color: var(--gray); line-height: 1.4">{{설명1}}</div>
  </div>
  <div style="padding: 0 6px; color: var(--gray); font-size: 12px; background: var(--surface-alt)">&#x2192;</div>
  <div style="flex: 1; border: 1px solid var(--blue200); background: var(--blue100); padding: 10px 12px; text-align: center">
    <div style="font-size: 10px; font-weight: 700; color: var(--blue); margin-bottom: 2px">{{단계2}}</div>
    <div style="font-size: 8px; color: var(--gray); line-height: 1.4">{{설명2}}</div>
  </div>
  <div style="padding: 0 6px; color: var(--gray); font-size: 12px; background: var(--surface-alt)">&#x2192;</div>
  <div style="flex: 1; border: 1.5px solid var(--blue); border-radius: 0 8px 8px 0; padding: 10px 12px; text-align: center; background: var(--surface)">
    <div style="font-size: 10px; font-weight: 700; color: var(--blue); margin-bottom: 2px">{{단계3}}</div>
    <div style="font-size: 8px; color: var(--gray); line-height: 1.4">{{설명3}}</div>
  </div>
</div>

<!-- 하단 키포인트 카드 (가로 배열) -->
<div style="display: flex; gap: 6px">
  <div style="flex: 1; background: var(--surface-alt); border-radius: 8px; padding: 8px 10px; border-left: 3px solid var(--blue)">
    <div style="font-size: 9px; font-weight: 700; color: var(--dark); margin-bottom: 2px">{{포인트_제목}}</div>
    <div style="font-size: 8px; color: var(--gray); line-height: 1.4">{{포인트_설명}}</div>
  </div>
  <!-- 추가 키포인트 반복... -->
</div>
```

---

## 9. Showcase (비주얼 쇼케이스)

라이트 배경. 디자인 시안, 스크린샷, 목업 등 비주얼을 크게 보여주는 슬라이드.
이미지 없이도 CSS로 구성된 목업(엑셀 모양, 앱 UI 모양 등)으로 표현할 수 있다.

```html
<div class="slide">
  <div class="slide-label">{{SECTION_LABEL}}</div>
  <div class="slide-title" style="font-size: 24px; margin-bottom: 4px">{{제목}}</div>
  <div class="slide-subtitle" style="margin-bottom: 16px; font-size: 12px">{{설명}}</div>

  <div style="flex: 1; display: flex; gap: 16px; align-items: stretch">

    <!-- 시안 카드 (반복) -->
    <div style="flex: 1; background: var(--surface-alt); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; display: flex; flex-direction: column">
      <!-- 카드 상단: 라벨 -->
      <div style="padding: 10px 14px; border-bottom: 1px solid var(--border); background: var(--surface)">
        <div style="font-size: 11px; font-weight: 700; color: var(--dark)">{{시안_이름}}</div>
        <div style="font-size: 9px; color: var(--gray); margin-top: 2px">{{시안_설명}}</div>
      </div>
      <!-- 카드 본문: 비주얼 영역 -->
      <div style="flex: 1; padding: 12px; display: flex; align-items: center; justify-content: center">
        <!-- CSS 목업, 테이블, 차트 등 자유 배치 -->
        <div style="font-size: 10px; color: var(--gray); text-align: center">
          {{비주얼_내용}}
        </div>
      </div>
      <!-- 카드 하단: 변경점/개선점 (선택) -->
      <div style="padding: 8px 14px; background: var(--blue100); font-size: 9px; color: var(--blue); font-weight: 600">
        {{개선_포인트}}
      </div>
    </div>

  </div>
  <div class="slide-number">{{N}} / {{TOTAL}}</div>
</div>
```

---

## 10. Journey (사용자 여정 / 타임라인)

라이트 배경. 가로 타임라인 형태로 사용자 경험이나 프로젝트 단계를 보여준다.

```html
<div class="slide">
  <div class="slide-label">{{SECTION_LABEL}}</div>
  <div class="slide-title" style="font-size: 24px; margin-bottom: 20px">{{제목}}</div>

  <div style="flex: 1; display: flex; flex-direction: column; justify-content: center">

    <!-- 타임라인 바 -->
    <div style="position: relative; display: flex; align-items: center; margin-bottom: 24px">
      <div style="position: absolute; top: 50%; left: 24px; right: 24px; height: 2px; background: var(--border)"></div>

      <!-- 타임라인 노드 (반복) -->
      <div style="flex: 1; text-align: center; position: relative; z-index: 1">
        <div style="width: 32px; height: 32px; border-radius: 50%; background: {{색상}}; color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; margin-bottom: 8px">
          {{번호}}
        </div>
        <div style="font-size: 11px; font-weight: 700; color: var(--dark)">{{단계명}}</div>
        <div style="font-size: 9px; color: var(--gray); margin-top: 2px">{{부가설명}}</div>
      </div>
    </div>

    <!-- 단계별 상세 카드 (가로 배열) -->
    <div style="display: flex; gap: 10px">
      <div style="flex: 1; background: var(--surface-alt); border-radius: 8px; padding: 12px; border-top: 3px solid {{색상}}">
        <div style="font-size: 10px; font-weight: 700; color: var(--dark); margin-bottom: 4px">{{단계_제목}}</div>
        <div style="font-size: 9px; color: var(--gray); line-height: 1.5">{{단계_설명}}</div>
      </div>
      <!-- 추가 단계 반복... -->
    </div>

  </div>
  <div class="slide-number">{{N}} / {{TOTAL}}</div>
</div>
```

---

## 11. Stat Grid (데이터 그리드)

라이트 배경. 리서치 결과, 설문 데이터, 시장 분석 등 수치를 그리드로 보여주는 슬라이드.

```html
<div class="slide">
  <div class="slide-label">{{SECTION_LABEL}}</div>
  <div class="slide-title" style="font-size: 24px; margin-bottom: 6px">{{제목}}</div>
  <div class="slide-subtitle" style="margin-bottom: 16px; font-size: 12px">{{설명}}</div>

  <div style="display: grid; grid-template-columns: repeat({{컬럼수}}, 1fr); gap: 12px; flex: 1; align-content: start">
    <!-- 데이터 카드 (반복) -->
    <div class="kpi-card">
      <div class="label"><span class="dot" style="background: {{색상}}"></span>{{지표명}}</div>
      <div class="value" style="color: {{색상}}">{{값}}</div>
      <div class="sub">{{보조설명}}</div>
    </div>
  </div>

  <!-- 하단 인사이트 (선택) -->
  <div style="background: var(--surface-alt); border-radius: 8px; padding: 12px 16px; margin-top: 12px">
    <div style="font-size: 10px; color: var(--dark); line-height: 1.6">
      💡 <strong>{{인사이트_제목}}</strong> — {{인사이트_내용}}
    </div>
  </div>
  <div class="slide-number">{{N}} / {{TOTAL}}</div>
</div>
```

---

## 커스텀 팁

- **슬라이드 내 정보가 부족하면**: 여백을 넓히고 폰트 크기를 키워서 시원하게
- **정보가 많으면**: 폰트 크기를 줄이고 (최소 8px), 패딩을 타이트하게
- **색상 커스텀**: `:root`의 CSS 변수를 교체하면 전체 톤이 바뀜
- **새로운 슬라이드 타입**: 위 패턴들을 조합하거나, 원본 HTML의 다른 슬라이드 구조를 참고
- **pill 뱃지 변형**: `.pill.blue`, `.pill.red`, `.pill.success`, `.pill.warning`, `.pill.dark`, `.pill.blue-fill`, `.pill.red-fill`, `.pill.purple-fill` 사용 가능
