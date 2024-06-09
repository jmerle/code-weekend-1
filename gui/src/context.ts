import { Action, State } from './core/solution.ts';
import { Test } from './core/test.ts';

interface Context {
  test: Test | null;
  actions: Action[];
  state: State | null;
}

export const ctx: Context = {
  test: null,
  actions: [],
  state: null,
};

export function resetState(): void {
  if (ctx.test === null) {
    ctx.state = null;
    return;
  }

  ctx.state = new State(ctx.test);

  for (const action of ctx.actions) {
    action.apply(ctx.state);
  }
}
