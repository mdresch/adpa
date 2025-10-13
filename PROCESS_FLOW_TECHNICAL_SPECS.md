# Process Flow Workflow - Technical Specifications

## 1. Enhanced Document Viewer

### Component Structure
```
app/documents/[id]/view/
├── page.tsx                 # Main document viewer page
├── components/
│   ├── DocumentRenderer.tsx # Markdown renderer with syntax highlighting
│   ├── MetadataPanel.tsx   # Document metadata sidebar
│   ├── ExportOptions.tsx   # Export functionality
│   ├── VersionHistory.tsx  # Version comparison and history
│   ├── EditMode.tsx        # In-place editing capabilities
│   └── PrintView.tsx       # Print-optimized layout
└── hooks/
    ├── useDocument.ts      # Document data fetching
    ├── useExport.ts        # Export functionality
    └── useVersionHistory.ts # Version management
```

### Key Features Implementation

#### DocumentRenderer.tsx
```typescript
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';

interface DocumentRendererProps {
  content: string;
  className?: string;
  showLineNumbers?: boolean;
  enableCopy?: boolean;
}

export const DocumentRenderer: React.FC<DocumentRendererProps> = ({
  content,
  className,
  showLineNumbers = true,
  enableCopy = true
}) => {
  return (
    <ReactMarkdown
      className={className}
      components={{
        code({ node, inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          return !inline && match ? (
            <SyntaxHighlighter
              style={vscDarkPlus}
              language={match[1]}
              PreTag="div"
              showLineNumbers={showLineNumbers}
              customStyle={{ margin: '1rem 0' }}
              {...props}
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          ) : (
            <code className={className} {...props}>
              {children}
            </code>
          );
        },
        // Custom components for tables, images, etc.
      }}
    >
      {content}
    </ReactMarkdown>
  );
};
```

#### ExportOptions.tsx
```typescript
import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';

interface ExportOptionsProps {
  document: DocumentData;
  onExport: (format: 'pdf' | 'docx' | 'md') => Promise<void>;
}

export const ExportOptions: React.FC<ExportOptionsProps> = ({ document, onExport }) => {
  const handleExport = async (format: 'pdf' | 'docx' | 'md') => {
    switch (format) {
      case 'pdf':
        await exportToPDF(document);
        break;
      case 'docx':
        await exportToDocx(document);
        break;
      case 'md':
        await exportToMarkdown(document);
        break;
    }
  };

  const exportToPDF = async (doc: DocumentData) => {
    const pdf = new jsPDF();
    // Convert markdown to PDF with proper formatting
    // Handle code blocks, tables, images
    pdf.save(`${doc.title}.pdf`);
  };

  const exportToDocx = async (doc: DocumentData) => {
    const docxDoc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: doc.title,
                bold: true,
                size: 32,
              }),
            ],
          }),
          // Convert markdown content to docx format
        ],
      }],
    });
    
    const buffer = await Packer.toBuffer(docxDoc);
    saveAs(new Blob([buffer]), `${doc.title}.docx`);
  };

  return (
    <div className="export-options">
      <button onClick={() => handleExport('pdf')}>Export PDF</button>
      <button onClick={() => handleExport('docx')}>Export Word</button>
      <button onClick={() => handleExport('md')}>Export Markdown</button>
    </div>
  );
};
```

## 2. AI Compression Quality Assurance

