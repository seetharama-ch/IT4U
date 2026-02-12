export const USERS = {
    employee: {
        username: 'emp1',
        password: 'Pass@123',
        name: 'Employee One',
        email: 'emp1@example.com'
    },
    manager: {
        username: 'mgr1',
        password: 'Pass@123',
        name: 'Manager One',
        email: 'mgr1@example.com'
    },
    it_support: {
        username: 'sup1', // Changed from anna
        password: 'Pass@123',
        name: 'Support One',
        email: 'sup1@example.com'
    },
    admin: {
        username: 'admin', // Changed from admin_root
        password: 'admin123',
        name: 'Admin User',
        email: 'admin@geosoftglobal.com'
    },
    dummy_manager: {
        username: 'mgr_dummy',
        password: 'password',
        name: 'Dummy Manager',
        email: 'mgr.dummy@example.com'
    },
    dummy_employee: {
        username: 'emp_dummy',
        password: 'password',
        name: 'Dummy Employee',
        email: 'emp.dummy@example.com'
    },
    it_support_dummy: {
        username: 'it_support_dummy',
        password: 'password',
        name: 'Dummy Support',
        email: 'it.dummy@example.com'
    },
    admin_root: {
        username: 'admin_root',
        password: 'password',
        name: 'Root Admin',
        email: 'root.admin@example.com'
    }
};

export const TICKET_DATA = {
    title: 'E2E Regression Test Ticket',
    description: 'This is an automated test ticket created by Playwright.',
    category: 'HARDWARE', // Must match Ticket.Category ENUM
    priority: 'HIGH'      // Must match Ticket.Priority ENUM
};
