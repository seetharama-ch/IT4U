import React, { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import { Link } from 'react-router-dom';

const KnowledgeBase = () => {
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const [articles, setArticles] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [newArticle, setNewArticle] = useState({ title: '', content: '', category: 'General' });

    const isAdminOrSupport = user && (user.role === 'ADMIN' || user.role === 'IT_SUPPORT');

    useEffect(() => {
        fetchArticles();
    }, []);

    const fetchArticles = async () => {
        try {
            const response = await apiClient.get('/kb');
            setArticles(response.data);
        } catch (error) {
            console.error('Error fetching articles:', error);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await apiClient.post('/kb', {
                ...newArticle,
                author: { id: user.id }
            });
            setIsCreating(false);
            setNewArticle({ title: '', content: '', category: 'General' });
            fetchArticles();
        } catch (error) {
            console.error('Error creating article:', error);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this article?')) return;
        try {
            await apiClient.delete(`/kb/${id}`);
            fetchArticles();
        } catch (error) {
            console.error('Error deleting article:', error);
        }
    };

    const filteredArticles = articles.filter(article =>
        article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.content.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-[var(--text-primary)]">Knowledge Base</h1>
                {isAdminOrSupport && (
                    <button
                        onClick={() => setIsCreating(!isCreating)}
                        className="btn-primary"
                    >
                        {isCreating ? 'Cancel' : 'Create Article'}
                    </button>
                )}
            </div>

            {isCreating && (
                <div className="bg-[var(--bg-card)] shadow rounded-lg p-6 mb-6">
                    <h2 className="text-xl font-bold mb-4 text-[var(--text-primary)]">New Article</h2>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)]">Title</label>
                            <input
                                type="text"
                                required
                                value={newArticle.title}
                                onChange={e => setNewArticle({ ...newArticle, title: e.target.value })}
                                className="mt-1 block w-full rounded-md border-[var(--border-subtle)] bg-[var(--bg-input)] text-[var(--text-primary)] shadow-sm focus:border-[var(--accent)] focus:ring-[var(--accent)] sm:text-sm border p-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)]">Category</label>
                            <select
                                value={newArticle.category}
                                onChange={e => setNewArticle({ ...newArticle, category: e.target.value })}
                                className="mt-1 block w-full rounded-md border-[var(--border-subtle)] bg-[var(--bg-input)] text-[var(--text-primary)] shadow-sm focus:border-[var(--accent)] focus:ring-[var(--accent)] sm:text-sm border p-2"
                            >
                                <option>General</option>
                                <option>Hardware</option>
                                <option>Software</option>
                                <option>Network</option>
                                <option>Access</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)]">Content</label>
                            <textarea
                                required
                                rows={5}
                                value={newArticle.content}
                                onChange={e => setNewArticle({ ...newArticle, content: e.target.value })}
                                className="mt-1 block w-full rounded-md border-[var(--border-subtle)] bg-[var(--bg-input)] text-[var(--text-primary)] shadow-sm focus:border-[var(--accent)] focus:ring-[var(--accent)] sm:text-sm border p-2"
                            />
                        </div>
                        <button type="submit" className="btn-primary">Publish</button>
                    </form>
                </div>
            )}

            <div className="mb-6">
                <input
                    type="text"
                    placeholder="Search articles..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full rounded-md border-[var(--border-subtle)] bg-[var(--bg-input)] text-[var(--text-primary)] shadow-sm focus:border-[var(--accent)] focus:ring-[var(--accent)] sm:text-sm border p-3"
                />
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredArticles.map(article => (
                    <div key={article.id} className="bg-[var(--bg-card)] shadow rounded-lg p-6 hover:shadow-lg transition-shadow border border-[var(--border-subtle)]">
                        <div className="flex justify-between items-start">
                            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">{article.title}</h3>
                            {isAdminOrSupport && (
                                <button
                                    onClick={() => handleDelete(article.id)}
                                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 text-sm"
                                >
                                    Delete
                                </button>
                            )}
                        </div>
                        <span className="inline-block bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs px-2 py-1 rounded-full mb-3">
                            {article.category}
                        </span>
                        <p className="text-[var(--text-secondary)] text-sm mb-4 line-clamp-3">
                            {article.content}
                        </p>
                        <div className="text-xs text-[var(--text-muted)]">
                            Posted by {article.author ? article.author.username : 'Unknown'} on {new Date(article.createdAt).toLocaleDateString()}
                        </div>
                    </div>
                ))}
                {filteredArticles.length === 0 && (
                    <div className="col-span-full text-center py-12 text-gray-500">
                        No articles found.
                    </div>
                )}
            </div>
        </div>
    );
};

export default KnowledgeBase;
