import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:8060/api' });
const auth = { username: 'admin', password: 'password' }; // Admin works now!

async function reset(username, id) {
    if (!id) {
        // Fetch ID first
        try {
            // We can't fetch by username easily via API without listing all
            // But let's assume we can fetch list
            const res = await api.get('/users', { auth });
            const user = res.data.find(u => u.username === username);
            if (user) id = user.id;
            else {
                console.log(`${username} not found in list`);
                return;
            }
        } catch (e) {
            console.log(`Failed to list users: ${e.message}`);
            return;
        }
    }

    console.log(`Resetting password for ${username} (ID: ${id}) to password...`);
    try {
        await api.post(`/users/${id}/reset-password`, { newPassword: 'password' }, { auth });
        console.log(`${username} reset success.`);
    } catch (error) {
        console.log(`${username} reset failed:`, error.response?.data || error.message);
    }
}

async function run() {
    await reset('employee_john');
    await reset('manager_mike');
    await reset('it_support_jane');
}

run();
