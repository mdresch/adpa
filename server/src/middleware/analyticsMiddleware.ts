/**
 * Analytics Middleware
 * 
 * Automatically tracks all API requests for analytics purposes
 */

import { Request, Response, NextFunction } from 'express';
import AnalyticsTrackingService from '../services/analyticsTrackingService';

export const analyticsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Capture original end method
  const originalEnd = res.end;
  const originalJson = res.json;

  let responseSize = 0;

  // Override res.json to capture response size
  res.json = function (body: any) {
    responseSize = JSON.stringify(body).length;
    return originalJson.call(this, body);
  };

  // Override res.end to track the request
  res.end = function (chunk?: any, encoding?: any, callback?: any) {
    const responseTimeMs = Date.now() - startTime;

    // Track the request asynchronously (don't wait for it)
    setImmediate(() => {
      AnalyticsTrackingService.trackAPIRequest({
        method: req.method,
        path: req.path,
        responseTimeMs,
        statusCode: res.statusCode,
        userId: (req as any).user?.id || undefined,
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        requestSize: req.headers['content-length'] ? parseInt(req.headers['content-length']) : 0,
        responseSize,
        errorMessage: res.statusCode >= 400 ? (res as any).errorMessage : undefined,
      });
    });

    // Call original end method
    return originalEnd.call(this, chunk, encoding, callback);
  };

  next();
};

/**
 * User Activity Tracking Helper
 * 
 * Call this manually in routes to track specific user actions
 */
export const trackActivity = {
  /**
   * Track user login
   */
  login: (userId: string, sessionId?: string): Promise<any> => {
    return AnalyticsTrackingService.trackUserActivity({
      userId,
      sessionId,
      activityType: 'login',
      activityCategory: 'auth',
      description: 'User logged in',
    });
  },

  /**
   * Track user logout
   */
  logout: (userId: string, sessionId?: string): Promise<any> => {
    return AnalyticsTrackingService.trackUserActivity({
      userId,
      sessionId,
      activityType: 'logout',
      activityCategory: 'auth',
      description: 'User logged out',
    });
  },

  /**
   * Track document view
   */
  viewDocument: async (userId: string, documentId: string, projectId: string, readTimeSeconds?: number) => {
    // Track in user activity logs
    const activityPromise = AnalyticsTrackingService.trackUserActivity({
      userId,
      activityType: 'view_document',
      activityCategory: 'document',
      entityType: 'document',
      entityId: documentId,
      description: 'Viewed document',
    });

    // Track in document analytics
    const analyticsPromise = AnalyticsTrackingService.trackDocumentAnalytics({
      documentId,
      projectId,
      action: 'view',
      userId,
      readTimeSeconds,
    });

    await Promise.all([activityPromise, analyticsPromise]);
  },

  /**
   * Track document edit
   */
  editDocument: async (userId: string, documentId: string, projectId: string) => {
    const activityPromise = AnalyticsTrackingService.trackUserActivity({
      userId,
      activityType: 'edit_document',
      activityCategory: 'document',
      entityType: 'document',
      entityId: documentId,
      description: 'Edited document',
    });

    const analyticsPromise = AnalyticsTrackingService.trackDocumentAnalytics({
      documentId,
      projectId,
      action: 'edit',
      userId,
    });

    await Promise.all([activityPromise, analyticsPromise]);
  },

  /**
   * Track document creation
   */
  createDocument: (userId: string, documentId: string, projectId: string, metadata?: any): Promise<any> => {
    return AnalyticsTrackingService.trackUserActivity({
      userId,
      activityType: 'create_document',
      activityCategory: 'document',
      entityType: 'document',
      entityId: documentId,
      description: 'Created document',
      metadata,
    });
  },

  /**
   * Track document export
   */
  exportDocument: async (
    userId: string,
    documentId: string,
    projectId: string,
    format: 'pdf' | 'docx'
  ) => {
    const activityPromise = AnalyticsTrackingService.trackUserActivity({
      userId,
      activityType: `export_document_${format}`,
      activityCategory: 'document',
      entityType: 'document',
      entityId: documentId,
      description: `Exported document as ${format.toUpperCase()}`,
    });

    const analyticsPromise = AnalyticsTrackingService.trackDocumentAnalytics({
      documentId,
      projectId,
      action: format === 'pdf' ? 'export_pdf' : 'export_docx',
      userId,
    });

    await Promise.all([activityPromise, analyticsPromise]);
  },

  /**
   * Track project creation
   */
  createProject: (userId: string, projectId: string, metadata?: any): Promise<any> => {
    return AnalyticsTrackingService.trackUserActivity({
      userId,
      activityType: 'create_project',
      activityCategory: 'project',
      entityType: 'project',
      entityId: projectId,
      description: 'Created project',
      metadata,
    });
  },

  /**
   * Track project view
   */
  viewProject: (userId: string, projectId: string): Promise<any> => {
    return AnalyticsTrackingService.trackUserActivity({
      userId,
      activityType: 'view_project',
      activityCategory: 'project',
      entityType: 'project',
      entityId: projectId,
      description: 'Viewed project',
    });
  },

  /**
   * Track AI generation
   */
  aiGeneration: (
    userId: string,
    requestType: string,
    metadata?: any
  ): Promise<any> => {
    return AnalyticsTrackingService.trackUserActivity({
      userId,
      activityType: 'ai_generation',
      activityCategory: 'ai',
      description: `AI generation: ${requestType}`,
      metadata,
    });
  },

  /**
   * Track template usage
   */
  useTemplate: (userId: string, templateId: string, metadata?: any): Promise<any> => {
    return AnalyticsTrackingService.trackUserActivity({
      userId,
      activityType: 'use_template',
      activityCategory: 'template',
      entityType: 'template',
      entityId: templateId,
      description: 'Used template',
      metadata,
    });
  },

  /**
   * Track template view
   */
  viewTemplate: (userId: string, templateId: string): Promise<any> => {
    return AnalyticsTrackingService.trackUserActivity({
      userId,
      activityType: 'view_template',
      activityCategory: 'template',
      entityType: 'template',
      entityId: templateId,
      description: 'Viewed template',
    });
  },

  /**
   * Track template creation
   */
  createTemplate: (userId: string, templateId: string, metadata?: any): Promise<any> => {
    return AnalyticsTrackingService.trackUserActivity({
      userId,
      activityType: 'create_template',
      activityCategory: 'template',
      entityType: 'template',
      entityId: templateId,
      description: 'Created template',
      metadata,
    });
  },

  /**
   * Track template update
   */
  updateTemplate: (userId: string, templateId: string, metadata?: any): Promise<any> => {
    return AnalyticsTrackingService.trackUserActivity({
      userId,
      activityType: 'update_template',
      activityCategory: 'template',
      entityType: 'template',
      entityId: templateId,
      description: 'Updated template',
      metadata,
    });
  },

  /**
   * Track template deletion
   */
  deleteTemplate: (userId: string, templateId: string): Promise<any> => {
    return AnalyticsTrackingService.trackUserActivity({
      userId,
      activityType: 'delete_template',
      activityCategory: 'template',
      entityType: 'template',
      entityId: templateId,
      description: 'Deleted template',
    });
  },
};

export default analyticsMiddleware;

