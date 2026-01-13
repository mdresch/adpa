export interface Extractor {
  /** Run the extraction job for the entity. Implement parsing, normalization, and persistence here. */
  run(): Promise<void>;
}
