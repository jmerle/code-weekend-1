import { Position, Test } from './test.ts';

export class State {
  public readonly position: Position;

  public speed: number;
  public power: number;
  public range: number;

  public gold: number;
  public exp: number;
  public level: number;

  public fatigue: number;

  public readonly monsterHp: number[];

  public constructor(public readonly test: Test) {
    this.position = new Position(test.startPosition.x, test.startPosition.y);

    this.speed = test.hero.baseSpeed;
    this.power = test.hero.basePower;
    this.range = test.hero.baseRange;

    this.gold = 0;
    this.exp = 0;
    this.level = 0;

    this.fatigue = 0;

    this.monsterHp = test.monsters.map(monster => monster.hp);
  }
}

export abstract class Action {
  protected constructor(
    public readonly type: string,
    public readonly comment: string | undefined,
  ) {}

  public abstract apply(state: State): void;

  public applyAttacks(state: State): void {
    for (const monster of state.test.monsters) {
      if (state.monsterHp[monster.id] > 0 && monster.position.isInRange(state.position, monster.range)) {
        state.fatigue += monster.attack;
      }
    }
  }

  public toJson(): any {
    const json: any = { type: this.type };

    if (this.comment !== undefined) {
      json.comment = this.comment;
    }

    return json;
  }
}

export class MoveAction extends Action {
  public constructor(
    public readonly position: Position,
    comment: string | undefined = undefined,
  ) {
    super('move', comment);
  }

  public apply(state: State): void {
    state.position.x = this.position.x;
    state.position.y = this.position.y;
    this.applyAttacks(state);
  }

  public toJson(): any {
    return {
      ...super.toJson(),
      target_x: this.position.x,
      target_y: this.position.y,
    };
  }
}

export class AttackAction extends Action {
  public constructor(
    public readonly monsterId: number,
    comment: string | undefined = undefined,
  ) {
    super('attack', comment);
  }

  public apply(state: State): void {
    state.monsterHp[this.monsterId] -= state.power;

    if (state.monsterHp[this.monsterId] <= 0) {
      const monster = state.test.monsters[this.monsterId];
      state.gold += Math.floor(monster.gold * (1000 / (1000 + state.fatigue)) + 1e-6);
      state.exp += monster.exp;

      const oldLevel = state.level;

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const requiredExp = 1000 + (state.level + 1) * state.level * 50;
        if (state.exp < requiredExp) {
          break;
        }

        state.exp -= requiredExp;
        state.level++;
      }

      if (state.level != oldLevel) {
        state.speed = this.calculateStat(state.level, state.test.hero.baseSpeed, state.test.hero.coeffSpeed);
        state.power = this.calculateStat(state.level, state.test.hero.basePower, state.test.hero.coeffPower);
        state.range = this.calculateStat(state.level, state.test.hero.baseRange, state.test.hero.coeffRange);
      }
    }

    this.applyAttacks(state);
  }

  public toJson(): any {
    return {
      ...super.toJson(),
      target_id: this.monsterId,
    };
  }

  private calculateStat(level: number, base: number, coeff: number): number {
    return Math.floor(base * (1 + level * (coeff / 100)) + 1e-6);
  }
}
