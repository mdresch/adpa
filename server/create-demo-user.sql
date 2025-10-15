-- Create demo users for production
-- Password hashes are for: admin123 and demo123

-- Admin user
INSERT INTO users (id, email, password_hash, name, role, permissions, is_active)
VALUES (
  '3a82e0e8-c54d-4f99-b1d7-e651ce101341',
  'admin@adpa.com',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5koYV.LkN/0W2', -- admin123
  'System Administrator',
  'admin',
  '{"users.create":true,"users.update":true,"users.delete":true,"projects.create":true,"projects.update":true,"projects.delete":true,"documents.create":true,"documents.update":true,"documents.delete":true,"templates.create":true,"templates.update":true,"templates.delete":true,"ai.generate":true,"ai.configure":true,"analytics.system":true,"security.view":true,"security.manage":true,"security.audit":true,"integrations.create":true,"integrations.update":true,"integrations.delete":true,"integrations.view":true,"integrations.manage":true,"integrations.test":true,"integrations.sync":true,"jobs.stats":true,"jobs.admin":true}'::jsonb,
  true
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  is_active = EXCLUDED.is_active;

-- Demo user
INSERT INTO users (id, email, password_hash, name, role, permissions, is_active)
VALUES (
  'b1f3d2c4-e5a6-4b7c-8d9e-f0a1b2c3d4e5',
  'demo@adpa.com',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5koYV.LkN/0W2', -- demo123
  'Demo User',
  'user',
  '{"projects.create":true,"projects.update":true,"documents.create":true,"documents.update":true,"templates.create":true,"templates.update":true,"ai.generate":true}'::jsonb,
  true
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  is_active = EXCLUDED.is_active;

-- Verify users were created
SELECT id, email, name, role, is_active, created_at 
FROM users 
WHERE email IN ('admin@adpa.com', 'demo@adpa.com')
ORDER BY email;

