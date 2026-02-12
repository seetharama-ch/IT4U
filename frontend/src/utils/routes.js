export function ticketDetailsPath(ticketId) {
    return `/app/tickets/${ticketId}`;
}

export function dashboardPathByRole(role) {
    switch (role) {
        case "ADMIN": return "/app/admin";
        case "MANAGER": return "/app/manager";
        case "IT_SUPPORT": return "/app/it-support";
        default: return "/app/employee";
    }
}
