// Frontend JavaScript for K8s Multi-Tier App

class K8sApp {
    constructor() {
        // Use environment variable or default to localhost for development
        this.apiBaseUrl = window.location.hostname === 'localhost' 
            ? 'http://localhost:3000' 
            : `http://${window.location.hostname}:3000`;
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.checkSystemStatus();
        this.loadUsers();
        
        // Auto-refresh status every 30 seconds
        setInterval(() => this.checkSystemStatus(), 30000);
    }

    bindEvents() {
        // Form submission
        document.getElementById('user-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addUser();
        });

        // Refresh buttons
        document.getElementById('refresh-status').addEventListener('click', () => {
            this.checkSystemStatus();
        });

        document.getElementById('refresh-users').addEventListener('click', () => {
            this.loadUsers();
        });
    }

    async checkSystemStatus() {
        const backendStatus = document.getElementById('backend-status');
        const databaseStatus = document.getElementById('database-status');

        try {
            backendStatus.textContent = '🟡 Checking...';
            backendStatus.className = 'status-indicator status-connecting';

            const response = await fetch(`${this.apiBaseUrl}/health`);
            const data = await response.json();

            if (response.ok) {
                backendStatus.textContent = '🟢 Online';
                backendStatus.className = 'status-indicator status-online';

                // Update database status based on health check
                if (data.database === 'connected') {
                    databaseStatus.textContent = '🟢 Connected';
                    databaseStatus.className = 'status-indicator status-online';
                } else {
                    databaseStatus.textContent = '🔴 Disconnected';
                    databaseStatus.className = 'status-indicator status-offline';
                }
            } else {
                throw new Error('Backend not responding properly');
            }
        } catch (error) {
            console.error('Status check failed:', error);
            backendStatus.textContent = '🔴 Offline';
            backendStatus.className = 'status-indicator status-offline';
            databaseStatus.textContent = '🔴 Unknown';
            databaseStatus.className = 'status-indicator status-offline';
        }
    }

    async loadUsers() {
        const container = document.getElementById('users-container');
        container.innerHTML = '<div class="loading">Loading users...</div>';

        try {
            const response = await fetch(`${this.apiBaseUrl}/api/users`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const users = await response.json();
            this.displayUsers(users);
        } catch (error) {
            console.error('Failed to load users:', error);
            container.innerHTML = `
                <div class="no-users">
                    ❌ Failed to load users<br>
                    <small>Error: ${error.message}</small><br>
                    <small>Make sure the backend is running and database is connected</small>
                </div>
            `;
        }
    }

    displayUsers(users) {
        const container = document.getElementById('users-container');
        
        if (users.length === 0) {
            container.innerHTML = `
                <div class="no-users">
                    👤 No users found<br>
                    <small>Add your first user using the form above!</small>
                </div>
            `;
            return;
        }

        const usersHtml = users.map(user => `
            <div class="user-card" data-user-id="${user.id}">
                <div class="user-info">
                    <h4>${this.escapeHtml(user.name)}</h4>
                    <p>📧 ${this.escapeHtml(user.email)}</p>
                    <p>📅 ${new Date(user.created_at).toLocaleDateString()}</p>
                </div>
                <div class="user-actions">
                    <button class="btn btn-danger" onclick="app.deleteUser(${user.id})">
                        Delete
                    </button>
                </div>
            </div>
        `).join('');

        container.innerHTML = usersHtml;
    }

    async addUser() {
        const form = document.getElementById('user-form');
        const messageDiv = document.getElementById('form-message');
        const formData = new FormData(form);
        
        const userData = {
            name: formData.get('name').trim(),
            email: formData.get('email').trim()
        };

        if (!userData.name || !userData.email) {
            this.showMessage('Please fill in all fields', 'error');
            return;
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/api/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData)
            });

            const result = await response.json();

            if (response.ok) {
                this.showMessage(`User "${userData.name}" added successfully!`, 'success');
                form.reset();
                this.loadUsers(); // Refresh the users list
            } else {
                throw new Error(result.error || 'Failed to add user');
            }
        } catch (error) {
            console.error('Failed to add user:', error);
            this.showMessage(`Error: ${error.message}`, 'error');
        }
    }

    async deleteUser(userId) {
        if (!confirm('Are you sure you want to delete this user?')) {
            return;
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/api/users/${userId}`, {
                method: 'DELETE'
            });

            const result = await response.json();

            if (response.ok) {
                this.showMessage('User deleted successfully', 'success');
                this.loadUsers(); // Refresh the users list
            } else {
                throw new Error(result.error || 'Failed to delete user');
            }
        } catch (error) {
            console.error('Failed to delete user:', error);
            this.showMessage(`Error: ${error.message}`, 'error');
        }
    }

    showMessage(message, type) {
        const messageDiv = document.getElementById('form-message');
        messageDiv.textContent = message;
        messageDiv.className = `message ${type}`;
        messageDiv.style.display = 'block';

        // Hide message after 5 seconds
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 5000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new K8sApp();
});

// Handle page visibility for auto-refresh
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && window.app) {
        window.app.checkSystemStatus();
        window.app.loadUsers();
    }
});