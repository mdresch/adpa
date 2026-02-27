import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { v4 as uuidv4 } from 'uuid'

// Limit file size (e.g. 10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData()
        const file = formData.get('file') as File
        const chatId = formData.get('chatId') as string

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 })
        }

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: 'File too large' }, { status: 400 })
        }

        const supabase = await createClient()

        // Verify auth
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const bucket = 'morphic_uploads'
        // Sanitize filename
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const fileName = `${user.id}/${chatId}/${uuidv4()}-${safeName}`

        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(fileName, file, {
                upsert: false,
                contentType: file.type
            })

        if (error) {
            console.error('Supabase upload error:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(data.path)

        return NextResponse.json({
            file: {
                url: publicUrl,
                name: file.name,
                key: data.path,
            }
        })

    } catch (error) {
        console.error('Upload handler error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
