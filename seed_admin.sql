INSERT INTO users (username, password, role, full_name, email, department, active, created_by_admin, auth_provider) 
VALUES ('admin', 'password', 'ADMIN', 'Admin User', 'admin@geosoft.com', 'IT', true, true, 'LOCAL') 
ON CONFLICT (username) DO UPDATE 
SET password = EXCLUDED.password, role = EXCLUDED.role, active = EXCLUDED.active;
