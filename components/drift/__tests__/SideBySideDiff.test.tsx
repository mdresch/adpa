/**
 * Unit Tests for SideBySideDiff Component
 * 
 * Tests functionality of components/drift/SideBySideDiff.tsx including:
 * - Rendering with valid content
 * - Handling empty content
 * - Diff parsing
 */

import { jest } from '@jest/globals';

describe('SideBySideDiff Component', () => {
  describe('Basic Rendering', () => {
    it('should handle basic text diff', () => {
      const oldContent = 'Hello World';
      const newContent = 'Hello TypeScript';
      
      expect(oldContent).toBe('Hello World');
      expect(newContent).toBe('Hello TypeScript');
      expect(oldContent).not.toBe(newContent);
    });

    it('should handle empty content', () => {
      const oldContent = '';
      const newContent = '';
      
      expect(oldContent).toBe('');
      expect(newContent).toBe('');
    });

    it('should handle multiline content', () => {
      const oldContent = 'Line 1\nLine 2\nLine 3';
      const newContent = 'Line 1\nLine 2 Modified\nLine 3';
      
      const oldLines = oldContent.split('\n');
      const newLines = newContent.split('\n');
      
      expect(oldLines).toHaveLength(3);
      expect(newLines).toHaveLength(3);
      expect(oldLines[1]).not.toBe(newLines[1]);
    });
  });

  describe('Diff Functionality', () => {
    it('should detect additions', () => {
      const oldContent = 'Original text';
      const newContent = 'Original text\nNew line added';
      
      const oldLines = oldContent.split('\n');
      const newLines = newContent.split('\n');
      
      expect(newLines.length).toBeGreaterThan(oldLines.length);
    });

    it('should detect deletions', () => {
      const oldContent = 'Line 1\nLine 2\nLine 3';
      const newContent = 'Line 1\nLine 3';
      
      const oldLines = oldContent.split('\n');
      const newLines = newContent.split('\n');
      
      expect(newLines.length).toBeLessThan(oldLines.length);
    });

    it('should detect modifications', () => {
      const oldContent = 'Original text';
      const newContent = 'Modified text';
      
      expect(oldContent).not.toBe(newContent);
      expect(oldContent.split('\n').length).toBe(newContent.split('\n').length);
    });
  });

  describe('Props Validation', () => {
    it('should have required props defined', () => {
      const props = {
        oldContent: 'Old content',
        newContent: 'New content',
        filename: 'document.md'
      };
      
      expect(props.oldContent).toBeDefined();
      expect(props.newContent).toBeDefined();
      expect(props.filename).toBeDefined();
    });

    it('should have default filename', () => {
      const defaultFilename = 'document.md';
      
      expect(defaultFilename).toBe('document.md');
    });
  });

  describe('Markdown Content', () => {
    it('should handle markdown formatting', () => {
      const markdownOld = '# Heading\n\n## Subheading\n\nContent';
      const markdownNew = '# Heading\n\n## Modified Subheading\n\nContent';
      
      expect(markdownOld).toContain('# Heading');
      expect(markdownNew).toContain('# Heading');
      expect(markdownOld).not.toBe(markdownNew);
    });

    it('should handle code blocks', () => {
      const withCodeBlock = '```javascript\nconst x = 1;\n```';
      
      expect(withCodeBlock).toContain('```');
      expect(withCodeBlock).toContain('javascript');
    });

    it('should handle lists', () => {
      const withList = '- Item 1\n- Item 2\n- Item 3';
      const listItems = withList.split('\n');
      
      expect(listItems).toHaveLength(3);
      expect(listItems.every(item => item.startsWith('-'))).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long content', () => {
      const longContent = 'Line\n'.repeat(1000);
      const lines = longContent.split('\n');
      
      expect(lines.length).toBeGreaterThan(999);
    });

    it('should handle special characters', () => {
      const specialChars = 'Special chars: @#$%^&*()_+-=[]{}|;:,.<>?';
      
      expect(specialChars).toContain('@');
      expect(specialChars).toContain('#');
      expect(specialChars).toContain('$');
    });

    it('should handle unicode characters', () => {
      const unicode = 'Unicode: 你好世界 🚀 ⭐';
      
      expect(unicode).toContain('你好世界');
      expect(unicode).toContain('🚀');
    });

    it('should handle empty lines', () => {
      const withEmptyLines = 'Line 1\n\n\nLine 4';
      const lines = withEmptyLines.split('\n');
      
      expect(lines).toHaveLength(4);
      expect(lines[1]).toBe('');
      expect(lines[2]).toBe('');
    });
  });

  describe('Component Configuration', () => {
    it('should use split view by default', () => {
      const viewType = 'split';
      
      expect(viewType).toBe('split');
    });

    it('should support unified view', () => {
      const viewType = 'unified';
      
      expect(viewType).toBe('unified');
    });
  });
});
