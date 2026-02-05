import { useState } from 'react'
import { motion } from 'framer-motion'
import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { 
  DocumentArrowUpIcon, 
  MagnifyingGlassIcon,
  CogIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

export default function QuickActions() {
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return

    setIsUploading(true)
    setUploadProgress(0)

    const formData = new FormData()
    acceptedFiles.forEach(file => formData.append('documents', file))

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (response.ok) {
        const result = await response.json()
        const { summary, message } = result
        
        if (summary.successful > 0) {
          toast.success(`${message}`)
        }
        
        if (summary.failed > 0) {
          toast.error(`${summary.failed} file(s) failed to process`)
        }
      } else {
        const errorData = await response.json()
        throw new Error(errorData.message || errorData.error || 'Upload failed')
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsUploading(false)
      setTimeout(() => setUploadProgress(0), 1000)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md']
    },
    disabled: isUploading
  })

  const actions = [
    {
      title: 'Upload Documents',
      description: 'Add new documents to the knowledge base',
      icon: DocumentArrowUpIcon,
      color: 'from-blue-500 to-blue-600',
      action: () => document.getElementById('file-upload')?.click()
    },
    {
      title: 'Test Search',
      description: 'Run semantic search queries',
      icon: MagnifyingGlassIcon,
      color: 'from-green-500 to-green-600',
      action: () => window.location.href = '/search'
    },
    {
      title: 'Performance Test',
      description: 'Run system performance benchmarks',
      icon: ChartBarIcon,
      color: 'from-purple-500 to-purple-600',
      action: () => handlePerformanceTest()
    },
    {
      title: 'Settings',
      description: 'Configure system parameters',
      icon: CogIcon,
      color: 'from-gray-500 to-gray-600',
      action: () => window.location.href = '/settings'
    }
  ]

  const handlePerformanceTest = async () => {
    toast.loading('Running comprehensive performance test...', { id: 'perf-test' })
    
    try {
      const tests = ['embedding', 'search', 'rag']
      const results = await Promise.all(
        tests.map(test => 
          fetch('/api/dashboard/test-performance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: test, iterations: 10 })
          })
        )
      )

      if (results.every(r => r.ok)) {
        toast.success('All performance tests completed!', { id: 'perf-test' })
      } else {
        throw new Error('Some tests failed')
      }
    } catch (error) {
      toast.error('Performance test failed', { id: 'perf-test' })
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="metric-card"
    >
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg">
          <CogIcon className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
          <p className="text-sm text-gray-600">Common tasks and operations</p>
        </div>
      </div>

      {/* Document Upload Area */}
      <div
        {...getRootProps()}
        className={`mb-6 border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
          isDragActive
            ? 'border-blue-500 bg-blue-50'
            : isUploading
            ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        }`}
      >
        <input {...getInputProps()} id="file-upload" />
        
        {isUploading ? (
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Uploading documents...</p>
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">{uploadProgress}%</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <DocumentArrowUpIcon className="w-12 h-12 mx-auto text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-900">
                {isDragActive ? 'Drop files here' : 'Click to upload or drag and drop'}
              </p>
              <p className="text-xs text-gray-500">PDF, DOCX, TXT, MD files (max 10MB each)</p>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        {actions.slice(1).map((action, index) => {
          const Icon = action.icon
          return (
            <motion.button
              key={action.title}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={action.action}
              className="flex items-center space-x-3 p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:shadow-md transition-all"
            >
              <div className={`p-2 bg-gradient-to-r ${action.color} rounded-lg`}>
                <Icon className="h-4 w-4 text-white" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900">{action.title}</p>
                <p className="text-xs text-gray-500">{action.description}</p>
              </div>
            </motion.button>
          )
        })}
      </div>
    </motion.div>
  )
}
