'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

type GuideTab = 'validator' | 'paybuilder';

interface GuideModalProps {
  defaultTab?: GuideTab;
  onClose: () => void;
}

export function GuideModal({ defaultTab = 'validator', onClose }: GuideModalProps) {
  const [activeTab, setActiveTab] = useState<GuideTab>(defaultTab);

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        showCloseButton
        className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[720px] max-w-[90vw] max-h-[85vh] flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white p-0 shadow-lg sm:max-w-[720px]"
      >
        <DialogHeader className="px-6 pt-5 pb-0 flex-shrink-0">
          <DialogTitle className="text-lg font-semibold text-gray-900">
            이용 가이드
          </DialogTitle>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as GuideTab)}
          className="flex flex-col flex-1 min-h-0 gap-0"
        >
          <TabsList variant="line" className="px-6 pt-4 border-b border-gray-200 flex-shrink-0">
            <TabsTrigger value="validator">벨리데이터</TabsTrigger>
            <TabsTrigger value="paybuilder">페이빌더</TabsTrigger>
          </TabsList>

          <TabsContent value="validator" className="overflow-y-auto p-6 flex-1">
            <ValidatorGuide />
          </TabsContent>
          <TabsContent value="paybuilder" className="overflow-y-auto p-6 flex-1">
            <PaybuilderGuide />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function ImagePlaceholder({ text }: { text: string }) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden mb-2 bg-gray-50">
      <div className="w-full aspect-video flex items-center justify-center flex-col gap-2 text-gray-400 text-xs">
        <div className="w-10 h-10 rounded-md bg-gray-200 flex items-center justify-center text-gray-400">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect x="2" y="2" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="1.2" />
            <circle cx="7" cy="8" r="2" stroke="currentColor" strokeWidth="1.2" />
            <path d="M2 14l4-3 3 2 4-4 5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        {text}
      </div>
    </div>
  );
}

function StepRow({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="flex items-start mb-3 last:mb-0">
      <span className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-full bg-blue-600 text-white text-xs font-semibold shrink-0 mr-2">
        {number}
      </span>
      <div>
        <div className="text-sm text-gray-900 leading-relaxed">{title}</div>
        <div className="text-xs text-gray-500 mt-0.5">{description}</div>
      </div>
    </div>
  );
}

function TipBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-md px-3.5 py-3 text-xs text-blue-700 leading-relaxed mb-5 flex gap-2">
      <span className="shrink-0 mt-px">💡</span>
      <span>{children}</span>
    </div>
  );
}

function WarnBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-md px-3.5 py-3 text-xs text-amber-800 leading-relaxed mb-5 flex gap-2">
      <span className="shrink-0 mt-px">⚠️</span>
      <span>{children}</span>
    </div>
  );
}

