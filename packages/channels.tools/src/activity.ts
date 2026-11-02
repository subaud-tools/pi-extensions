// Whether this session is working, for the `activity` report: a turn is
// running (pi's agent_start until agent_settled) or a background agent is
// (@tintinweb/pi-subagents' subagents:started, by id, until its
// subagents:completed or subagents:failed). onChange fires only when that
// combined answer changes.
export type Activity = {
  working(): boolean;
  turnStarted(): void;
  turnSettled(): void;
  backgroundStarted(data: unknown): void;
  backgroundEnded(data: unknown): void;
};

export function createActivity(onChange: (working: boolean) => void): Activity {
  let turn = false;
  const background = new Set<string>();
  const working = (): boolean => turn || background.size > 0;

  function change(apply: () => void): void {
    const before = working();
    apply();
    const after = working();
    if (after !== before) onChange(after);
  }

  // The subagent events carry { id, type, description }; one without a string
  // id cannot be matched to its end, so it is not counted.
  const idOf = (data: unknown): string | undefined => {
    const id = (data as { id?: unknown } | null)?.id;
    return typeof id === "string" ? id : undefined;
  };

  return {
    working,
    turnStarted: () => change(() => { turn = true; }),
    turnSettled: () => change(() => { turn = false; }),
    backgroundStarted: (data) => change(() => {
      const id = idOf(data);
      if (id !== undefined) background.add(id);
    }),
    backgroundEnded: (data) => change(() => {
      const id = idOf(data);
      if (id !== undefined) background.delete(id);
    }),
  };
}
