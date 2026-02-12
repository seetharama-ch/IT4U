INSERT INTO users (username, password, role, full_name, email, department, active, created_by_admin, auth_provider) 
VALUES ('manager_mike', 'password', 'MANAGER', 'Mike Manager', 'mike@test.com', 'IT', true, true, 'LOCAL') 
ON CONFLICT (username) DO UPDATE 
SET password = EXCLUDED.password, role = EXCLUDED.role, active = EXCLUDED.active, created_by_admin = EXCLUDED.created_by_admin, auth_provider = EXCLUDED.auth_provider;

