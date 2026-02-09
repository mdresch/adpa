-- Create Supabase Integration Record
-- This script creates a Supabase integration in the database

-- Insert Supabase integration
INSERT INTO integrations (
    id,
    name,
    type,
    configuration,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'Supabase Platform',
    'supabase',
    jsonb_build_object(
        'description', 'Manage Supabase projects, edge functions, and database operations',
        'features', jsonb_build_array(
            'project_management',
            'edge_functions',
            'migrations',
            'database_operations'
        )
    ),
    NOW(),
    NOW()
)
ON CONFLICT DO NOTHING
RETURNING id, name, type;

-- Display the created integration
SELECT 
    id,
    name,
    type,
    configuration,
    created_at
FROM integrations
WHERE type = 'supabase'
ORDER BY created_at DESC
LIMIT 1;
