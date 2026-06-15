/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import ProjectWorkspaceOrchestrator from '../../app/projects/[id]/components/project-workspace';
import { apiClient } from '../../lib/api';

// Mock the dependencies
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/projects/123'
}));

jest.mock('../../lib/api', () => ({
  apiClient: {
    getProject: jest.fn()
  }
}));

jest.mock('../../app/projects/[id]/components/ProjectSocketRoom', () => ({
  ProjectSocketRoom: () => <div data-testid="socket-room" />
}));

describe('ProjectWorkspaceOrchestrator Contract Guards', () => {
  beforeEach(() => {
    (apiClient.getProject as jest.Mock).mockResolvedValue({
      id: '123',
      name: 'Test Project',
      description: 'Test Description',
      status: 'active',
      framework: 'PMBOK',
      priority: 'high'
    });
  });

  it('Contract Guard: Workspace must expose an Edit Project button', async () => {
    render(<ProjectWorkspaceOrchestrator projectId="123" />);

    // Wait for the loading state to finish
    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });

    try {
      const editButton = screen.getByRole('link', { name: /Edit Project/i }) || screen.getByText(/Edit Project/i);
      expect(editButton).toBeInTheDocument();
    } catch (error) {
      throw new Error(`INSTRUCTIONAL ERROR: The Project Workspace must provide an 'Edit Project' button to allow stakeholders to update the project's meta-information. Ensure a button or link containing 'Edit Project' is rendered in the header dock.`);
    }
  });
});