### Service Architecture
```typescript
// server/src/services/compressionQualityService.ts
export class CompressionQualityService {
  async calculateQualityMetrics(
    originalContent: string,
    compressedContent: string,
    strategy: CompressionStrategy
  ): Promise<CompressionQualityMetrics> {
    const metrics = await Promise.all([
      this.calculateCoherence(originalContent, compressedContent),
      this.calculateCompleteness(originalContent, compressedContent),
      this.calculateRelevance(originalContent, compressedContent),
      this.calculateReadability(compressedContent)
    ]);

    return {
      coherence: metrics[0],
      completeness: metrics[1],
      relevance: metrics[2],
      readability: metrics[3],
      overall: this.calculateWeightedAverage(metrics)
    };
  }

  private async calculateCoherence(original: string, compressed: string): Promise<number> {
    // Use AI to evaluate logical flow and coherence
    const prompt = `
    Evaluate the coherence of this compressed content compared to the original:
    
    Original: ${original.substring(0, 1000)}...
    Compressed: ${compressed}
    
    Rate coherence from 0-1 where 1 is perfectly coherent.
    `;
    
    const response = await aiService.generate({
      prompt,
      provider: 'openai',
      model: 'gpt-4',
      temperature: 0.1
    });
    
    return parseFloat(response.content) || 0.5;
  }

  private async calculateCompleteness(original: string, compressed: string): Promise<number> {
    // Analyze information retention
    const originalTopics = await this.extractTopics(original);
    const compressedTopics = await this.extractTopics(compressed);
    
    const retainedTopics = originalTopics.filter(topic => 
      compressedTopics.some(ct => this.similarity(topic, ct) > 0.7)
    );
    
    return retainedTopics.length / originalTopics.length;
  }

  private async calculateRelevance(original: string, compressed: string): Promise<number> {
    // Evaluate if compressed content maintains relevance to original intent
    const relevancePrompt = `
    How relevant is this compressed content to the original document's main purpose?
    
    Original: ${original.substring(0, 1000)}...
    Compressed: ${compressed}
    
    Rate relevance from 0-1.
    `;
    
    const response = await aiService.generate({
      prompt: relevancePrompt,
      provider: 'openai',
      model: 'gpt-4',
      temperature: 0.1
    });
    
    return parseFloat(response.content) || 0.5;
  }

  private async calculateReadability(content: string): Promise<number> {
    // Use readability metrics (Flesch-Kincaid, etc.)
    const sentences = content.split(/[.!?]+/).length;
    const words = content.split(/\s+/).length;
    const syllables = this.countSyllables(content);
    
    const fleschScore = 206.835 - (1.015 * (words / sentences)) - (84.6 * (syllables / words));
    
    // Normalize to 0-1 scale
    return Math.max(0, Math.min(1, fleschScore / 100));
  }
}
```

### Quality Metrics Database
```sql
CREATE TABLE compression_quality_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id),
  strategy_used VARCHAR(50) NOT NULL,
  original_length INTEGER NOT NULL,
  compressed_length INTEGER NOT NULL,
  compression_ratio DECIMAL(5,4) NOT NULL,
  coherence_score DECIMAL(3,2) NOT NULL,
  completeness_score DECIMAL(3,2) NOT NULL,
  relevance_score DECIMAL(3,2) NOT NULL,
  readability_score DECIMAL(3,2) NOT NULL,
  overall_score DECIMAL(3,2) NOT NULL,
  processing_time_ms INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_compression_metrics_strategy ON compression_quality_metrics(strategy_used);
CREATE INDEX idx_compression_metrics_score ON compression_quality_metrics(overall_score);
```

## 3. Advanced Context Injection

### Template Variable System
```typescript
// server/src/services/templateVariableService.ts
export class TemplateVariableService {
  private variablePattern = /\{\{\s*([^}]+)\s*\}\}/g;

  parseTemplateVariables(template: string): TemplateVariable[] {
    const variables: TemplateVariable[] = [];
    let match;

    while ((match = this.variablePattern.exec(template)) !== null) {
      const variableName = match[1].trim();
      const variable = this.parseVariableDefinition(variableName);
      variables.push(variable);
    }

    return variables;
  }

  private parseVariableDefinition(definition: string): TemplateVariable {
    // Support syntax like: {{project.clientName|default:"Unknown Client"}}
    const parts = definition.split('|');
    const name = parts[0].trim();
    const options = parts.slice(1);

    const variable: TemplateVariable = {
      name,
      type: this.inferVariableType(name),
      source: this.inferVariableSource(name),
      path: name
    };

    // Parse options
    options.forEach(option => {
      const [key, value] = option.split(':').map(s => s.trim());
      switch (key) {
        case 'default':
          variable.defaultValue = value.replace(/"/g, '');
          break;
        case 'type':
          variable.type = value as any;
          break;
        case 'format':
          variable.format = value.replace(/"/g, '');
          break;
      }
    });

    return variable;
  }

  async resolveVariables(
    variables: TemplateVariable[],
    context: {
      project: Project;
      documents: Document[];
      metadata: any;
    }
  ): Promise<Map<string, any>> {
    const resolved = new Map<string, any>();

    for (const variable of variables) {
      try {
        const value = await this.resolveVariableValue(variable, context);
        resolved.set(variable.name, value);
      } catch (error) {
        console.warn(`Failed to resolve variable ${variable.name}:`, error);
        resolved.set(variable.name, variable.defaultValue || '');
      }
    }

    return resolved;
  }

  private async resolveVariableValue(
    variable: TemplateVariable,
    context: any
  ): Promise<any> {
    const pathParts = variable.path.split('.');
    let value = context;

    for (const part of pathParts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        throw new Error(`Path ${variable.path} not found in context`);
      }
    }

    // Apply formatting if specified
    if (variable.format && value) {
      value = this.applyFormatting(value, variable.format);
    }

    return value;
  }

  private applyFormatting(value: any, format: string): string {
    switch (format) {
      case 'date':
        return new Date(value).toLocaleDateString();
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(value);
      case 'percentage':
        return `${(value * 100).toFixed(1)}%`;
      default:
        return String(value);
    }
  }
}
```

