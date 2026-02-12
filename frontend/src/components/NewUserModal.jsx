import React, { useState } from 'react';

const NewUserModal = ({ isOpen, onClose, onSave, savedData }) => {
    const [formData, setFormData] = useState(savedData || {
        firstName: '',
        lastName: '',
        displayName: '',
        contactNumber: '',
        employeeId: '',
        designation: '',
        department: '',
        officePackage: 'No',
        pcLaptopIssued: 'No',
        serialNumber: '',
        sharePointPath: '',
        email: ''
    });

    if (!isOpen) return null;

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto backdrop-blur-sm">
            <div className="bg-[var(--bg-card)] rounded-lg shadow-xl w-full max-w-2xl m-4 max-h-[90vh] overflow-y-auto border border-[var(--border-subtle)]">
                <div className="flex justify-between items-center p-6 border-b border-[var(--border-subtle)]">
                    <h2 className="text-xl font-bold text-[var(--text-primary)]">New User Details</h2>
                    <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)]">First Name</label>
                            <input type="text" name="firstName" required className="input-field" value={formData.firstName} onChange={handleChange} placeholder="Enter First Name" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Last Name</label>
                            <input type="text" name="lastName" required className="input-field" value={formData.lastName} onChange={handleChange} placeholder="Enter Last Name" />
                        </div>
                        <div className="col-span-1 sm:col-span-2">
                            <label className="block text-sm font-medium text-[var(--text-secondary)]">Display Name</label>
                            <input type="text" name="displayName" className="input-field" value={formData.displayName} onChange={handleChange} placeholder="e.g., Krishna Maddila" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
                            <input type="email" name="email" required className="input-field" value={formData.email} onChange={handleChange} placeholder="user@example.com" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Contact Number</label>
                            <input type="tel" name="contactNumber" required className="input-field" value={formData.contactNumber} onChange={handleChange} placeholder="Enter Mobile Number" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Employee ID</label>
                            <input type="text" name="employeeId" required className="input-field" value={formData.employeeId} onChange={handleChange} placeholder="Enter Employee ID" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Designation</label>
                            <input type="text" name="designation" required className="input-field" value={formData.designation} onChange={handleChange} placeholder="e.g., IT Support Engineer" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)]">Department</label>
                            <input type="text" name="department" required className="input-field" value={formData.department} onChange={handleChange} placeholder="Enter Department Name" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Office Package Required</label>
                            <select name="officePackage" className="input-field" value={formData.officePackage} onChange={handleChange}>
                                <option value="Yes">Yes</option>
                                <option value="No">No</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)]">PC/Laptop Issued</label>
                            <select name="pcLaptopIssued" className="input-field" value={formData.pcLaptopIssued} onChange={handleChange}>
                                <option value="Yes">Yes</option>
                                <option value="No">No</option>
                            </select>
                        </div>
                        {formData.pcLaptopIssued === 'Yes' && (
                            <div className="col-span-1 sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Laptop Serial Number & Model</label>
                                <input type="text" name="serialNumber" required className="input-field" value={formData.serialNumber} onChange={handleChange} placeholder="Enter Serial Number and Model Name" />
                            </div>
                        )}
                        <div className="col-span-1 sm:col-span-2">
                            <label className="block text-sm font-medium text-[var(--text-secondary)]">SharePoint Path / Folder Access Required</label>
                            <textarea name="sharePointPath" className="input-field" rows="2" value={formData.sharePointPath} onChange={handleChange} placeholder="Enter SharePoint site/folder path to be assigned"></textarea>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-[var(--border-subtle)]">
                        <button type="button" onClick={onClose} className="mr-3 btn bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]">Cancel</button>
                        <button type="submit" className="btn-primary">Save Details</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default NewUserModal;
