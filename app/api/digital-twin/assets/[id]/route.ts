import { NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/auth-utils';
import { digitalTwinAssetService } from '@/server/src/services/digitalTwinAssetService';
import { logger } from '@/server/src/utils/logger';

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const user = await getAuthenticatedUser(req);
    if (!user) return unauthorizedResponse();

    try {
        const asset = await digitalTwinAssetService.getAssetById(id);
        if (!asset) {
            return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
        }
        return NextResponse.json(asset);
    } catch (error) {
        logger.error('GET /api/digital-twin/assets/:id error', { error });
        return NextResponse.json({ error: 'Failed to fetch asset' }, { status: 500 });
    }
}