function ValidatorGuide() {
  return (
    <>
      <div className="mb-8 last:mb-0">
        <div className="text-base font-semibold text-gray-900 mb-2">벨리데이터란?</div>
        <div className="text-sm text-gray-500 mb-4 leading-relaxed">
          학원의 월별 정산 데이터를 자동으로 검증하는 도구입니다.
          수강료 계산값과 실제 납입액을 대조하여 금액 불일치, 출결 이상, 학생 상태 오류 등을 탐지합니다.
        </div>
      </div>

      <div className="h-px bg-gray-200 my-6" />

      <div className="mb-8 last:mb-0">
        <div className="text-base font-semibold text-gray-900 mb-2">Step 1 — 데이터 설정</div>
        <div className="text-sm text-gray-500 mb-4 leading-relaxed">
          대조에 사용할 데이터 소스를 선택하고 검증 대상 강좌를 설정합니다.
        </div>

        <ImagePlaceholder text="Step 1 설정 화면 스크린샷" />
        <div className="text-[11px] text-gray-400 mb-5 pl-0.5">데이터 소스 선택 및 강좌 설정 화면</div>

        <StepRow
          number={1}
          title="데이터 소스 선택"
          description="티키타(내부 ERP)와 ACA2000(외부 프로그램) 중 하나를 선택합니다."
        />
        <StepRow
          number={2}
          title="강좌 및 기간 설정"
          description="티키타: 강좌 목록에서 검증할 강좌를 선택합니다. ACA2000: 엑셀 파일을 업로드하고 수업 일정, 수강료 등을 입력합니다."
        />
        <StepRow
          number={3}
          title="대조 실행"
          description='모든 필수 항목이 입력되면 "대조 실행" 버튼이 활성화됩니다.'
        />

        <TipBox>
          티키타 모드에서는 여러 강좌를 동시에 선택하여 한 번에 검증할 수 있습니다.
        </TipBox>
      </div>

      <div className="h-px bg-gray-200 my-6" />

      <div className="mb-8 last:mb-0">
        <div className="text-base font-semibold text-gray-900 mb-2">Step 2 — 대조 결과 확인</div>
        <div className="text-sm text-gray-500 mb-4 leading-relaxed">
          검증 엔진이 자동으로 분석한 결과를 확인하고 문제 항목을 처리합니다.
        </div>

        <ImagePlaceholder text="Step 2 대조 결과 화면 스크린샷" />
        <div className="text-[11px] text-gray-400 mb-5 pl-0.5">스프레드시트 + 사이드 패널 + 하단 Finding 드로어</div>

        <StepRow
          number={1}
          title="스프레드시트에서 하이라이트 확인"
          description="문제가 있는 셀은 빨간색(에러) 또는 노란색(경고)으로 표시됩니다."
        />
        <StepRow
          number={2}
          title="우측 패널에서 요약 확인"
          description="에러/경고 건수, 총 계산 금액과 납입 금액의 차이를 한눈에 볼 수 있습니다."
        />
        <StepRow
          number={3}
          title="하단 드로어에서 문제 처리"
          description='각 Finding의 상세 내용을 확인하고 "확인" 버튼으로 처리합니다.'
        />

        <TipBox>
          티키타 모드에서는 스프레드시트의 출결, 할인, 재원 컬럼을 직접 클릭하여 수정할 수 있습니다.
          수정 시 자동으로 재검증됩니다.
        </TipBox>
      </div>

      <div className="h-px bg-gray-200 my-6" />

      <div className="mb-8 last:mb-0">
        <div className="text-base font-semibold text-gray-900 mb-2">검증 규칙 안내</div>
        <div className="text-sm text-gray-500 mb-4 leading-relaxed">
          벨리데이터가 자동으로 탐지하는 주요 항목입니다.
        </div>
        <table className="w-full border-collapse mb-4 text-xs">
          <thead>
            <tr>
              <th className="text-[11px] font-semibold text-gray-500 text-left px-3 py-2 bg-gray-50 border-b border-gray-200 first:rounded-tl-md">항목</th>
              <th className="text-[11px] font-semibold text-gray-500 text-left px-3 py-2 bg-gray-50 border-b border-gray-200">심각도</th>
              <th className="text-[11px] font-semibold text-gray-500 text-left px-3 py-2 bg-gray-50 border-b border-gray-200 last:rounded-tr-md">설명</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="px-3 py-2 border-b border-gray-100 text-gray-900 text-xs align-top">금액 불일치</td>
              <td className="px-3 py-2 border-b border-gray-100 text-gray-900 text-xs align-top">에러</td>
              <td className="px-3 py-2 border-b border-gray-100 text-gray-900 text-xs align-top">계산 수강료와 실제 납입액이 다른 경우</td>
            </tr>
            <tr>
              <td className="px-3 py-2 border-b border-gray-100 text-gray-900 text-xs align-top">교재비 포함 의심</td>
              <td className="px-3 py-2 border-b border-gray-100 text-gray-900 text-xs align-top">경고</td>
              <td className="px-3 py-2 border-b border-gray-100 text-gray-900 text-xs align-top">차이가 교재비와 정확히 일치하는 경우</td>
            </tr>
            <tr>
              <td className="px-3 py-2 border-b border-gray-100 text-gray-900 text-xs align-top">할인 미적용</td>
              <td className="px-3 py-2 border-b border-gray-100 text-gray-900 text-xs align-top">에러</td>
              <td className="px-3 py-2 border-b border-gray-100 text-gray-900 text-xs align-top">할인이 설정되었지만 납입액에 반영되지 않은 경우</td>
            </tr>
            <tr>
              <td className="px-3 py-2 border-b border-gray-100 text-gray-900 text-xs align-top">납입 이상치</td>
              <td className="px-3 py-2 border-b border-gray-100 text-gray-900 text-xs align-top">경고</td>
              <td className="px-3 py-2 border-b border-gray-100 text-gray-900 text-xs align-top">다른 학생 대비 통계적으로 이상한 납입액</td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}

function PaybuilderGuide() {
  return (
    <>
      <div className="mb-8 last:mb-0">
        <div className="text-base font-semibold text-gray-900 mb-2">페이빌더란?</div>
        <div className="text-sm text-gray-500 mb-4 leading-relaxed">
          ACA 반별 출결 엑셀 파일을 기반으로 월별 강좌별매출 정산표를 자동 생성하는 도구입니다.
          전월 미납 학생의 이월 처리, 카드 수수료 계산, 레이아웃 자동 배치까지 한 번에 처리합니다.
        </div>
      </div>

      <div className="h-px bg-gray-200 my-6" />

      <div className="mb-8 last:mb-0">
        <div className="text-base font-semibold text-gray-900 mb-2">Step 1 — 파일 업로드</div>
        <div className="text-sm text-gray-500 mb-4 leading-relaxed">
          정산에 필요한 엑셀 파일들을 업로드합니다.
        </div>

        <ImagePlaceholder text="파일 업로드 화면 스크린샷" />
        <div className="text-[11px] text-gray-400 mb-5 pl-0.5">ACA 반별 출결 파일 및 전월 정산 파일 업로드</div>

        <StepRow
          number={1}
          title="ACA 반별 출결 엑셀 업로드 (필수)"
          description="ACA2000에서 다운로드한 반별 출결 파일을 하나 이상 업로드합니다."
        />
        <StepRow
          number={2}
          title="전월 정산 파일 업로드 (선택)"
          description="전월에 생성한 강좌별매출 파일을 업로드하면 미납 학생이 자동으로 이월 처리됩니다."
        />
        <StepRow
          number={3}
          title="캠퍼스 및 수수료 설정"
          description="캠퍼스명과 카드 수수료율을 확인하고 정산 대상 월을 설정합니다."
        />

        <WarnBox>
          전월 정산 파일이 없으면 미납 이월 처리가 생략됩니다.
          처음 사용하는 월이라면 이 단계를 건너뛸 수 있습니다.
        </WarnBox>
      </div>

      <div className="h-px bg-gray-200 my-6" />

      <div className="mb-8 last:mb-0">
        <div className="text-base font-semibold text-gray-900 mb-2">Step 2 — 검토 및 수정</div>
        <div className="text-sm text-gray-500 mb-4 leading-relaxed">
          파싱된 정산 데이터를 검토하고 필요한 부분을 수정합니다.
        </div>

        <ImagePlaceholder text="검토 화면 스크린샷" />
        <div className="text-[11px] text-gray-400 mb-5 pl-0.5">강좌 목록 및 학생별 상세 테이블</div>

        <StepRow
          number={1}
          title="강좌 목록 확인"
          description='좌측 패널에서 파싱된 강좌 목록을 확인합니다. "검토 필요" 표시가 있는 강좌는 특히 주의가 필요합니다.'
        />
        <StepRow
          number={2}
          title="학생별 데이터 수정"
          description="PAY 금액, 납입방법, 출석 횟수 등을 직접 수정할 수 있습니다. 미납 이월 학생은 별도 섹션으로 표시됩니다."
        />

        <TipBox>
          카드 결제 학생은 자동으로 수수료가 반영된 PAY가 계산됩니다.
          수동으로 PAY를 수정한 경우 수수료 재계산에서 제외됩니다.
        </TipBox>
      </div>

      <div className="h-px bg-gray-200 my-6" />

      <div className="mb-8 last:mb-0">
        <div className="text-base font-semibold text-gray-900 mb-2">Step 3 — 엑셀 다운로드</div>
        <div className="text-sm text-gray-500 mb-4 leading-relaxed">
          최종 확인 후 강좌별매출 정산 엑셀 파일을 다운로드합니다.
        </div>

        <StepRow
          number={1}
          title="다운로드 버튼 클릭"
          description='우상단의 "엑셀 다운로드" 버튼을 클릭하면 정산표가 생성됩니다.'
        />
        <StepRow
          number={2}
          title="생성된 파일 확인"
          description='파일에는 강좌별매출 시트와 함께 다음 달 이월을 위한 메타데이터가 포함됩니다. 이 파일을 다음 달 정산 시 "전월 정산 파일"로 업로드하면 미납 이월이 자동 처리됩니다.'
        />

        <TipBox>
          생성된 엑셀 파일을 수정하지 않고 보관하면 다음 달 정산 시 미납 이월이 정확하게 처리됩니다.
        </TipBox>
      </div>
    </>
  );
}
