import { Extractor } from './extractor';

class RisksExtractor implements Extractor {
  async run(): Promise<void> {
    // TODO: implement extraction for Risks (identify, severity, mitigation)
    console.log('RisksExtractor: run() - TODO implement');
  }
}

export default new RisksExtractor();
