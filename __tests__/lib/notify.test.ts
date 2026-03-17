/**
 * @jest-environment jsdom
 */
import { jest } from '@jest/globals'
import { toast } from '../../lib/notify'
import { sendNotification } from '../../lib/notifications'

// Mock the notifications adapter
jest.mock('../../lib/notifications', () => ({
  sendNotification: jest.fn(),
}))

describe('notify utility', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock window.toast Success/Error
    if (typeof window !== 'undefined') {
      ;(window as any).toast = {
        success: jest.fn(),
        error: jest.fn(),
      }
    }
  })

  it('passes simple message to success toast', () => {
    toast.success('Test message')
    
    // Check notification bus
    expect(sendNotification).toHaveBeenCalledWith(expect.objectContaining({
      type: 'success',
      message: 'Test message',
      title: 'Success'
    }))

    // Check window toast
    expect((window as any).toast.success).toHaveBeenCalledWith('Test message', {
      description: undefined
    })
  })

  it('passes description to success toast', () => {
    toast.success('Main message', { description: 'Detailed description' })
    
    expect(sendNotification).toHaveBeenCalledWith(expect.objectContaining({
      description: 'Detailed description'
    }))

    expect((window as any).toast.success).toHaveBeenCalledWith('Main message', {
      description: 'Detailed description'
    })
  })

  it('passes title and description to error toast', () => {
    toast.error('Failed', { title: 'Custom Error', description: 'Internal error' })
    
    expect(sendNotification).toHaveBeenCalledWith(expect.objectContaining({
      type: 'error',
      title: 'Custom Error',
      description: 'Internal error'
    }))

    expect((window as any).toast.error).toHaveBeenCalledWith('Failed', {
      description: 'Internal error'
    })
  })

  it('respects suppressAdapter option', () => {
    toast.success('Silent', { suppressAdapter: true })
    
    expect(sendNotification).not.toHaveBeenCalled()
    expect((window as any).toast.success).toHaveBeenCalled()
  })
})