### Content Structuring Engine
```typescript
// server/src/services/contentStructuringService.ts
export class ContentStructuringService {
  async structureContent(
    template: string,
    project: Project,
    documents: Document[]
  ): Promise<string> {
    let structuredContent = template;

    // 1. Inject project context
    structuredContent = await this.injectProjectContext(structuredContent, project);

    // 2. Inject document content
    structuredContent = await this.injectDocumentContent(structuredContent, documents);

    // 3. Generate table of contents
    structuredContent = await this.generateTableOfContents(structuredContent);

    // 4. Create cross-references
    structuredContent = await this.createCrossReferences(structuredContent);

    // 5. Add citations
    structuredContent = await this.addCitations(structuredContent, documents);

    return structuredContent;
  }

  private async generateTableOfContents(content: string): Promise<string> {
    const headings = this.extractHeadings(content);
    
    if (headings.length === 0) return content;

    const toc = headings.map((heading, index) => {
      const level = heading.level;
      const indent = '  '.repeat(level - 1);
      const anchor = this.createAnchor(heading.text);
      return `${indent}- [${heading.text}](#${anchor})`;
    }).join('\n');

    // Insert TOC after the first heading
    const firstHeadingIndex = content.indexOf(headings[0].fullMatch);
    const insertIndex = firstHeadingIndex + headings[0].fullMatch.length;
    
    return content.slice(0, insertIndex) + '\n\n## Table of Contents\n\n' + toc + '\n\n' + content.slice(insertIndex);
  }

  private async createCrossReferences(content: string): Promise<string> {
    // Find references like "see Section X" or "as mentioned in Chapter Y"
    const referencePattern = /(see|refer to|as mentioned in)\s+(section|chapter|part)\s+([A-Za-z0-9]+)/gi;
    
    return content.replace(referencePattern, (match, verb, type, identifier) => {
      const anchor = this.createAnchor(identifier);
      return `${verb} [${type} ${identifier}](#${anchor})`;
    });
  }

  private async addCitations(content: string, documents: Document[]): Promise<string> {
    // Add citations for document sources
    const citationPattern = /\[CITATION:(\d+)\]/g;
    
    return content.replace(citationPattern, (match, docIndex) => {
      const doc = documents[parseInt(docIndex) - 1];
      if (doc) {
        return `[${doc.title}](${doc.sourceUrl || '#'})`;
      }
      return match;
    });
  }
}
```

## 4. Real-time Processing Feedback

### WebSocket Integration
```typescript
// server/src/websocket/processFlowWebSocket.ts
import { Server as SocketIOServer } from 'socket.io';

export class ProcessFlowWebSocket {
  private io: SocketIOServer;

