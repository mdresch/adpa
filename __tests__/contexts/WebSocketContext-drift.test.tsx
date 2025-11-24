/**
 * @jest-environment jsdom
 */

import { renderHook, waitFor } from '@testing-library/react'
import { useDriftDetection, WebSocketContext } from '@/contexts/WebSocketContext'
import { toast } from 'sonner'

// Mock the dependencies
jest.mock('sonner')
jest.mock('@/lib/api', () => ({
  apiClient: {
    connectWebSocket: jest.fn(() => ({
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn(),
      connected: true,
    })),
  },
}))

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    isAuthenticated: true,
    user: { id: 'test-user-id', email: 'test@example.com' },
    token: 'test-token',
  })),
}))

describe('WebSocket Drift Detection', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should accept drift detection events', () => {
    // This is a basic test to ensure the hook structure is correct
    // Full integration testing would require a mock WebSocket server
    expect(useDriftDetection).toBeDefined()
  })

  it('should return an empty array initially', () => {
    // Provide a lightweight mock context so the hook can subscribe without
    // triggering the full provider's lifecycle/side-effects.
    const mockContext = {
      socket: null,
      isConnected: false,
      joinRoom: jest.fn(),
      leaveRoom: jest.fn(),
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      roomStatuses: {},
      getRoomStatus: () => undefined,
    }

    const wrapper = ({ children }: any) => (
      <WebSocketContext.Provider value={mockContext as any}>
        {children}
      </WebSocketContext.Provider>
    )
    const { result } = renderHook(() => useDriftDetection('test-project-id'), { wrapper })
    expect(Array.isArray(result.current)).toBe(true)
    expect(result.current).toHaveLength(0)
  })
})
