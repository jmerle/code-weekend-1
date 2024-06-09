import createColormap from 'colormap';
import { Viewport } from 'pixi-viewport';
import { Application, Graphics } from 'pixi.js';
import Stats from 'stats.js';
import { ctx } from '../context.ts';
import { Action, AttackAction, MoveAction } from '../core/solution.ts';
import { Monster, Position } from '../core/test.ts';
import { createMonsterFilter } from './filter.ts';
import { updateActionsSummary, updateStateSummary } from './summaries.ts';

let app: Application;
let viewport: Viewport;

let graphics: Graphics[] = [];

let dirty = false;
let lastMousePosition: Position = new Position(0, 0);

const colors = createColormap({
  colormap: 'autumn',
  format: 'hex',
});

function initViewport(): void {
  viewport = new Viewport({
    events: app.renderer.events,
  });

  app.stage.addChild(viewport);

  viewport.drag().pinch().wheel().clampZoom({
    minWidth: 1,
    minHeight: 1,
    maxWidth: 5000,
    maxHeight: 5000,
  });
}

function getMousePosition(): Position {
  const pointer = app.renderer.events.pointer;
  const worldPoint = viewport.toWorld(pointer.x, pointer.y);
  return new Position(Math.round(worldPoint.x), Math.round(worldPoint.y));
}

export async function initCanvas(): Promise<void> {
  app = new Application();
  await app.init({ width: window.innerWidth, height: window.innerHeight - 200 });
  document.body.prepend(app.canvas);

  initViewport();

  const stats = new Stats();
  stats.showPanel(1);
  document.body.appendChild(stats.dom);

  document.querySelector<HTMLInputElement>('#color-field')!.addEventListener('input', () => {
    markCanvasDirty();
  });

  dirty = true;

  app.ticker.add(() => {
    stats.begin();

    const mousePosition = getMousePosition();
    if (mousePosition.x !== lastMousePosition.x || mousePosition.y !== lastMousePosition.y) {
      dirty = true;
      lastMousePosition = mousePosition;
    }

    if (dirty) {
      draw();
      dirty = false;
    }

    stats.end();
  });
}

export function markCanvasDirty(): void {
  dirty = true;
}

function drawEntity(
  position: Position,
  speed: number,
  range: number,
  bodyColor: string,
  attackRadiusColor: string,
): void {
  const body = viewport.addChild(new Graphics());
  body.circle(position.x, position.y, 3);
  body.fill({ color: bodyColor });
  graphics.push(body);

  if (speed > 0) {
    const movementRadius = viewport.addChild(new Graphics());
    movementRadius.circle(position.x, position.y, speed);
    movementRadius.stroke({ color: 'rgba(0, 0, 255, 0.5)' });
    graphics.push(movementRadius);
  }

  if (range > 0) {
    const attackRadius = viewport.addChild(new Graphics());
    attackRadius.circle(position.x, position.y, range);
    attackRadius.stroke({ color: attackRadiusColor });
    graphics.push(attackRadius);
  }
}

function draw(): void {
  for (const graphic of graphics) {
    graphic.destroy();
  }

  graphics = [];

  if (ctx.test === null || ctx.state === null) {
    return;
  }

  const mapBorder = viewport.addChild(new Graphics());
  mapBorder.rect(0, 0, ctx.test.width, ctx.test.height);
  mapBorder.stroke({ color: 'white' });
  graphics.push(mapBorder);

  drawEntity(ctx.state.position, ctx.state.speed, ctx.state.range, 'green', 'rgba(255, 0, 0, 0.75)');

  const colorField = document.querySelector<HTMLInputElement>('#color-field')!.value;
  const colorValueExtractor = (monster: Monster): number => {
    switch (colorField) {
      case 'gold-hp':
        return monster.gold / monster.hp;
      case 'exp-hp':
        return monster.exp / monster.hp;
      default:
        return monster[colorField as keyof Monster] as number;
    }
  };

  const colorValues: number[] = ctx.test.monsters.map(monster => colorValueExtractor(monster));
  const colorMin = Math.min(...colorValues);
  const colorMax = Math.max(...colorValues);

  const mousePosition = getMousePosition();

  for (const monster of ctx.test.monsters) {
    if (ctx.state.monsterHp[monster.id] <= 0) {
      continue;
    }

    const colorValue = colorValueExtractor(monster);
    const colorScaled = colorMin != colorMax ? (colorValue - colorMin) / (colorMax - colorMin) : 1;
    const bodyColor = colors[Math.min(Math.floor(colorScaled * colors.length), colors.length - 1)];

    const attackRadiusAlpha = monster.position.isInRange(mousePosition, monster.range) ? 1.0 : 0.25;
    const attackRadiusColor = `rgba(255, 0, 0, ${attackRadiusAlpha})`;

    drawEntity(monster.position, 0, monster.range, bodyColor, attackRadiusColor);
  }
}

function registerAction(action: Action): void {
  action.apply(ctx.state!);
  ctx.actions.push(action);
}

export function doAttack(): void {
  if (ctx.test === null || ctx.state === null || ctx.actions.length >= ctx.test.noTurns) {
    return;
  }

  const monsterFilter = createMonsterFilter();

  const attackableMonsters = [...ctx.test.monsters]
    .filter(monster => ctx.state!.monsterHp[monster.id] > 0)
    .filter(monster => ctx.state!.position.isInRange(monster.position, ctx.state!.range))
    .filter(monster => monsterFilter(monster))
    .sort((a, b) => a.hp - b.hp);

  const oldLevel = ctx.state.level;

  for (const monster of attackableMonsters) {
    while (ctx.state.monsterHp[monster.id] > 0) {
      registerAction(new AttackAction(monster.id));

      if (ctx.state!.level != oldLevel) {
        doAttack();
        return;
      }

      if (ctx.actions.length === ctx.test.noTurns) {
        break;
      }
    }

    if (ctx.actions.length === ctx.test.noTurns) {
      break;
    }
  }

  markCanvasDirty();
  updateActionsSummary();
  updateStateSummary();
}

export function doMove(): void {
  if (ctx.test === null || ctx.state === null || ctx.actions.length >= ctx.test.noTurns) {
    return;
  }

  const mousePosition = getMousePosition();
  const targetPosition = ctx.state.position.positionTowards(
    mousePosition,
    ctx.state.speed,
    ctx.test.width,
    ctx.test.height,
  );

  if (ctx.state.position.x === targetPosition.x && ctx.state.position.y === targetPosition.y) {
    return;
  }

  registerAction(new MoveAction(targetPosition));

  markCanvasDirty();
  updateActionsSummary();
  updateStateSummary();
}
