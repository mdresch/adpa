import { calculateJaroWinkler, areEntitiesFuzzyMatch } from '../../services/entityExtractionService';

describe('Entity Fuzzy Matching Engine', () => {
  describe('calculateJaroWinkler', () => {
    it('should return 1.0 for exact matches', () => {
      expect(calculateJaroWinkler('John Doe', 'John Doe')).toBe(1.0);
      expect(calculateJaroWinkler('john doe', 'John Doe')).toBe(1.0);
    });

    it('should calculate correct distance for typographical errors', () => {
      // Jaro-Winkler for "Steering commitee" vs "Steering committee" should be high
      const score = calculateJaroWinkler('Steering commitee', 'Steering committee');
      expect(score).toBeGreaterThanOrEqual(0.82);
    });

    it('should return 0.0 for completely different strings', () => {
      expect(calculateJaroWinkler('abc', 'xyz')).toBe(0.0);
    });
  });

  describe('areEntitiesFuzzyMatch', () => {
    it('should identify exact matches', () => {
      const match = areEntitiesFuzzyMatch('John Doe', 'John Doe');
      expect(match.isMatch).toBe(true);
      expect(match.method).toBe('exact');
      expect(match.score).toBe(1.0);
    });

    it('should identify normalized matches ignoring punctuation', () => {
      const match = areEntitiesFuzzyMatch('Service Level Agreement (SLA)', 'Service Level Agreement SLA');
      expect(match.isMatch).toBe(true);
      expect(match.method).toBe('normalized');
      expect(match.score).toBe(0.98);
    });

    it('should identify substring matches', () => {
      const match = areEntitiesFuzzyMatch('Lead Technical Developer', 'Developer');
      expect(match.isMatch).toBe(true);
      expect(match.method).toBe('substring');
      expect(match.score).toBeGreaterThanOrEqual(0.80);
    });

    it('should identify token overlap matches', () => {
      const match = areEntitiesFuzzyMatch('Steering committee of finance', 'Finance steering committee');
      expect(match.isMatch).toBe(true);
      expect(match.method).toBe('token_overlap');
      expect(match.score).toBe(0.85);
    });

    it('should identify Jaro-Winkler matches for minor spelling mistakes', () => {
      const match = areEntitiesFuzzyMatch('Steering commitee', 'Steering committee');
      expect(match.isMatch).toBe(true);
      expect(match.method).toBe('jaro_winkler');
      expect(match.score).toBeGreaterThanOrEqual(0.82);
    });

    it('should reject non-matching entities', () => {
      const match = areEntitiesFuzzyMatch('Project Charter', 'Requirement Spec');
      expect(match.isMatch).toBe(false);
      expect(match.method).toBe('none');
    });
  });
});
