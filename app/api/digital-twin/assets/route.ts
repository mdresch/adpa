import { NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/auth-utils';
import { digitalTwinAssetService } from '@/server/src/services/digitalTwinAssetService';
import { logger } from '@/server/src/utils/logger';

export async function GET(req: Request) {
    const user = await getAuthenticatedUser(req);
    if (!user) return unauthorizedResponse();

    try {
        const { searchParams } = new URL(req.url);
        const projectId = searchParams.get('projectId');

        if (!projectId) {
            return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
        }

        // Note: In a real migration, we might want to check if the user has access to the project
        // but the original Express route didn't have explicit project access check via digitalTwinAssetService
        // however, getAuthenticatedUser already ensures the user is logged in.

        const assets = await digitalTwinAssetService.getAssetsByProject(projectId);
        return NextResponse.json(assets);
    } catch (error) {
        logger.error('GET /api/digital-twin/assets error', { error });
        return NextResponse.json({ error: 'Failed to fetch assets' }, { status: 500 });
    }
}
