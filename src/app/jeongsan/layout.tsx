import "@/jeongsan/features/components/jeongsan-globals.css";
import { JeongsanBuilderProvider } from "@/jeongsan/features/jeongsan-builder-provider";

export default function JeongsanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="jb-scope">
      <JeongsanBuilderProvider>{children}</JeongsanBuilderProvider>
    </div>
  );
}
