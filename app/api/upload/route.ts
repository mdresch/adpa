import { NextRequest, NextResponse } from 'next/server'
import {
    BlobServiceClient,
    StorageSharedKeyCredential,
    generateBlobSASQueryParameters,
    BlobSASPermissions,
} from '@azure/storage-blob'
import { getAuthenticatedUser } from '@/lib/auth-utils'
import { v4 as uuidv4 } from 'uuid'

// Limit file size (e.g. 10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024
const CONTAINER_NAME = process.env.AZURE_STORAGE_UPLOADS_CONTAINER || 'morphic-uploads'
const SAS_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

function getBlobServiceClient(): BlobServiceClient {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING
    if (connectionString) {
        return BlobServiceClient.fromConnectionString(connectionString)
    }

    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME
    const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY
    if (!accountName || !accountKey) {
        throw new Error('Azure Storage is not configured (set AZURE_STORAGE_CONNECTION_STRING or AZURE_STORAGE_ACCOUNT_NAME/AZURE_STORAGE_ACCOUNT_KEY)')
    }
    const credential = new StorageSharedKeyCredential(accountName, accountKey)
    return new BlobServiceClient(`https://${accountName}.blob.core.windows.net`, credential)
}

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

        const user = await getAuthenticatedUser(req)
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Sanitize filename
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const blobName = `${user.id}/${chatId}/${uuidv4()}-${safeName}`

        const blobServiceClient = getBlobServiceClient()
        const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME)
        const blockBlobClient = containerClient.getBlockBlobClient(blobName)

        const buffer = Buffer.from(await file.arrayBuffer())
        await blockBlobClient.uploadData(buffer, {
            blobHTTPHeaders: { blobContentType: file.type },
        })

        const credential = blobServiceClient.credential
        let url = blockBlobClient.url
        if (credential instanceof StorageSharedKeyCredential) {
            const sasToken = generateBlobSASQueryParameters(
                {
                    containerName: CONTAINER_NAME,
                    blobName,
                    permissions: BlobSASPermissions.parse('r'),
                    startsOn: new Date(),
                    expiresOn: new Date(Date.now() + SAS_TTL_MS),
                },
                credential
            ).toString()
            url = `${blockBlobClient.url}?${sasToken}`
        }

        return NextResponse.json({
            file: {
                url,
                name: file.name,
                key: blobName,
            }
        })

    } catch (error) {
        console.error('Upload handler error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
