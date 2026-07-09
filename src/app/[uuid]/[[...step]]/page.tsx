import { notFound } from "next/navigation";
import BundleBuilder from "@/src/components/BundleBuilder";
import type { Step } from "@/src/types";

const STEP_SEGMENTS: Step[] = ["hotels", "routes", "bundle"];

export default async function BundlePage({
  params,
}: {
  params: Promise<{ uuid: string; step?: string[] }>;
}) {
  
  const { uuid, step } = await params;

  let current: Step;
  if (!step || step.length === 0) {
    current = "home";
  } else if (step.length === 1 && STEP_SEGMENTS.includes(step[0] as Step)) {
    current = step[0] as Step;
  } else {
    notFound();
  }

  return <BundleBuilder uuid={uuid} step={current} />;
}
