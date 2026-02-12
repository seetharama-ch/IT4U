import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:8060/api' });
const auth = { username: 'admin', password: 'password' };

async function seed() {
    console.log('Seeding users on PROD (8060)...');

    const users = [
        {
            username: 'employee_john',
            password: '{noop}password',
            role: 'EMPLOYEE',
            department: 'Engineering',
            email: 'john.doe@geosoftglobal.com'
        },
        {
            username: 'manager_mike',
            password: '{noop}password',
            role: 'MANAGER',
            department: 'Engineering',
            email: 'mike.manager@geosoftglobal.com'
        },
        {
            username: 'it_support_jane',
            password: '{noop}password',
            role: 'IT_SUPPORT',
            department: 'IT',
            email: 'jane.support@geosoftglobal.com'
        },
        {
            username: 'admin',
            password: '{noop}password',
            role: 'ADMIN',
            department: 'Admin',
            email: 'admin@geosoftglobal.com'
        }
    ];

    for (const u of users) {
        try {
            const res = await api.post('/users', u, { auth });
            if (res.headers['content-type'] && res.headers['content-type'].includes('text/html')) {
                throw new Error('Received HTML response (Likely Login Page) - Basic Auth failed');
            }
            console.log(`${u.username} created (ID: ${res.data.id})`);
        } catch (error) {
            console.log(`${u.username} skipped/error:`, error.response?.data || error.message);
        }
    }
}

seed();
