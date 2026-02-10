import { NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-utils';
import { pool } from '@/server/src/database/connection';
import { logger } from '@/server/src/utils/logger';
import { validate as isUuid } from 'uuid';

const normalizeTeamMembers = (rawTeamMembers: unknown): string[] => {
    if (!rawTeamMembers) return [];
    if (Array.isArray(rawTeamMembers)) {
        return rawTeamMembers.filter((value): value is string => typeof value === 'string' && value.length > 0);
    }
    if (typeof rawTeamMembers === 'string') {
        try {
            const parsed = JSON.parse(rawTeamMembers);
            if (Array.isArray(parsed)) {
                return parsed.filter((value): value is string => typeof value === 'string' && value.length > 0);
            }
        } catch {
            return rawTeamMembers.split(',').map(v => v.trim()).filter(v => v.length > 0);
        }
    }
    return [];
};

export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    const requester = await getAuthenticatedUser(req);
    if (!requester) return unauthorizedResponse();

    const projectId = params.id;

    try {
        const projectResult = await pool.query(
            "SELECT id, owner_id, team_members FROM projects WHERE id = $1",
            [projectId]
        );

        if (projectResult.rows.length === 0) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        const project = projectResult.rows[0];
        const teamMembers = normalizeTeamMembers(project.team_members);
        const teamMemberSet = new Set(teamMembers);

        const hasAccess =
            requester.role === 'admin' ||
            requester.role === 'super_admin' ||
            project.owner_id === requester.id ||
            teamMemberSet.has(requester.id);

        if (!hasAccess) {
            return forbiddenResponse();
        }

        const validUserIds = teamMembers.filter(id => isUuid(id));
        let members = teamMembers.map(id => ({ id, name: null, email: null, role: null, avatar_url: null }));

        if (validUserIds.length > 0) {
            const usersResult = await pool.query(
                "SELECT id, name, email, role, avatar_url FROM users WHERE id = ANY($1::uuid[])",
                [validUserIds]
            );

            const userMap = new Map(usersResult.rows.map(user => [user.id, user]));
            members = teamMembers.map(id => {
                const user = userMap.get(id);
                return {
                    id,
                    name: user?.name || null,
                    email: user?.email || null,
                    role: user?.role || null,
                    avatar_url: user?.avatar_url || null
                };
            });
        }

        return NextResponse.json({
            success: true,
            data: members,
            count: members.length
        });
    } catch (error) {
        logger.error('Error fetching project team members', { error, projectId });
        return NextResponse.json({ error: "Failed to load team members" }, { status: 500 });
    }
}
