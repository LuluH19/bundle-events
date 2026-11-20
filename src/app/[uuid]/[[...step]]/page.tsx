import { notFound, redirect } from "next/navigation";
import BundleBuilder from "@/src/components/BundleBuilder";
import { STEPS, type Step } from "@/src/types";

const LEGACY_SEGMENTS: Record<string, string> = {
  hotels: "voyage",
  "routes-outbound": "voyage",
  "routes-return": "voyage",
  bundle: "reserver",
};

export default async function BundlePage({
  params,
}: {
  params: Promise<{ uuid: string; step?: string[] }>;
}) {
  const { uuid, step } = await params;

  if (!step || step.length === 0) {
    return <BundleBuilder uuid={uuid} step="home" />;
  }

  if (step.length !== 1) notFound();

  const legacy = LEGACY_SEGMENTS[step[0]];
  if (legacy) redirect(`/${uuid}/${legacy}`);

  const match = STEPS.find((s) => s.segment && s.segment === step[0]);
  if (!match) notFound();

  const current: Step = match.id;
  return <BundleBuilder uuid={uuid} step={current} />;
}
