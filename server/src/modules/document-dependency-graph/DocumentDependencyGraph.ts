export class DocumentDependencyGraph {
  // Canonical PMBOK dependencies: Record<DocumentType, DocumentType[]>
  // Represents: Key depends on Values
  private canonicalDependencies: Record<string, string[]> = {
    'Project Charter': [],
    'Stakeholder Register': [],
    
    'Scope Management Plan': ['Project Charter'],
    'Schedule Management Plan': ['Project Charter', 'Scope Management Plan'],
    
    'Cost Management Plan': ['Project Charter', 'Scope Management Plan', 'Schedule Management Plan'],
    'Quality Management Plan': ['Project Charter', 'Scope Management Plan'],
    'Resource Management Plan': ['Project Charter', 'Scope Management Plan', 'Schedule Management Plan'],
    
    'Risk Management Plan': ['Scope Management Plan', 'Cost Management Plan', 'Schedule Management Plan', 'Quality Management Plan'],
    'Communications Plan': ['Stakeholder Register', 'Resource Management Plan'],
    'Procurement Plan': ['Scope Management Plan', 'Cost Management Plan', 'Resource Management Plan'],
    'Change Management Plan': ['Project Charter', 'Scope Management Plan', 'Schedule Management Plan', 'Cost Management Plan', 'Quality Management Plan'],
    
    'Project Management Plan': [
      'Scope Management Plan',
      'Schedule Management Plan',
      'Cost Management Plan',
      'Quality Management Plan',
      'Resource Management Plan',
      'Risk Management Plan',
      'Communications Plan',
      'Procurement Plan',
      'Change Management Plan'
    ]
  };

  private customDependencies: Record<string, string[]> = {};

  /**
   * Retrieves all upstream dependencies for a given document type.
   */
  public getUpstreamDependencies(docType: string): string[] {
    const upstreams = new Set<string>();
    const stack = [docType];

    while (stack.length > 0) {
      const current = stack.pop()!;
      const deps = [
        ...(this.canonicalDependencies[current] || []),
        ...(this.customDependencies[current] || [])
      ];

      for (const dep of deps) {
        if (!upstreams.has(dep)) {
          upstreams.add(dep);
          stack.push(dep);
        }
      }
    }

    return Array.from(upstreams);
  }

  /**
   * Retrieves all downstream dependencies (things that depend on docType).
   */
  public getDownstreamDependencies(docType: string): string[] {
    const downstreams = new Set<string>();
    const allDocs = new Set([
      ...Object.keys(this.canonicalDependencies),
      ...Object.keys(this.customDependencies)
    ]);

    for (const doc of allDocs) {
      if (doc === docType) continue;
      const upstreams = this.getUpstreamDependencies(doc);
      if (upstreams.includes(docType)) {
        downstreams.add(doc);
      }
    }

    return Array.from(downstreams);
  }

  /**
   * Adds a custom dependency. Throws if cycle is introduced.
   */
  public addCustomDependency(docType: string, dependsOn: string): void {
    if (docType === dependsOn) throw new Error('Cycle detected: Self-dependency');

    // Check if dependsOn already depends on docType (upstream cycle check)
    const dependsOnUpstreams = this.getUpstreamDependencies(dependsOn);
    if (dependsOnUpstreams.includes(docType)) {
      throw new Error(`Cycle detected: ${dependsOn} already depends on ${docType} upstream.`);
    }

    if (!this.customDependencies[docType]) {
      this.customDependencies[docType] = [];
    }
    
    if (!this.customDependencies[docType].includes(dependsOn)) {
      this.customDependencies[docType].push(dependsOn);
    }
  }

  /**
   * Topologically sorts all documents.
   */
  public getTopologicalSort(): string[] {
    const allDocs = new Set([
      ...Object.keys(this.canonicalDependencies),
      ...Object.keys(this.customDependencies)
    ]);
    
    // Fill in dependencies for nodes that might only be listed as dependencies
    for (const deps of Object.values(this.canonicalDependencies)) {
      deps.forEach(d => allDocs.add(d));
    }
    for (const deps of Object.values(this.customDependencies)) {
      deps.forEach(d => allDocs.add(d));
    }

    const visited = new Set<string>();
    const temp = new Set<string>();
    const order: string[] = [];

    const visit = (node: string) => {
      if (temp.has(node)) throw new Error(`Cycle detected at node ${node}`);
      if (!visited.has(node)) {
        temp.add(node);
        
        const deps = [
          ...(this.canonicalDependencies[node] || []),
          ...(this.customDependencies[node] || [])
        ];

        for (const dep of deps) {
          visit(dep);
        }
        
        temp.delete(node);
        visited.add(node);
        order.push(node);
      }
    };

    for (const doc of allDocs) {
      if (!visited.has(doc)) {
        visit(doc);
      }
    }

    return order;
  }
}
