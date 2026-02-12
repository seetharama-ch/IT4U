import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:8060/api' });

async function tryLogin(username, password) {
    console.log(`Trying ${username}:${password}...`);
    try {
        const res = await api.get('/users', {
            auth: { username, password }
        });
        console.log('SUCCESS:', res.status);
    } catch (e) {
        console.log('FAILED:', e.response?.status);
        console.log('Headers:', e.response?.headers['www-authenticate']);
    }
}

async function test() {
    // Check Health
    try {
        const h = await axios.get('http://localhost:8060/actuator/health');
        console.log('Health:', h.status, h.data);
    } catch (e) { console.log('Health Failed', e.message); }

    await tryLogin('admin', 'password');
}

test();
