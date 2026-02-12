import React from 'react';

const Footer = () => {
    return (
        <footer
            className="w-full text-center text-xs py-2 border-t opacity-80"
            style={{
                color: 'var(--text-muted)',
                borderColor: 'var(--border-default)',
                backgroundColor: 'var(--bg-card)',
            }}
            data-testid="app-footer"
        >
            <span>
                Created by Seetharam@ IT4U • v1.4 • 2025 © GeoSoftGlobal-Surtech International
            </span>
        </footer>
    );
};

export default Footer;
