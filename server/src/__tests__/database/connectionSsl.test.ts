import { buildSslConfig, stripLibpqSslQueryParams } from '../../database/connection'

describe('buildSslConfig', () => {
  const poolerUrl =
    'postgresql://postgres.xxx@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true'

  afterEach(() => {
    delete process.env.ADPA_STRICT_SUPABASE_TLS
    delete process.env.ADPA_ALLOW_INSECURE_TLS
    delete process.env.DATABASE_SSL_REJECT_UNAUTHORIZED
    delete process.env.DB_SSL_REJECT_UNAUTHORIZED
  })

  it('defaults to relaxed TLS for Supabase pooler (Render/PaaS)', () => {
    expect(buildSslConfig(poolerUrl)).toEqual({ rejectUnauthorized: false })
  })

  it('allows strict TLS when ADPA_STRICT_SUPABASE_TLS=true', () => {
    process.env.ADPA_STRICT_SUPABASE_TLS = 'true'
    expect(buildSslConfig(poolerUrl)).toEqual({ rejectUnauthorized: true })
  })

  it('strips libpq ssl query params from connection strings', () => {
    const cleaned = stripLibpqSslQueryParams(
      'postgresql://u:p@host:5432/db?sslmode=require&pgbouncer=true'
    )
    expect(cleaned).not.toContain('sslmode=')
    expect(cleaned).toContain('pgbouncer=true')
  })
})
