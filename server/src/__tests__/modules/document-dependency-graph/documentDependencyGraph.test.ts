import { DocumentDependencyGraph } from '../../../modules/document-dependency-graph/DocumentDependencyGraph';

describe('DocumentDependencyGraph (Contract Guards)', () => {
  let graph: DocumentDependencyGraph;

  beforeEach(() => {
    graph = new DocumentDependencyGraph();
  });

  it('REQ-DG-001: should return PMBOK level 1 to 5 in correct topological sort order', () => {
    const sorted = graph.getTopologicalSort();
    
    // Level 1: Project Charter, Stakeholder Register
    const charterIndex = sorted.indexOf('Project Charter');
    const stakeholderIndex = sorted.indexOf('Stakeholder Register');
    
    // Level 2: Scope Management Plan, Schedule Management Plan
    const scopeIndex = sorted.indexOf('Scope Management Plan');
    const scheduleIndex = sorted.indexOf('Schedule Management Plan');
    
    // Level 5: Project Management Plan
    const pmpIndex = sorted.indexOf('Project Management Plan');
    
    expect(charterIndex).toBeLessThan(scopeIndex);
    expect(charterIndex).toBeLessThan(scheduleIndex);
    expect(scopeIndex).toBeLessThan(scheduleIndex); // Schedule depends on Scope
    expect(scopeIndex).toBeLessThan(pmpIndex);
    expect(pmpIndex).toBeGreaterThan(Math.max(charterIndex, stakeholderIndex, scopeIndex, scheduleIndex));
  });

  it('REQ-DG-002: should identify downstream dependencies correctly', () => {
    const downstreams = graph.getDownstreamDependencies('Project Charter');
    
    expect(downstreams).toContain('Scope Management Plan');
    expect(downstreams).toContain('Schedule Management Plan');
    expect(downstreams).toContain('Cost Management Plan');
    // It should recursively find PMP
    expect(downstreams).toContain('Project Management Plan');
  });

  it('REQ-DG-002: should identify upstream dependencies correctly', () => {
    const upstreams = graph.getUpstreamDependencies('Risk Management Plan');
    
    expect(upstreams).toContain('Scope Management Plan');
    expect(upstreams).toContain('Schedule Management Plan');
    expect(upstreams).toContain('Cost Management Plan');
    expect(upstreams).toContain('Quality Management Plan');
    // Risk doesn't depend on Communications Plan directly based on canonical PMBOK
    expect(upstreams).not.toContain('Communications Plan');
  });

  it('REQ-DG-003: should allow custom dependencies without breaking canonical logic', () => {
    // Add custom dependency: Risk depends on Procurement
    graph.addCustomDependency('Risk Management Plan', 'Procurement Plan');
    
    const upstreams = graph.getUpstreamDependencies('Risk Management Plan');
    expect(upstreams).toContain('Procurement Plan');
  });
  
  it('REQ-DG-004: should reject cyclic custom dependencies', () => {
    expect(() => {
      // PMP already depends on Charter. If Charter depends on PMP, cycle!
      graph.addCustomDependency('Project Charter', 'Project Management Plan');
    }).toThrow(/Cycle detected/);
  });
});
