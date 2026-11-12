"use client";

import { Fragment } from "react";
import type { Step } from "@/src/types";
import { STEPS } from "@/src/types";
import { IconCheck } from "@/src/components/ui";

interface StepsProps {
  current: Step;
  onGo: (s: Step) => void;
  subtitles?: Partial<Record<Step, string>>;
}

function stateOf(index: number, currentIndex: number) {
  if (index < currentIndex) return "done";
  if (index === currentIndex) return "current";
  return "todo";
}

function Dot({ state, n }: { state: string; n: number }) {
  return (
    <span
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[12px] font-bold ring-[1.5px] ring-inset ${
        state === "done"
          ? "bg-ok text-white ring-ok"
          : state === "current"
            ? "bg-ink text-white ring-ink"
            : "bg-white text-slate-500 ring-line"
      }`}
    >
      {state === "done" ? <IconCheck size={13} /> : n}
    </span>
  );
}

export function StepsInline({ current, onGo }: StepsProps) {
  const currentIndex = STEPS.findIndex((s) => s.id === current);
  return (
    <nav aria-label="Progression" className="flex items-center gap-2 text-[13px] font-semibold">
      {STEPS.map((s, i) => {
        const state = stateOf(i, currentIndex);
        const content = (
          <>
            <Dot state={state} n={i + 1} />
            <span className={state === "todo" ? "text-slate-400" : "text-ink"}>{s.label}</span>
          </>
        );
        return (
          <Fragment key={s.id}>
            {i > 0 && <span className={`h-0.5 min-w-3 flex-1 rounded ${i <= currentIndex ? "bg-ok" : "bg-line"}`} />}
            {state === "done" ? (
              <button type="button" onClick={() => onGo(s.id)} className="flex items-center gap-1.5">
                {content}
              </button>
            ) : (
              <span className="flex items-center gap-1.5" aria-current={state === "current" ? "step" : undefined}>
                {content}
              </span>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}

export function StepsColumn({ current, onGo, subtitles = {} }: StepsProps) {
  const currentIndex = STEPS.findIndex((s) => s.id === current);
  return (
    <nav aria-label="Progression" className="rounded-2xl bg-white p-4 ring-1 ring-line">
      <ol className="flex flex-col">
        {STEPS.map((s, i) => {
          const state = stateOf(i, currentIndex);
          const inner = (
            <span className="grid grid-cols-[24px_1fr] items-start gap-3 text-left">
              <Dot state={state} n={i + 1} />
              <span className="grid gap-0.5">
                <span className={`text-[15px] font-bold ${state === "todo" ? "text-slate-400" : "text-ink"}`}>{s.label}</span>
                {subtitles[s.id] && <span className="text-[12px] text-slate-500">{subtitles[s.id]}</span>}
              </span>
            </span>
          );
          return (
            <li key={s.id} className="relative pb-4 last:pb-0">
              {i < STEPS.length - 1 && (
                <span className={`absolute left-[11px] top-7 bottom-1 w-0.5 rounded ${i < currentIndex ? "bg-ok" : "bg-line"}`} />
              )}
              {state === "done" ? (
                <button type="button" onClick={() => onGo(s.id)} className="w-full">
                  {inner}
                </button>
              ) : (
                <span aria-current={state === "current" ? "step" : undefined}>{inner}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
