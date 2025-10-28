import { pool, connectDatabase } from '../src/database/connection'
import { v4 as uuidv4 } from 'uuid'

async function addOllamaProvider() {
  try {
    // Connect to database first
    await connectDatabase()
    
    console.log('🦙 Adding Ollama provider to database...')

    // Check if Ollama provider already exists
    const existingCheck = await pool!.query(
      'SELECT id, name FROM ai_providers WHERE provider_type = $1',
      ['ollama']
    )

    if (existingCheck.rows.length > 0) {
      console.log('⚠️  Ollama provider already exists:', existingCheck.rows[0].name)
      console.log('   ID:', existingCheck.rows[0].id)
      return
    }

    // Base64 encode a placeholder API key (Ollama doesn't require one for local)
    const encryptedKey = Buffer.from('ollama-local').toString('base64')

    // Insert Ollama provider
    const result = await pool!.query(
      `INSERT INTO ai_providers (
        name, 
        provider_type, 
        api_key_encrypted, 
        configuration,
        is_active,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING id, name, provider_type`,
      [
        'Ollama (Local)',
        'ollama',
        encryptedKey,
        JSON.stringify({
          endpoint: 'http://localhost:11434',
          baseURL: 'http://localhost:11434',
          models: [
            'llama3.1:latest',
            'llama3.1:8b',
            'llama2:latest',
            'mistral:latest',
            'codellama:latest',
            'phi3:latest',
            'gemma2:latest'
          ],
          description: 'Local Ollama instance running in Docker'
        }),
        true
      ]
    )

    console.log('✅ Successfully added Ollama provider!')
    console.log('   ID:', result.rows[0].id)
    console.log('   Name:', result.rows[0].name)
    console.log('   Type:', result.rows[0].provider_type)
    console.log('   Endpoint: http://localhost:11434')
    console.log('   Models: llama3.1, llama2, mistral, codellama, phi3, gemma2')
    console.log('')
    console.log('📝 Note: Ollama uses localhost:11434 by default')
    console.log('   Make sure Ollama is running: docker ps | grep ollama')
    console.log('   Pull models: docker exec -it <container> ollama pull llama3.1')

  } catch (error) {
    console.error('❌ Error adding Ollama provider:', error)
    throw error
  } finally {
    await pool!.end()
  }
}

addOllamaProvider()

