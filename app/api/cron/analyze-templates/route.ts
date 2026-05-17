import { NextResponse } from 'next/server';

// Removed: This route imported backend-only code and cannot run in the Next.js API context.
// Please POST directly to the backend Express API for template analysis.

export const runtime = 'nodejs'; // Node.js runtime required for pg and complex logic
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    // Verify Cron Secret if configured
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response('Unauthorized', { status: 401 });
    }

    logger.info('[CRON] Starting Template Analysis Job via Vercel Cron');

    try {
        // Ensure database is connected
        await connectDatabase();

        // Run the analysis
        await templateImprovementService.analyzeAllTemplates();

        return NextResponse.json({
            success: true,
            message: 'Template analysis completed',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('[CRON] Template Analysis Job failed', { error });
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
