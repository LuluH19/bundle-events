import { JoinGroupForm } from "@/src/components/JoinGroupForm";

export default async function JoinGroupPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <JoinGroupForm token={token} />;
}
