import { FmecaService } from '../src/services/fmeca';

describe('FMECA Service', () => {
  describe('calculateRPN', () => {
    it('should calculate RPN correctly', () => {
      const rpn = FmecaService.calculateRPN(8, 5, 3);
      expect(rpn).toBe(120);
    });

    it('should handle edge cases', () => {
      expect(FmecaService.calculateRPN(1, 1, 1)).toBe(1);
      expect(FmecaService.calculateRPN(10, 10, 10)).toBe(1000);
    });
  });

  describe('determineCriticality', () => {
    it('should classify low criticality correctly', async () => {
      const criticality = await FmecaService.determineCriticality(50);
      expect(criticality).toBe('low');
    });

    it('should classify medium criticality correctly', async () => {
      const criticality = await FmecaService.determineCriticality(150);
      expect(criticality).toBe('medium');
    });

    it('should classify high criticality correctly', async () => {
      const criticality = await FmecaService.determineCriticality(300);
      expect(criticality).toBe('high');
    });
  });
});
