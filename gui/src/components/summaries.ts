import { ctx } from '../context.ts';
import { AttackAction, MoveAction } from '../core/solution.ts';

export function updateTestSummary(): void {
  const elem = document.querySelector('#test-summary')!;

  if (ctx.test === null) {
    elem.textContent = 'No test selected';
    return;
  }

  const items = [
    `Test: ${ctx.test.id}`,
    `Speed: ${ctx.test.hero.baseSpeed} (${ctx.test.hero.coeffSpeed})`,
    `Power: ${ctx.test.hero.basePower} (${ctx.test.hero.coeffPower})`,
    `Range: ${ctx.test.hero.baseRange} (${ctx.test.hero.coeffRange})`,
    `Map size: ${ctx.test.width} x ${ctx.test.height}`,
    `Start: (${ctx.test.startPosition.x}, ${ctx.test.startPosition.y})`,
    `#turns: ${ctx.test.noTurns}`,
    `#monsters: ${ctx.test.monsters.length}`,
  ];

  elem.textContent = items.join(' | ');
}

export function updateActionsSummary(): void {
  const elem = document.querySelector('#actions-summary')!;

  if (ctx.test === null) {
    elem.textContent = 'No test selected';
    return;
  }

  if (ctx.actions.length === 0) {
    elem.textContent = 'No actions';
    return;
  }

  const recentActions = ctx.actions
    .slice(-10)
    .map(action => {
      if (action instanceof AttackAction) {
        return `Attack ${action.monsterId}`;
      } else if (action instanceof MoveAction) {
        return `Move (${action.position.x}, ${action.position.y})`;
      }
    })
    .join(' <- ');

  elem.textContent = `Recent actions (${ctx.actions.length} total, ${ctx.test.noTurns - ctx.actions.length} remaining): ${recentActions.length > 0 ? recentActions : '-'}`;
}

export function updateStateSummary(): void {
  const elem = document.querySelector('#state-summary')!;

  if (ctx.state === null) {
    elem.textContent = 'No state available';
    return;
  }

  const items = [
    `Position: (${ctx.state.position.x}, ${ctx.state.position.y})`,
    `Speed: ${ctx.state.speed}`,
    `Power: ${ctx.state.power}`,
    `Range: ${ctx.state.range}`,
    `Gold: ${ctx.state.gold}`,
    `Exp: ${ctx.state.exp} / ${1000 + (ctx.state.level + 1) * ctx.state.level * 50}`,
    `Level: ${ctx.state.level}`,
    `Fatigue: ${ctx.state.fatigue}`,
  ];

  elem.textContent = items.join(' | ');
}
