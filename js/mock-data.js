export const currentUser = {
    name: "Alex Design",
    role: "Engineering",
    device: {
        model: "Dell Precision 5820",
        gpu: "NVIDIA RTX A4000",
        os: "Windows 11 Pro",
        hostname: "DESKTOP-ENG-042"
    }
};

export const tickets = [
    {
        id: "INC-2024-001",
        subject: "AutoCAD 2024 Crashing on Launch",
        category: "Engineering",
        subcategory: "AutoCAD",
        status: "In Progress",
        date: "2024-12-05",
        assignedTo: "IT Support"
    },
    {
        id: "REQ-2024-045",
        subject: "Need Access to Project X Folder",
        category: "Access",
        status: "Pending Approval",
        date: "2024-12-06",
        assignedTo: "Manager"
    },
    {
        id: "INC-2024-002",
        subject: "Outlook Search not working",
        category: "Microsoft 365",
        status: "Resolved",
        date: "2024-12-01",
        assignedTo: "Helpdesk"
    }
];

export const categories = {
    software: ["Adobe Creative Cloud", "Microsoft Visio", "Python 3.11"],
    engineering: ["AutoCAD 2025", "Revit 2025", "Navisworks Manage", "Cyclone Register 360"],
    hardware: ["Monitor Replacement", "Peripheral Issue", "Laptop Battery"],
    access: ["Folder Access", "VPN Access", "SharePoint Site"]
};
