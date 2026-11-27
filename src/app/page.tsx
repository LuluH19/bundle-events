import type { Metadata } from "next";
import BundleBuilder from "@/src/components/BundleBuilder";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function Home() {
  return <BundleBuilder step="home" />;
}
