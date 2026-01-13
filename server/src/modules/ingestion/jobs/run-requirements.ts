import requirements from './requirements';

(async () => {
  try {
    await requirements.run();
    // eslint-disable-next-line no-process-exit
    process.exit(0);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('run-requirements failed:', err);
    // eslint-disable-next-line no-process-exit
    process.exit(1);
  }
})();
