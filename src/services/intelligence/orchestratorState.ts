import { setActiveToolLabel, setStreaming } from "../../store/intelligenceStore";

let pendingActionResolver: ((result: string) => void) | null = null;
let currentAbortController: AbortController | null = null;

export function createStreamAbortController(): AbortController {
  currentAbortController = new AbortController();
  return currentAbortController;
}

export function getStreamAbortSignal(): AbortSignal | undefined {
  return currentAbortController?.signal;
}

export function clearStreamAbortController(): void {
  currentAbortController = null;
}

export function stopIntelligenceStream(): void {
  if (currentAbortController) {
    currentAbortController.abort();
    currentAbortController = null;
  }
  setStreaming(false);
  setActiveToolLabel(null);
}

export function waitForPendingActionDecision(): Promise<string> {
  return new Promise((resolve) => {
    pendingActionResolver = resolve;
  });
}

export function resolvePendingAction(result: string): void {
  pendingActionResolver?.(result);
  pendingActionResolver = null;
}

export function hasPendingActionResolver(): boolean {
  return pendingActionResolver !== null;
}
