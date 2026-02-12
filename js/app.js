import { currentUser, tickets, categories } from './mock-data.js';

// DOM Elements
const els = {
    userName: document.getElementById('user-name-display'),
    userRole: document.getElementById('user-role-display'),
    recentTickets: document.getElementById('recent-tickets-list'),
    allTickets: document.getElementById('all-tickets-list'),
    ticketForm: document.getElementById('ticket-form'),
    categorySelect: document.getElementById('ticket-category'),
    dynamicFields: document.getElementById('dynamic-fields')
};

// State
let appState = {
    tickets: [...tickets] // Clone to allow local modification
};

// Initialize
function init() {
    renderUserInfo();
    renderTickets();
    setupEventListeners();
}

function renderUserInfo() {
    els.userName.textContent = currentUser.name;
    els.userRole.textContent = currentUser.role;
}

function renderTickets() {
    // Recent Tickets (Limit 3)
    const recentMarkup = appState.tickets.slice(0, 3).map(ticket => `
        <div style="padding: 1rem; border-bottom: 1px solid var(--glass-border); display: flex; justify-content: space-between; align-items: center;">
            <div>
                <div style="font-weight: 500;">${ticket.subject}</div>
                <div style="font-size: 0.8rem; color: var(--text-secondary);">${ticket.id} • ${ticket.category}</div>
            </div>
            <div style="display: flex; align-items: center; gap: 1rem;">
                <span style="padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; background: rgba(255,255,255,0.1); border: 1px solid var(--glass-border);">
                    ${ticket.status}
                </span>
            </div>
        </div>
    `).join('');
    els.recentTickets.innerHTML = recentMarkup;

    // All Tickets Table
    const allMarkup = appState.tickets.map(ticket => `
        <tr style="border-bottom: 1px solid var(--glass-border);">
            <td style="padding: 1rem;">${ticket.id}</td>
            <td style="padding: 1rem;">${ticket.subject}</td>
            <td style="padding: 1rem;">
                <span style="padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; background: rgba(255,255,255,0.1); border: 1px solid var(--glass-border);">
                    ${ticket.status}
                </span>
            </td>
            <td style="padding: 1rem;">${ticket.date}</td>
        </tr>
    `).join('');
    els.allTickets.innerHTML = allMarkup;
}

function setupEventListeners() {
    // Category Change -> Dynamic Fields
    els.categorySelect.addEventListener('change', (e) => {
        const cat = e.target.value;
        renderDynamicFields(cat);
    });

    // Form Submit
    els.ticketForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // Mock Submission
        const newTicket = {
            id: `INC-2024-${String(appState.tickets.length + 1).padStart(3, '0')}`,
            subject: e.target.querySelector('input[placeholder="Brief description of the issue"]').value,
            category: els.categorySelect.options[els.categorySelect.selectedIndex].text,
            status: "Submitted",
            date: new Date().toISOString().split('T')[0],
            assignedTo: "Unassigned"
        };

        appState.tickets.unshift(newTicket);
        renderTickets();

        // Reset and Navigate
        e.target.reset();
        els.dynamicFields.innerHTML = '';
        window.navigateTo('dashboard');

        // Show simulated toast (alert for now)
        alert(`Ticket ${newTicket.id} created successfully!`);
    });

    // Nav Links (delegation handling via global function in index.html, but we can add class toggling here if needed)
    document.querySelectorAll('.nav-link[data-page]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            window.navigateTo(page);
        });
    });
}

function renderDynamicFields(category) {
    let html = '';

    if (category === 'engineering') {
        html = `
            <div class="form-group slide-in">
                <label class="form-label">Affected Software</label>
                <select class="form-select">
                    ${categories.engineering.map(sw => `<option>${sw}</option>`).join('')}
                </select>
            </div>
             <div class="form-group slide-in">
                <label class="form-label">Workstation Info (Auto-Detected)</label>
                <div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: var(--radius-sm); font-size: 0.85rem; color: var(--text-secondary);">
                    <i class="fa-solid fa-microchip"></i> ${currentUser.device.model} | ${currentUser.device.gpu} | ${currentUser.device.os}
                </div>
            </div>
        `;
    } else if (category === 'software') {
        html = `
             <div class="form-group slide-in">
                <label class="form-label">Software Name</label>
                <select class="form-select">
                    ${categories.software.map(sw => `<option>${sw}</option>`).join('')}
                </select>
            </div>
        `;
    }

    els.dynamicFields.innerHTML = html;
}

// Run
document.addEventListener('DOMContentLoaded', init);
