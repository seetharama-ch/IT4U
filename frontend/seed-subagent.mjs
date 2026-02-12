import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:8080/api' });
const auth = { username: 'admin', password: 'password' };

async function seed() {
    console.log('Seeding users...');

    try {
        await api.post('/users', {
            username: 'mgr_dummy',
            password: 'password',
            role: 'MANAGER',
            department: 'Engineering'
        }, { auth });
        console.log('mgr_dummy created');
    } catch (error) {
        console.log('mgr_dummy skipped:', error.message);
    }

    try {
        await api.post('/users', {
            username: 'emp_dummy',
            password: 'password',
            role: 'EMPLOYEE',
            department: 'Engineering',
            managerName: 'mgr_dummy'
        }, { auth });
        console.log('emp_dummy created');
    } catch (error) {
        console.log('emp_dummy skipped:', error.message);
    }

    try {
        await api.post('/users', {
            username: 'it_support_dummy',
            password: 'password',
            role: 'IT_SUPPORT',
            department: 'IT'
        }, { auth });
        console.log('it_support_dummy created');
    } catch (error) {
        console.log('it_support_dummy skipped:', error.message);
    }
}

seed();
