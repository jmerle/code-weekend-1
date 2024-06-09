import { initCanvas } from './components/canvas.ts';
import { initFileSelectors } from './components/files.ts';
import { initShortcuts } from './components/shortcuts.ts';
import { initApiTokenInput } from './components/submit.ts';
import { updateActionsSummary, updateStateSummary, updateTestSummary } from './components/summaries.ts';

initCanvas()
  .then(() => {
    initFileSelectors();
    initApiTokenInput();
    initShortcuts();

    updateTestSummary();
    updateActionsSummary();
    updateStateSummary();
  })
  .catch(err => {
    console.error(err);
    alert(`Cannot create canvas: ${err}`);
  });
