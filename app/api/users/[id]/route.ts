import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/data/users';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const user = await UserService.getUserById(id);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error(`Error fetching user ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const updates = await request.json();

    const updatedUser = await UserService.updateUser(id, updates);

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error(`Error updating user ${params.id}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update user';
    return NextResponse.json(
      { error: errorMessage },
      { status: error instanceof Error && error.message.includes('not found') ? 404 : 400 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    await UserService.deleteUser(id);

    return NextResponse.json(
      { message: 'User deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error(`Error deleting user ${params.id}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete user';
    return NextResponse.json(
      { error: errorMessage },
      { status: error instanceof Error && error.message.includes('not found') ? 404 : 500 }
    );
  }
}