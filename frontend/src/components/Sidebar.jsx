import React from 'react';
import { NavLink } from 'react-router-dom';

const Sidebar = () => {
    return (
        <nav className="sidebar glass-panel">
            <div className="logo">
                <h2 className="text-gradient"><i className="fa-solid fa-layer-group"></i> IT4U</h2>
            </div>

            <div className="nav-links">
                <NavLink to="/app/employee" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                    <i className="fa-solid fa-house"></i> Dashboard
                </NavLink>
                <NavLink to="/app/admin/users" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                    <i className="fa-solid fa-users"></i> Users
                </NavLink>
                <NavLink to="/app/tickets/new" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                    <i className="fa-solid fa-plus-circle"></i> Raise Ticket
                </NavLink>
                <NavLink to="/app/employee" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                    <i className="fa-solid fa-ticket"></i> My Tickets
                </NavLink>
                <NavLink to="/app/kb" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                    <i className="fa-solid fa-book"></i> Knowledge Base
                </NavLink>
            </div>

            <div className="mt-auto">
                <a href="#" className="nav-link">
                    <i className="fa-solid fa-user-shield"></i> Admin View
                </a>
                <div className="user-mini-profile glass-panel mt-4 p-[10px] text-[0.85rem]">
                    <div className="font-semibold">Alex Design</div>
                    <div className="text-[var(--text-secondary)]">Engineering</div>
                </div>
            </div>
        </nav>
    );
};

export default Sidebar;
