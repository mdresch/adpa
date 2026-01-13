import requirements from './requirements';
import activities from './activities';
import bestPractices from './bestPractices';
import scopeItems from './scopeItems';
import deliverables from './deliverables';
import risks from './risks';
import governanceDecisions from './governanceDecisions';

export const extractors = {
  requirements,
  activities,
  bestPractices,
  scopeItems,
  deliverables,
  risks,
  governanceDecisions,
};

export async function runAll(): Promise<void> {
  for (const [key, extractor] of Object.entries(extractors)) {
    try {
      // eslint-disable-next-line no-console
      console.log(`Starting extractor: ${key}`);
      await extractor.run();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`Extractor ${key} failed:`, err);
    }
  }
}

export default extractors;
