/**
 * Microsoft Clarity Analytics Provider
 * Uses the official @microsoft/clarity package for better integration
 */

"use client"

import { useEffect } from 'react'
import clarity from '@microsoft/clarity'

interface ClarityProviderProps {
  children: React.ReactNode
  projectId: string
}

export function ClarityProvider({ children, projectId }: ClarityProviderProps) {
  useEffect(() => {
    // Only initialize Clarity on the client side and in production
    if (typeof window !== 'undefined' && projectId) {
      try {
        // Initialize Microsoft Clarity
        clarity.init(projectId)

        console.log(`✅ Microsoft Clarity initialized with project ID: ${projectId}`)
        
        // Set custom dimensions for ADPA application
        clarity.setTag('application', 'ADPA')
        clarity.setTag('version', '1.0.0')
        clarity.setTag('environment', process.env.NODE_ENV || 'development')

      } catch (error) {
        console.warn('⚠️ Failed to initialize Microsoft Clarity:', error)
      }
    }

    // Cleanup function (though Clarity doesn't require explicit cleanup)
    return () => {
      // Clarity cleanup if needed in the future
    }
  }, [projectId])

  return <>{children}</>
}

// Export utility functions for custom event tracking
export const trackClarityEvent = (eventName: string, value?: string | number) => {
  if (typeof window !== 'undefined' && window.clarity) {
    try {
      window.clarity('event', eventName, value?.toString() || '')
      console.log(`📊 Tracked Clarity event: ${eventName} = ${value}`)
    } catch (error) {
      console.warn('⚠️ Failed to track Clarity event:', error)
    }
  }
}

// Export function to identify users (anonymously)
export const identifyClarityUser = (userId: string, customData?: Record<string, string>) => {
  if (typeof window !== 'undefined' && window.clarity) {
    try {
      window.clarity('identify', userId, customData)
      console.log(`👤 Identified Clarity user: ${userId}`)
    } catch (error) {
      console.warn('⚠️ Failed to identify Clarity user:', error)
    }
  }
}

// Export function to set custom tags
export const setClarityTag = (key: string, value: string) => {
  if (typeof window !== 'undefined' && window.clarity) {
    try {
      window.clarity('set', key, value)
      console.log(`🏷️ Set Clarity tag: ${key} = ${value}`)
    } catch (error) {
      console.warn('⚠️ Failed to set Clarity tag:', error)
    }
  }
}

// Export function to track page view
export const trackClarityPageView = (url?: string) => {
  if (typeof window !== 'undefined' && window.clarity) {
    try {
      const pageUrl = url || window.location.pathname
      window.clarity('set', 'page_view', pageUrl)
      console.log(`📄 Tracked Clarity page view: ${pageUrl}`)
    } catch (error) {
      console.warn('⚠️ Failed to track Clarity page view:', error)
    }
  }
}

// Export function to track feature usage
export const trackFeatureUsage = (featureName: string, action: string, metadata?: Record<string, string>) => {
  if (typeof window !== 'undefined' && window.clarity) {
    try {
      window.clarity('set', 'feature', featureName)
      window.clarity('set', 'action', action)
      
      if (metadata) {
        Object.entries(metadata).forEach(([key, value]) => {
          window.clarity('set', `feature_${key}`, value)
        })
      }
      
      console.log(`🚀 Tracked feature usage: ${featureName} - ${action}`)
    } catch (error) {
      console.warn('⚠️ Failed to track feature usage:', error)
    }
  }
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    clarity: any
  }
}
