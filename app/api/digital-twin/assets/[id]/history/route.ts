import { NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/auth-utils';
import { digitalTwinAssetService } from '@/server/src/services/digitalTwinAssetService';
import { logger } from '@/server/src/utils/logger';

export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    const user = await getAuthenticatedUser(req);
    if (!user) return unauthorizedResponse();

    try {
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '20', 10);

        const history = await digitalTwinAssetService.getStateHistory(params.id, limit);
        return NextResponse.json(history);
    } catch (error) {
        logger.error('GET /api/digital-twin/assets/:id/history error', { error });
        return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
    }
}
