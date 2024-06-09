import hotkeys from 'hotkeys-js';
import { ctx, resetState } from '../context.ts';
import { doAttack, doMove, markCanvasDirty } from './canvas.ts';
import { submitActions } from './submit.ts';
import { updateActionsSummary, updateStateSummary } from './summaries.ts';

export function initShortcuts(): void {
  hotkeys('A', () => {
    doAttack();
  });

  hotkeys('S', () => {
    doMove();
    doAttack();
  });

  hotkeys('D', () => {
    doMove();
  });

  hotkeys('G', () => {
    submitActions();
  });

  hotkeys('J', () => {
    if (ctx.actions.length === 0) {
      return;
    }

    const amount = parseInt(document.querySelector<HTMLInputElement>('#delete-last')!.value);
    ctx.actions = ctx.actions.slice(0, -amount);

    resetState();
    markCanvasDirty();
    updateActionsSummary();
    updateStateSummary();
  });

  hotkeys('L', () => {
    if (ctx.actions.length === 0) {
      return;
    }

    const data = JSON.stringify({ moves: ctx.actions.map(action => action.toJson()) });
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${ctx.test !== null ? `${ctx.test.id}` : 'submission'}.json`);
    link.click();
  });
}
