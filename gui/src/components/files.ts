import { ctx, resetState } from '../context.ts';
import { AttackAction, MoveAction } from '../core/solution.ts';
import { parseTest, Position } from '../core/test.ts';
import { markCanvasDirty } from './canvas.ts';
import { updateActionsSummary, updateStateSummary, updateTestSummary } from './summaries.ts';

function initFileSelector(id: string, onFile: (file: File, content: string) => void): void {
  const inputElem = document.querySelector<HTMLInputElement>(id)!;

  inputElem.addEventListener('change', async () => {
    if (inputElem.files?.length !== 1) {
      return;
    }

    const file = inputElem.files[0];

    try {
      const content = await file.text();
      onFile(file, content);
    } catch (err) {
      console.error(err);
      alert(`Cannot parse file: ${err}`);
    }
  });
}

function initTestSelector(): void {
  initFileSelector('#test-selector', (file, content) => {
    const id = parseInt(file.name.split('.')[0]);
    ctx.test = parseTest(id, JSON.parse(content));
    ctx.actions = [];

    resetState();
    markCanvasDirty();
    updateTestSummary();
    updateActionsSummary();
    updateStateSummary();
  });
}

function initActionsSelector(): void {
  initFileSelector('#actions-selector', (_file, content) => {
    if (ctx.test === null) {
      return;
    }

    const rawActions = JSON.parse(content).moves as any[];

    ctx.actions = [];
    for (const obj of rawActions) {
      if (obj.type === 'move') {
        ctx.actions.push(new MoveAction(new Position(obj.target_x, obj.target_y), obj.comment));
      } else {
        ctx.actions.push(new AttackAction(obj.target_id, obj.comment));
      }
    }

    resetState();
    markCanvasDirty();
    updateActionsSummary();
    updateStateSummary();
  });
}

export function initFileSelectors(): void {
  initTestSelector();
  initActionsSelector();
}
