-- Phase 3.2: Clean up bad rows where hostname == ip_address
UPDATE devices
SET hostname = NULL
WHERE hostname = ip_address;
