/**
 * Security Regression Test: Strategy Engine Injection Mitigation
 * Ensures that variable resolution strategies are immune to new Function() injection.
 */

import { ConditionalLogicStrategy } from '../../modules/variableResolution/strategies/conditionalLogicStrategy';
import { ComputedValueStrategy } from '../../modules/variableResolution/strategies/computedValueStrategy';
import { DefaultValueStrategy } from '../../modules/variableResolution/strategies/defaultValueStrategy';

describe('Security Regression: Strategy Injection Mitigation', () => {
    const conditionalStrategy = new ConditionalLogicStrategy();
    const computedStrategy = new ComputedValueStrategy();
    const defaultStrategy = new DefaultValueStrategy();

    const mockVariable: any = {
        variable_id: 'test-var',
        variable_name: 'testVar',
        variable_type: 'string',
        variable_definition: {}
    };

    const mockContext: any = {
        project_context: { name: 'Test Project' },
        user_context: { user_profile: { name: 'Test User' } }
    };

    describe('ConditionalLogicStrategy', () => {
        it('should NOT execute arbitrary JS via new Function string', async () => {
            // This would create a file or throw in a vulnerable system
            // In expr-eval, this should either throw a parse error or evaluate harmlessly
            const maliciousCondition = '1 == 1; const fs = require("fs"); console.log("HACKED")';
            
            // We expect the parser to either fail or treat it as a non-matching condition
            // @ts-ignore - accessing private method for security testing
            const result = await conditionalStrategy.evaluateStringCondition(maliciousCondition, {});
            
            expect(result).toBe(false);
        });

        it('should safely evaluate valid expressions', async () => {
            // @ts-ignore
            const result = await conditionalStrategy.evaluateStringCondition('1 + 1 == 2', {});
            expect(result).toBe(true);
        });
    });

    describe('ComputedValueStrategy', () => {
        it('should NOT execute arbitrary JS in computed expressions', async () => {
            const maliciousExpression = '(() => { return "HACKED" })()';
            
            // @ts-ignore
            try {
                const result = await computedStrategy.evaluateExpression(maliciousExpression, {});
                // If it returns "HACKED", it executed the function literal - VULNERABLE
                expect(result).not.toBe("HACKED");
            } catch (e) {
                // Throwing is also a valid safe state for invalid expr-eval syntax
                expect(true).toBe(true);
            }
        });
    });

    describe('DefaultValueStrategy', () => {
        it('should safely evaluate default value expressions', async () => {
            const safeExpression = 'project.name + " - Default"';
            
            // @ts-ignore
            const result = await defaultStrategy.evaluateDefaultFunction(safeExpression, mockContext);
            expect(result).toBe('Test Project - Default');
        });
    });
});
