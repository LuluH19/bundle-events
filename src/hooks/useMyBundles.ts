"use client";

import { useEffect, useState } from "react";
import type { BundleSummary } from "@/src/types";
import { fetchMyBundles } from "@/src/services/account";

interface MyBundlesState {
  bundles: BundleSummary[];
  loading: boolean;
  error: boolean;
}

export function useMyBundles(): MyBundlesState {
  const [state, setState] = useState<MyBundlesState>({ bundles: [], loading: true, error: false });

  useEffect(() => {
    let cancelled = false;
    fetchMyBundles()
      .then((bundles) => !cancelled && setState({ bundles: bundles ?? [], loading: false, error: false }))
      .catch(() => !cancelled && setState({ bundles: [], loading: false, error: true }));
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
