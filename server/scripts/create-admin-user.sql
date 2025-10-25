-- Create admin user for ADPA system configuration
-- Password: Admin123! (change after first login!)
-- Run with: psql "YOUR_POSTGRES_URL" -f create-admin-user.sql

INSERT INTO users (
  id, 
  email, 
  password_hash, 
  name, 
  role, 
  is_active,
  created_at
) VALUES (
  gen_random_uuid(),
  'admin@adpa.local',
  -- bcrypt hash for "Admin123!" 
  '$2a$10$YourBcryptHashHere',
  'System Administrator',
  'admin',
  true,
  CURRENT_TIMESTAMP
)
ON CONFLICT (email) DO UPDATE SET
  role = 'admin',
  is_active = true;

-- Verify admin user
SELECT id, email, name, role, is_active FROM users WHERE email = 'admin@adpa.local';

