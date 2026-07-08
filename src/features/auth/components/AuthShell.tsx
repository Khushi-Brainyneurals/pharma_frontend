import type { ReactNode } from "react";
import { Pill } from 'lucide-react';

interface AuthShellProps {
  children: ReactNode;
}

export function AuthShell({ children }: AuthShellProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8 text-text">
      <div className="w-full max-w-[430px]">
        <header className="mb-6 text-center">
          <div className="mx-auto flex size-20 items-center justify-center text-sm font-bold text-subdued">
            <img src="/pharma-logo.png" alt="PharmaDoc" className="rounded-full" /> 
          </div>
          <div className="mt-3 flex items-center justify-center gap-2 text-lg font-semibold">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600">
              <svg
                aria-hidden="true"
                viewBox="0 0 64 64"
                className="h-7 w-9 text-teal-600"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g transform="rotate(-45 32 32)">
                  <rect
                    x="8"
                    y="22"
                    width="48"
                    height="22"
                    rx="10"
                    fill="white"
                  />
                  <line
                    x1="32"
                    y1="22"
                    x2="32"
                    y2="44"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                </g>
              </svg>
            </span>

            <span>PharmaDoc AI</span>
            <span className="text-subdued">· Brainy Neurals</span>
          </div>
        </header>

        {children}

        <footer className="mt-6 text-center text-xs font-semibold tracking-wide text-subdued">
          <p className="font-mono">PharmaDoc AI · v0.1.0 · build 2026-07-02</p>
          <p className="mx-auto mt-3 inline-flex items-center rounded-full border border-border bg-muted px-4 py-2 font-mono uppercase">
            ⚗ Validation Environment
          </p>
          <p className="mt-3 font-medium normal-case tracking-normal">
            Test instance — do not enter live batch data.
          </p>
        </footer>
      </div>
    </main>
  );
}