  constructor(io: SocketIOServer) {
    this.io = io;
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      socket.on('join-workflow', (workflowId: string) => {
        socket.join(`workflow-${workflowId}`);
      });

      socket.on('leave-workflow', (workflowId: string) => {
        socket.leave(`workflow-${workflowId}`);
      });
    });
  }

  emitWorkflowUpdate(workflowId: string, update: WorkflowUpdate) {
    this.io.to(`workflow-${workflowId}`).emit('workflow-update', update);
  }

  emitStepComplete(workflowId: string, step: ProcessingStep) {
    this.io.to(`workflow-${workflowId}`).emit('step-complete', step);
  }

  emitError(workflowId: string, error: ProcessingError) {
    this.io.to(`workflow-${workflowId}`).emit('workflow-error', error);
  }
}
```

### Progress Tracking Component
```typescript
// app/process-flow/components/ProcessingProgress.tsx
export const ProcessingProgress: React.FC<ProcessingProgressProps> = ({
  workflowId,
  onComplete,
  onError
}) => {
  const [progress, setProgress] = useState<ProcessingFeedback | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.emit('join-workflow', workflowId);

    newSocket.on('workflow-update', (update: WorkflowUpdate) => {
      setProgress(update);
    });

    newSocket.on('step-complete', (step: ProcessingStep) => {
      setProgress(prev => prev ? {
        ...prev,
        completedSteps: [...prev.completedSteps, step],
        currentStep: prev.pendingSteps[0] || prev.currentStep
      } : null);
    });

    newSocket.on('workflow-error', (error: ProcessingError) => {
      onError(error);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [workflowId]);

  return (
    <div className="processing-progress">
      <div className="progress-header">
        <h3>Processing Workflow</h3>
        <div className="overall-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress?.overallProgress || 0}%` }}
            />
          </div>
          <span>{progress?.overallProgress || 0}%</span>
        </div>
      </div>

      <div className="steps-container">
        {progress?.completedSteps.map(step => (
          <div key={step.id} className="step completed">
            <div className="step-icon">✓</div>
            <div className="step-content">
              <h4>{step.name}</h4>
              <p>{step.details}</p>
              <span className="step-time">{step.actualTime}s</span>
            </div>
          </div>
        ))}

        {progress?.currentStep && (
          <div className="step current">
            <div className="step-icon">
              <div className="spinner" />
            </div>
            <div className="step-content">
              <h4>{progress.currentStep.name}</h4>
              <p>{progress.currentStep.details}</p>
              <div className="step-progress">
                <div 
                  className="step-progress-fill"
                  style={{ width: `${progress.currentStep.progress}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {progress?.pendingSteps.map(step => (
          <div key={step.id} className="step pending">
            <div className="step-icon">○</div>
            <div className="step-content">
              <h4>{step.name}</h4>
              <p>Estimated: {step.estimatedTime}s</p>
            </div>
          </div>
        ))}
      </div>

      <div className="token-usage">
        <h4>Token Usage</h4>
        <div className="token-bar">
          <div 
            className="token-fill"
            style={{ width: `${(progress?.tokenUsage.current || 0) / (progress?.tokenUsage.limit || 1) * 100}%` }}
          />
        </div>
        <span>
          {progress?.tokenUsage.current || 0} / {progress?.tokenUsage.limit || 0} tokens
        </span>
      </div>
    </div>
  );
};
```

## 5. Database Migrations

### Migration Files
```sql
-- 001_add_workflow_tables.sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Workflow executions table
CREATE TABLE workflow_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID NOT NULL,
  user_id UUID REFERENCES users(id),
  template_id UUID REFERENCES templates(id),
  project_id UUID REFERENCES projects(id),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  processing_time_ms INTEGER,
  token_usage INTEGER DEFAULT 0,
  compression_stats JSONB,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Document versions table
CREATE TABLE document_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  content TEXT NOT NULL,
  changes_summary TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Compression quality metrics table
CREATE TABLE compression_quality_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  strategy_used VARCHAR(50) NOT NULL,
  original_length INTEGER NOT NULL,
  compressed_length INTEGER NOT NULL,
  compression_ratio DECIMAL(5,4) NOT NULL,
  coherence_score DECIMAL(3,2) NOT NULL,
  completeness_score DECIMAL(3,2) NOT NULL,
  relevance_score DECIMAL(3,2) NOT NULL,
  readability_score DECIMAL(3,2) NOT NULL,
  overall_score DECIMAL(3,2) NOT NULL,
  processing_time_ms INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workflow presets table
CREATE TABLE workflow_presets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  configuration JSONB NOT NULL,
  is_public BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id),
  usage_count INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_workflow_executions_user_id ON workflow_executions(user_id);
CREATE INDEX idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX idx_workflow_executions_created_at ON workflow_executions(created_at);
CREATE INDEX idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX idx_compression_metrics_strategy ON compression_quality_metrics(strategy_used);
CREATE INDEX idx_compression_metrics_score ON compression_quality_metrics(overall_score);
CREATE INDEX idx_workflow_presets_category ON workflow_presets(category);
CREATE INDEX idx_workflow_presets_public ON workflow_presets(is_public);

-- Update existing documents table
ALTER TABLE documents ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS parent_document_id UUID REFERENCES documents(id);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS compression_stats JSONB;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS source_documents JSONB;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS workflow_execution_id UUID REFERENCES workflow_executions(id);
```

This comprehensive technical specification provides the detailed implementation guidance needed to complete the Process Flow Workflow feature to production standards.
