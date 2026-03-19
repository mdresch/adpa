import { NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/auth-utils';
import { digitalTwinEventService } from '@/server/src/services/digitalTwinEventService';
import { logger } from '@/server/src/utils/logger';

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const user = await getAuthenticatedUser(req);
    if (!user) return unauthorizedResponse();

    try {
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '50', 10);

        const events = await digitalTwinEventService.getEventsByAsset(id, limit);
        return NextResponse.json(events);
    } catch (error) {
        logger.error('GET /api/digital-twin/assets/:id/events error', { error });
        return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
    }
}
