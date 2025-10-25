"use client"

import { RAGStatus } from '@/components/program/RAGStatus';

export default function RAGStatusDemoPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">RAG Status Widget Demo</h1>
      
      <div className="space-y-8">
        {/* Basic Examples */}
        <section className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Basic Status Indicators</h2>
          <div className="flex gap-6 items-center">
            <div className="flex flex-col items-center gap-2">
              <RAGStatus status="green" />
              <span className="text-sm text-gray-600">Green</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <RAGStatus status="amber" />
              <span className="text-sm text-gray-600">Amber</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <RAGStatus status="red" />
              <span className="text-sm text-gray-600">Red (Pulse)</span>
            </div>
          </div>
        </section>

        {/* Size Variants */}
        <section className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Size Variants</h2>
          <div className="flex gap-6 items-center">
            <div className="flex flex-col items-center gap-2">
              <RAGStatus status="green" size="sm" />
              <span className="text-sm text-gray-600">Small</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <RAGStatus status="amber" size="md" />
              <span className="text-sm text-gray-600">Medium</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <RAGStatus status="red" size="lg" />
              <span className="text-sm text-gray-600">Large</span>
            </div>
          </div>
        </section>

        {/* With Labels */}
        <section className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">With Labels</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <RAGStatus status="green" showLabel />
            </div>
            <div className="flex items-center gap-2">
              <RAGStatus status="amber" showLabel />
            </div>
            <div className="flex items-center gap-2">
              <RAGStatus status="red" showLabel />
            </div>
          </div>
        </section>

        {/* With Tooltips */}
        <section className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">With Breakdown Tooltips</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">Hover to see breakdown:</p>
              <div className="flex gap-4">
                <RAGStatus 
                  status="green" 
                  showTooltip
                  breakdown={{ green: 5, amber: 0, red: 0 }}
                />
                <RAGStatus 
                  status="amber" 
                  showTooltip
                  breakdown={{ green: 2, amber: 1, red: 0 }}
                />
                <RAGStatus 
                  status="red" 
                  showTooltip
                  breakdown={{ green: 1, amber: 2, red: 3 }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Clickable */}
        <section className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Clickable (Interactive)</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <RAGStatus 
                status="green" 
                showLabel 
                onClick={() => alert('Green status clicked!')} 
              />
              <span className="text-sm text-gray-500">Click me!</span>
            </div>
            <div className="flex items-center gap-2">
              <RAGStatus 
                status="amber" 
                size="lg"
                showLabel 
                onClick={() => alert('Amber status clicked!')} 
              />
              <span className="text-sm text-gray-500">Click me!</span>
            </div>
            <div className="flex items-center gap-2">
              <RAGStatus 
                status="red" 
                size="lg"
                showLabel 
                onClick={() => alert('Red status clicked!')} 
              />
              <span className="text-sm text-gray-500">Click me!</span>
            </div>
          </div>
        </section>

        {/* Full Example */}
        <section className="border rounded-lg p-6 bg-gray-50">
          <h2 className="text-xl font-semibold mb-4">Complete Example (All Features)</h2>
          <div className="space-y-4">
            <div className="bg-white p-4 rounded border">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Project Alpha</h3>
                  <p className="text-sm text-gray-600">23 sub-projects</p>
                </div>
                <RAGStatus 
                  status="amber" 
                  size="lg"
                  showLabel
                  showTooltip
                  breakdown={{ green: 15, amber: 6, red: 2 }}
                  onClick={() => alert('View project details')}
                />
              </div>
            </div>
            
            <div className="bg-white p-4 rounded border">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Project Beta</h3>
                  <p className="text-sm text-gray-600">8 sub-projects</p>
                </div>
                <RAGStatus 
                  status="green" 
                  size="lg"
                  showLabel
                  showTooltip
                  breakdown={{ green: 8, amber: 0, red: 0 }}
                  onClick={() => alert('View project details')}
                />
              </div>
            </div>

            <div className="bg-white p-4 rounded border">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Project Gamma</h3>
                  <p className="text-sm text-gray-600">12 sub-projects</p>
                </div>
                <RAGStatus 
                  status="red" 
                  size="lg"
                  showLabel
                  showTooltip
                  breakdown={{ green: 3, amber: 4, red: 5 }}
                  onClick={() => alert('View project details')}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Usage Code */}
        <section className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Usage Example</h2>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded overflow-x-auto text-sm">
{`import { RAGStatus } from '@/components/program/RAGStatus';

// Simple usage
<RAGStatus status="green" />

// With label
<RAGStatus status="amber" showLabel />

// With tooltip
<RAGStatus 
  status="amber" 
  showTooltip
  breakdown={{ green: 2, amber: 1, red: 0 }}
/>

// Full example
<RAGStatus 
  status="red" 
  size="lg" 
  showLabel
  showTooltip
  breakdown={{ green: 1, amber: 2, red: 3 }}
  onClick={() => navigate('/details')}
/>`}
          </pre>
        </section>
      </div>
    </div>
  );
}
