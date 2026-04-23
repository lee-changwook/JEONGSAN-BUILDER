import { Equal, Percent, Plus, Sparkles, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { OpId } from "@/features/jeongsan-builder/calculator";

export interface OpOption {
  id: OpId;
  label: string;
  /** 드롭다운 등 텍스트-only 컨텍스트에서 label 앞에 prepend하는 유니코드 심볼. */
  symbol: string;
  /** 리치 pill UI에서 label 좌측에 렌더되는 lucide 아이콘. */
  Icon: LucideIcon;
  hint: string;
  needsAux: boolean;
  auxLabel?: string;
  auxPlaceholder?: string;
}

/**
 * 항목 수식(op) 선택지. 단일 추가 폼과 일괄(bulk) 폼이 동일 소스를 공유.
 */
export const OP_OPTIONS: OpOption[] = [
  {
    id: "rate",
    label: "비율",
    symbol: "%",
    Icon: Percent,
    hint: "베이스 × 비율",
    needsAux: true,
    auxLabel: "비율",
    auxPlaceholder: "0 ~ 1 (예: 0.6)",
  },
  {
    id: "fixed",
    label: "고정",
    symbol: "=",
    Icon: Equal,
    hint: "베이스 값 그대로",
    needsAux: false,
  },
  {
    id: "multiply",
    label: "곱하기",
    symbol: "×",
    Icon: X,
    hint: "베이스 × 숫자",
    needsAux: true,
    auxLabel: "배수",
    auxPlaceholder: "숫자 (예: 45000)",
  },
  {
    id: "add",
    label: "더하기",
    symbol: "+",
    Icon: Plus,
    hint: "베이스 + 숫자",
    needsAux: true,
    auxLabel: "가감값",
    auxPlaceholder: "음수 가능",
  },
  {
    id: "custom",
    label: "커스텀",
    symbol: "ƒ",
    Icon: Sparkles,
    hint: "복합 수식 (데모)",
    needsAux: false,
  },
];
