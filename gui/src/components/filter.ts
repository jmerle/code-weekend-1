import { Monster } from '../core/test.ts';

function getFieldFilter(field: keyof Monster): (monster: Monster) => boolean {
  const min = document.querySelector<HTMLInputElement>(`#${field}-min`)!;
  const max = document.querySelector<HTMLInputElement>(`#${field}-max`)!;

  const minValue = min.value ? parseInt(min.value) : -Infinity;
  const maxValue = max.value ? parseInt(max.value) : Infinity;

  return monster => {
    const value = monster[field] as number;
    return value >= minValue && value <= maxValue;
  };
}

export function createMonsterFilter(): (monster: Monster) => boolean {
  const fields: (keyof Monster)[] = ['id', 'hp', 'gold', 'exp', 'range', 'attack'];
  const filters = fields.map(field => getFieldFilter(field));

  return monster => {
    for (const filter of filters) {
      if (!filter(monster)) {
        return false;
      }
    }

    return true;
  };
}
