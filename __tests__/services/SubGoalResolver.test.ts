import { SubGoal } from '../../server/src/modules/agents/OrchestrationTypes'
import { SubGoalResolver } from '../../server/src/modules/agents/SubGoalResolver'

describe('SubGoalResolver', () => {
  const subGoals: SubGoal[] = [
    { id: 'task_1', goal: 'Task 1', domain: 'discovery' },
    { id: 'task_2', goal: 'Task 2', domain: 'discovery', dependsOn: ['task_1'] },
    { id: 'task_3', goal: 'Task 3', domain: 'pmbok', dependsOn: ['task_1'] },
    { id: 'task_4', goal: 'Task 4', domain: 'integration', dependsOn: ['task_2', 'task_3'] },
    { id: 'task_5', goal: 'Task 5', domain: 'general' }
  ]

  it('should resolve batches correctly', () => {
    const batches = SubGoalResolver.resolveBatches(subGoals)
    
    // Expected batches:
    // Batch 1: task_1, task_5 (no dependencies)
    // Batch 2: task_2, task_3 (depends on task_1)
    // Batch 3: task_4 (depends on task_2, task_3)
    
    expect(batches).toHaveLength(3)
    
    expect(batches[0].map(sg => sg.id)).toContain('task_1')
    expect(batches[0].map(sg => sg.id)).toContain('task_5')
    
    expect(batches[1].map(sg => sg.id)).toContain('task_2')
    expect(batches[1].map(sg => sg.id)).toContain('task_3')
    
    expect(batches[2].map(sg => sg.id)).toContain('task_4')
  })

  it('should resolve serial order correctly', () => {
    const ordered = SubGoalResolver.resolveSerial(subGoals)
    
    expect(ordered).toHaveLength(5)
    
    const index1 = ordered.findIndex(sg => sg.id === 'task_1')
    const index2 = ordered.findIndex(sg => sg.id === 'task_2')
    const index3 = ordered.findIndex(sg => sg.id === 'task_3')
    const index4 = ordered.findIndex(sg => sg.id === 'task_4')
    
    expect(index1).toBeLessThan(index2)
    expect(index1).toBeLessThan(index3)
    expect(index2).toBeLessThan(index4)
    expect(index3).toBeLessThan(index4)
  })

  it('should handle cycles gracefully (fallback)', () => {
    const cyclicSubGoals: SubGoal[] = [
      { id: 'task_A', goal: 'Task A', domain: 'discovery', dependsOn: ['task_B'] },
      { id: 'task_B', goal: 'Task B', domain: 'discovery', dependsOn: ['task_A'] }
    ]
    
    const batches = SubGoalResolver.resolveBatches(cyclicSubGoals)
    expect(batches.flat()).toHaveLength(2)
  })
})
