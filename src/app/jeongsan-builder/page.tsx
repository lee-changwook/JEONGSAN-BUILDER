import type { Metadata } from "next";
import { BuilderView } from "@/features/jeongsan-builder/components/BuilderView";
import "@/features/jeongsan-builder/styles/tokens.css";

export const metadata: Metadata = {
  title: "티키타 | 정산 빌더",
};

export default function JeongsanBuilderPage() {
  return <BuilderView />;
}
