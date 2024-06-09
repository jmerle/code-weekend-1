import { ctx } from '../context.ts';

const localStorageKey = 'code-weekend-1-gui-api-token';

export function initApiTokenInput(): void {
  const elem = document.querySelector<HTMLInputElement>('#api-token')!;
  elem.value = localStorage.getItem(localStorageKey) || '';

  elem.addEventListener('input', () => {
    localStorage.setItem(localStorageKey, elem.value);
  });
}

export function submitActions(): void {
  if (ctx.test === null || ctx.actions.length === 0) {
    return;
  }

  const apiToken = localStorage.getItem(localStorageKey);
  if (apiToken === null) {
    return;
  }

  const json = JSON.stringify({ moves: ctx.actions.map(action => action.toJson()) });

  const formData = new FormData();
  formData.set('file', new Blob([json], { type: 'application/json' }), 'submission.json');

  fetch(`https://codeweekend.dev:3721/api/submit/${ctx.test.id}`, {
    method: 'POST',
    body: formData,
    headers: {
      Authorization: `Bearer ${apiToken}`,
    },
  })
    .then(() => {
      alert('Successfully submitted');
    })
    .catch(err => {
      console.error(err);
      alert(`Cannot submit actions: ${err}`);
    });
}
