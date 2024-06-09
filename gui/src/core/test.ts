export class Hero {
  public constructor(
    public readonly baseSpeed: number,
    public readonly basePower: number,
    public readonly baseRange: number,
    public readonly coeffSpeed: number,
    public readonly coeffPower: number,
    public readonly coeffRange: number,
  ) {}
}

export class Position {
  public constructor(
    public x: number,
    public y: number,
  ) {}

  public distanceTo(other: Position): number {
    return Math.pow(other.x - this.x, 2) + Math.pow(other.y - this.y, 2);
  }

  public isInRange(other: Position, maxDistance: number): boolean {
    return this.distanceTo(other) <= Math.pow(maxDistance, 2);
  }

  public positionTowards(other: Position, maxDistance: number, width: number, height: number): Position {
    let outX = this.x;
    let outY = this.y;

    while (outX != other.x || outY != other.y) {
      let dx = this.clamp(other.x - outX, -1, 1);
      let dy = this.clamp(other.y - outY, -1, 1);

      if (outX + dx < 0 || outX + dx > width) {
        dx = 0;
      }

      if (outY + dy < 0 || outY + dy > height) {
        dy = 0;
      }

      if (dx === 0 && dy === 0) {
        break;
      }

      if (this.isInRange(new Position(outX + dx, outY + dy), maxDistance)) {
        outX += dx;
        outY += dy;
        continue;
      }

      if (dx != 0 && this.isInRange(new Position(outX + dx, outY), maxDistance)) {
        outX += dx;
        continue;
      }

      if (dy != 0 && this.isInRange(new Position(outX, outY + dy), maxDistance)) {
        outY += dy;
        continue;
      }

      break;
    }

    return new Position(outX, outY);
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }
}

export class Monster {
  public constructor(
    public readonly id: number,
    public readonly position: Position,
    public hp: number,
    public readonly gold: number,
    public readonly exp: number,
    public readonly range: number,
    public readonly attack: number,
  ) {}
}

export class Test {
  public constructor(
    public readonly id: number,
    public readonly hero: Hero,
    public readonly startPosition: Position,
    public readonly width: number,
    public readonly height: number,
    public readonly noTurns: number,
    public readonly monsters: Monster[],
  ) {}
}

export function parseTest(id: number, json: any): Test {
  const hero = new Hero(
    json.hero.base_speed,
    json.hero.base_power,
    json.hero.base_range,
    json.hero.level_speed_coeff,
    json.hero.level_power_coeff,
    json.hero.level_range_coeff,
  );

  const startPosition = new Position(json.start_x, json.start_y);

  const monsters = (json.monsters as any[]).map(
    (monster, i) =>
      new Monster(
        i,
        new Position(monster.x, monster.y),
        monster.hp,
        monster.gold,
        monster.exp,
        monster.range || 0,
        monster.attack || 0,
      ),
  );

  return new Test(id, hero, startPosition, json.width, json.height, json.num_turns, monsters);
}
