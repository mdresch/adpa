import NovelEditor from "@/components/editor/novel-editor";

export default function NovelTestPage() {
  return (
    <div className="flex min-h-screen flex-col items-center p-24">
      <h1 className="mb-8 text-4xl font-bold">Novel Editor Integration Verification</h1>
      <NovelEditor />
    </div>
  );
}
