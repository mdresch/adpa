import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/data/users';

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const role = searchParams.get('role');
    const search = searchParams.get('search');
    const isActive = searchParams.has('isActive') ? searchParams.get('isActive') === 'true' : undefined;
    const page = searchParams.has('page') ? parseInt(searchParams.get('page') || '1', 10) : 1;
    const limit = searchParams.has('limit') ? parseInt(searchParams.get('limit') || '50', 10) : 50;

    // Build filters
    const filters: any = {};
    if (role) filters.role = role;
    if (search) filters.search = search;
    if (isActive !== undefined) filters.isActive = isActive;
    if (page) filters.page = page;
    if (limit) filters.limit = limit;

    // Get users with filters
    const result = await UserService.getUsers(filters);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in users API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Create user
    const user = await UserService.createUser(body);

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create user';
    return NextResponse.json(
      { error: errorMessage },
      { status: 400 }
    );
  }
}