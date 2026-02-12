export const users = {
    employee: {
        username: process.env.E2E_EMP_USER || "employee1",
        password: process.env.E2E_EMP_PASS || "Pass@123",
    },
    manager: {
        username: process.env.E2E_MGR_USER || "manager1",
        password: process.env.E2E_MGR_PASS || "Pass@123",
    },
    itSupport: {
        username: process.env.E2E_ITS_USER || "itsupport1",
        password: process.env.E2E_ITS_PASS || "Pass@123",
    },
    admin: {
        username: process.env.E2E_ADM_USER || "admin",
        password: process.env.E2E_ADM_PASS || "Admin@123",
    },
};
