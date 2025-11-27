class FinanceTracker {
    constructor() {
        this.transactions = JSON.parse(localStorage.getItem('transactions')) || [];
        this.budgetCategories = JSON.parse(localStorage.getItem('budgetCategories')) || [];
        this.goals = JSON.parse(localStorage.getItem('goals')) || [];
        this.expenseCategories = ['Food', 'Transportation', 'Entertainment', 'Shopping', 'Bills', 'Healthcare', 'Other'];
        this.incomeCategories = ['Salary', 'Freelance', 'Investment', 'Gift', 'Other'];
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateDashboard();
        this.renderTransactions();
        this.renderBudgetCategories();
        this.renderGoals();
        this.setupChart();
    }

    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.currentTarget.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // Forms
        document.getElementById('transactionForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addTransaction();
        });

        document.getElementById('budgetForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addBudgetCategory();
        });

        document.getElementById('goalForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addGoal();
        });

        // Filters
        document.getElementById('filterType').addEventListener('change', () => this.renderTransactions());
        document.getElementById('filterPeriod').addEventListener('change', () => this.renderTransactions());

        // Set default date to today
        document.getElementById('date').valueAsDate = new Date();
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.getElementById(tabName).classList.add('active');

        // Update chart if switching to dashboard
        if (tabName === 'dashboard') {
            setTimeout(() => this.updateChart(), 100);
        }
    }

    addTransaction() {
        const type = document.getElementById('transactionType').value;
        const amount = parseFloat(document.getElementById('amount').value);
        const description = document.getElementById('description').value;
        const category = document.getElementById('category').value;
        const date = document.getElementById('date').value;

        const transaction = {
            id: Date.now(),
            type,
            amount,
            description,
            category,
            date,
            timestamp: new Date().toISOString()
        };

        this.transactions.unshift(transaction);
        this.saveData();
        this.updateDashboard();
        this.renderTransactions();
        this.updateChart();
        this.closeModal('transactionModal');
        document.getElementById('transactionForm').reset();
        document.getElementById('date').valueAsDate = new Date();
    }

    addBudgetCategory() {
        const name = document.getElementById('budgetCategory').value;
        const limit = parseFloat(document.getElementById('budgetLimit').value);

        const category = {
            id: Date.now(),
            name,
            limit,
            spent: 0
        };

        this.budgetCategories.push(category);
        this.saveData();
        this.renderBudgetCategories();
        this.closeModal('budgetModal');
        document.getElementById('budgetForm').reset();
    }

    addGoal() {
        const name = document.getElementById('goalName').value;
        const target = parseFloat(document.getElementById('goalTarget').value);
        const deadline = document.getElementById('goalDeadline').value;

        const goal = {
            id: Date.now(),
            name,
            target,
            current: 0,
            deadline
        };

        this.goals.push(goal);
        this.saveData();
        this.renderGoals();
        this.closeModal('goalModal');
        document.getElementById('goalForm').reset();
    }

    updateDashboard() {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        const monthlyTransactions = this.transactions.filter(t => {
            const transactionDate = new Date(t.date);
            return transactionDate.getMonth() === currentMonth && 
                   transactionDate.getFullYear() === currentYear;
        });

        const totalIncome = monthlyTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalExpenses = monthlyTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        const currentBalance = totalIncome - totalExpenses;
        const totalSavings = this.goals.reduce((sum, g) => sum + g.current, 0);

        document.getElementById('currentBalance').textContent = this.formatCurrency(currentBalance);
        document.getElementById('totalIncome').textContent = this.formatCurrency(totalIncome);
        document.getElementById('totalExpenses').textContent = this.formatCurrency(totalExpenses);
        document.getElementById('totalSavings').textContent = this.formatCurrency(totalSavings);

        // Update budget spending
        this.budgetCategories.forEach(budget => {
            budget.spent = monthlyTransactions
                .filter(t => t.type === 'expense' && t.category === budget.name)
                .reduce((sum, t) => sum + t.amount, 0);
        });

        this.renderRecentTransactions();
    }

    renderRecentTransactions() {
        const container = document.getElementById('recentTransactionsList');
        const recent = this.transactions.slice(0, 5);

        if (recent.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-receipt"></i>
                    <h3>No transactions yet</h3>
                    <p>Add your first transaction to get started</p>
                </div>
            `;
            return;
        }

        container.innerHTML = recent.map(transaction => `
            <div class="transaction-item">
                <div class="transaction-info">
                    <div class="transaction-icon ${transaction.type}">
                        <i class="fas fa-${transaction.type === 'income' ? 'arrow-up' : 'arrow-down'}"></i>
                    </div>
                    <div class="transaction-details">
                        <h4>${transaction.description}</h4>
                        <p>${transaction.category} • ${this.formatDate(transaction.date)}</p>
                    </div>
                </div>
                <div class="transaction-amount ${transaction.type}">
                    ${transaction.type === 'income' ? '+' : '-'}${this.formatCurrency(transaction.amount)}
                </div>
            </div>
        `).join('');
    }

    renderTransactions() {
        const container = document.getElementById('transactionsList');
        const filterType = document.getElementById('filterType').value;
        const filterPeriod = document.getElementById('filterPeriod').value;

        let filtered = this.transactions;

        // Filter by type
        if (filterType !== 'all') {
            filtered = filtered.filter(t => t.type === filterType);
        }

        // Filter by period
        if (filterPeriod !== 'all') {
            const now = new Date();
            const startDate = new Date();
            
            if (filterPeriod === 'week') {
                startDate.setDate(now.getDate() - 7);
            } else if (filterPeriod === 'month') {
                startDate.setMonth(now.getMonth() - 1);
            }
            
            filtered = filtered.filter(t => new Date(t.date) >= startDate);
        }

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <h3>No transactions found</h3>
                    <p>Try adjusting your filters</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filtered.map(transaction => `
            <div class="transaction-item">
                <div class="transaction-info">
                    <div class="transaction-icon ${transaction.type}">
                        <i class="fas fa-${transaction.type === 'income' ? 'arrow-up' : 'arrow-down'}"></i>
                    </div>
                    <div class="transaction-details">
                        <h4>${transaction.description}</h4>
                        <p>${transaction.category} • ${this.formatDate(transaction.date)}</p>
                    </div>
                </div>
                <div class="transaction-amount ${transaction.type}">
                    ${transaction.type === 'income' ? '+' : '-'}${this.formatCurrency(transaction.amount)}
                </div>
            </div>
        `).join('');
    }

    renderBudgetCategories() {
        const container = document.getElementById('budgetCategories');

        if (this.budgetCategories.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calculator"></i>
                    <h3>No budget categories</h3>
                    <p>Add categories to track your spending</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.budgetCategories.map(category => {
            const percentage = (category.spent / category.limit) * 100;
            const isOverBudget = percentage > 100;

            return `
                <div class="budget-category">
                    <div class="category-header">
                        <span class="category-name">${category.name}</span>
                        <span class="category-amount">
                            ${this.formatCurrency(category.spent)} / ${this.formatCurrency(category.limit)}
                        </span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill ${isOverBudget ? 'over-budget' : ''}" 
                             style="width: ${Math.min(percentage, 100)}%"></div>
                    </div>
                    <div class="progress-text">
                        ${percentage.toFixed(1)}% used
                        ${isOverBudget ? `(${this.formatCurrency(category.spent - category.limit)} over)` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    renderGoals() {
        const container = document.getElementById('goalsList');

        if (this.goals.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-target"></i>
                    <h3>No savings goals</h3>
                    <p>Set goals to track your progress</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.goals.map(goal => {
            const percentage = (goal.current / goal.target) * 100;
            const daysLeft = Math.ceil((new Date(goal.deadline) - new Date()) / (1000 * 60 * 60 * 24));

            return `
                <div class="goal-item">
                    <div class="goal-header">
                        <span class="goal-name">${goal.name}</span>
                        <span class="goal-target">${this.formatCurrency(goal.target)}</span>
                    </div>
                    <div class="goal-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${Math.min(percentage, 100)}%"></div>
                        </div>
                        <div class="progress-text">
                            ${this.formatCurrency(goal.current)} saved (${percentage.toFixed(1)}%)
                            ${daysLeft > 0 ? `• ${daysLeft} days left` : '• Deadline passed'}
                        </div>
                    </div>
                    <div class="goal-actions">
                        <button class="btn-small" onclick="app.addToGoal(${goal.id})">
                            Add Money
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    addToGoal(goalId) {
        const amount = prompt('How much would you like to add to this goal?');
        if (amount && !isNaN(amount)) {
            const goal = this.goals.find(g => g.id === goalId);
            if (goal) {
                goal.current += parseFloat(amount);
                this.saveData();
                this.renderGoals();
                this.updateDashboard();
            }
        }
    }

    setupChart() {
        const ctx = document.getElementById('expenseChart').getContext('2d');
        this.chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
                        '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
        this.updateChart();
    }

    updateChart() {
        if (!this.chart) return;

        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        const monthlyExpenses = this.transactions.filter(t => {
            const transactionDate = new Date(t.date);
            return t.type === 'expense' && 
                   transactionDate.getMonth() === currentMonth && 
                   transactionDate.getFullYear() === currentYear;
        });

        const categoryTotals = {};
        monthlyExpenses.forEach(expense => {
            categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount;
        });

        const labels = Object.keys(categoryTotals);
        const data = Object.values(categoryTotals);

        this.chart.data.labels = labels;
        this.chart.data.datasets[0].data = data;
        this.chart.update();
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
    }

    saveData() {
        localStorage.setItem('transactions', JSON.stringify(this.transactions));
        localStorage.setItem('budgetCategories', JSON.stringify(this.budgetCategories));
        localStorage.setItem('goals', JSON.stringify(this.goals));
    }
}

// Global functions for modal handling
function openTransactionModal(type) {
    const modal = document.getElementById('transactionModal');
    const title = document.getElementById('modalTitle');
    const typeInput = document.getElementById('transactionType');
    const categorySelect = document.getElementById('category');

    typeInput.value = type;
    title.textContent = type === 'income' ? 'Add Income' : 'Add Expense';

    // Populate categories
    const categories = type === 'income' ? app.incomeCategories : app.expenseCategories;
    categorySelect.innerHTML = categories.map(cat => 
        `<option value="${cat}">${cat}</option>`
    ).join('');

    modal.classList.add('active');
}

function openBudgetModal() {
    document.getElementById('budgetModal').classList.add('active');
}

function openGoalModal() {
    document.getElementById('goalModal').classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Initialize app
const app = new FinanceTracker();