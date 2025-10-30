// Storage keys
const STORAGE_KEYS = {
  auth: 'zeniwise_auth',
  currentUser: 'zeniwise_current_user',
  userPrefix: 'zeniwise_user_',
  dataPrefix: 'zeniwise_data_',
  profilePrefix: 'zeniwise_profile_'
};

// Voice/Chat Language State
let currentVoiceLanguage = 'en-IN';
let currentChatLanguage = 'en';

// Temporary budget data for wizard
let tempBudgetData = {
  income: 0,
  method: 'recommended',
  allocations: {}
};

// Budget Recommendations based on income level
const BUDGET_RECOMMENDATIONS = {
  low_income: {
    threshold: 7000,
    percentages: { Food: 40, Travel: 16, Study: 10, Misc: 10, Savings: 24 }
  },
  medium_income: {
    threshold: 15000,
    percentages: { Food: 35, Travel: 15, Study: 10, Misc: 15, Savings: 25 }
  },
  high_income: {
    threshold: 999999,
    percentages: { Food: 30, Travel: 15, Study: 10, Misc: 15, Savings: 30 }
  }
};

// Category icons
const CATEGORY_ICONS = {
  Food: '🍔',
  Travel: '🚌',
  Study: '📚',
  Misc: '🛍️',
  Savings: '💰'
};

// Default data for first-time users (EMPTY on first login)
const DEFAULT_DATA = {
  income: 5000,
  expenses: [], // Empty for first-time users
  goals: []
};

// App data object - using in-memory storage only
// Data persists only during the browser session

// No IndexedDB - using in-memory storage only due to sandbox restrictions

const appData = {
  user: null,
  income: 5000,
  monthlyBudgets: {},
  expenses: [],
  goals: [],
  currentMonth: null,
  profile: null,
  gamification: {
    level: 1,
    xp: 0,
    streak: 0,
    longestStreak: 0,
    lastActiveDate: null,
    achievements: [],
    streakDates: []
  }
};

// In-Memory Storage (No localStorage - sandboxed environment)
const memoryStorage = {};

function saveToStorage(key, data) {
  memoryStorage[key] = JSON.parse(JSON.stringify(data)); // Deep clone
}

function loadFromStorage(key, defaultValue = null) {
  return memoryStorage[key] ? JSON.parse(JSON.stringify(memoryStorage[key])) : defaultValue;
}

function initializeDefaultData(username) {
  // Check if this is first time user
  const userDataKey = STORAGE_KEYS.dataPrefix + username;
  if (!loadFromStorage(userDataKey)) {
    const userData = {
      income: 5000,
      expenses: [], // Empty on first login
      goals: [],
      monthlyBudgets: {},
      currentMonth: getCurrentMonthKey(),
      gamification: {
        level: 1,
        xp: 0,
        streak: 0,
        longestStreak: 0,
        lastActiveDate: null,
        achievements: [],
        streakDates: []
      }
    };
    saveToStorage(userDataKey, userData);
    
    // Initialize profile
    const profileKey = STORAGE_KEYS.profilePrefix + username;
    const profileData = {
      username: username,
      profilePicture: null,
      parentMobile: null,
      alertThreshold: 110,
      monthlySummary: true,
      emergencyAlerts: true,
      darkMode: false,
      notifications: true,
      privacyMode: false
    };
    saveToStorage(profileKey, profileData);
  }
}

function loadAllData(username) {
  if (!username) return false;
  
  const userDataKey = STORAGE_KEYS.dataPrefix + username;
  const userData = loadFromStorage(userDataKey);
  
  if (userData) {
    appData.user = { username };
    appData.income = userData.income || 5000;
    appData.monthlyBudgets = userData.monthlyBudgets || {};
    appData.expenses = userData.expenses || [];
    appData.goals = userData.goals || [];
    appData.currentMonth = userData.currentMonth || getCurrentMonthKey();
    appData.gamification = userData.gamification || {
      level: 1,
      xp: 0,
      streak: 0,
      longestStreak: 0,
      lastActiveDate: null,
      achievements: [],
      streakDates: []
    };
  }
  
  // Load profile
  const profileKey = STORAGE_KEYS.profilePrefix + username;
  const profileData = loadFromStorage(profileKey);
  if (profileData) {
    appData.profile = profileData;
    return profileData.privacyMode || false;
  }
  
  return false;
}

function saveMonthlyBudgets() {
  saveUserData();
}

function saveUserData() {
  if (!appData.user) return;
  
  const userDataKey = STORAGE_KEYS.dataPrefix + appData.user.username;
  const userData = {
    income: appData.income,
    expenses: appData.expenses,
    goals: appData.goals,
    monthlyBudgets: appData.monthlyBudgets,
    currentMonth: appData.currentMonth,
    gamification: appData.gamification
  };
  saveToStorage(userDataKey, userData);
}

function saveProfileData() {
  if (!appData.user) return;
  
  const profileKey = STORAGE_KEYS.profilePrefix + appData.user.username;
  saveToStorage(profileKey, appData.profile);
}

function saveCurrentMonth(month) {
  appData.currentMonth = month;
  saveUserData();
}

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthName(monthKey) {
  const [year, month] = monthKey.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function saveIncome(income) {
  appData.income = income;
  saveUserData();
}

function saveExpenses() {
  saveUserData();
  console.log('✅ Expenses saved to memory:', appData.expenses.length, 'items');
}

function saveGoals() {
  saveUserData();
}

function saveGamification() {
  saveUserData();
}

function savePrivacyMode(mode) {
  if (appData.profile) {
    appData.profile.privacyMode = mode;
    saveProfileData();
  }
}

const financialTips = [
  { icon: '🍳', text: 'Cook at home twice a week to save ₹300/month.' },
  { icon: '🚌', text: 'Use public transport instead of rideshares.' },
  { icon: '📊', text: 'Track small expenses to avoid overspending.' },
  { icon: '🏦', text: 'Set aside 10% of income for emergencies.' },
  { icon: '🛒', text: 'Buy in bulk for groceries to save money.' },
  { icon: '🎓', text: 'Use student discounts whenever possible.' },
  { icon: '📚', text: 'Share textbooks with classmates to reduce costs.' },
  { icon: '🥪', text: 'Pack lunch instead of eating out daily.' }
];

let privacyMode = false;
let currentView = 'dashboard';
let nextExpenseId = 1;
let nextGoalId = 1;

// Authentication Functions

// Quick Access Functions
function skipLogin() {
  // Create guest user
  const guestUsername = 'guest_' + Date.now();
  saveToStorage(STORAGE_KEYS.currentUser, guestUsername);
  initializeDefaultData(guestUsername);
  loadAllData(guestUsername);
  showApp();
}

function useDemoAccount() {
  // Use demo account with pre-filled data
  const demoUsername = 'demo';
  saveToStorage(STORAGE_KEYS.currentUser, demoUsername);
  
  // Check if demo account exists, if not create it
  const authData = loadFromStorage(STORAGE_KEYS.auth) || {};
  if (!authData[demoUsername]) {
    authData[demoUsername] = { password: 'demo123', email: 'demo@zeniwise.com', name: 'Demo User' };
    saveToStorage(STORAGE_KEYS.auth, authData);
  }
  
  initializeDefaultData(demoUsername);
  loadAllData(demoUsername);
  
  // Add some demo expenses if none exist
  if (appData.expenses.length === 0) {
    const today = new Date();
    const monthKey = getCurrentMonthKey();
    appData.expenses = [
      { id: 1, date: today.toISOString().split('T')[0], category: 'Food', amount: 150, notes: 'Lunch at campus', month: monthKey },
      { id: 2, date: today.toISOString().split('T')[0], category: 'Travel', amount: 50, notes: 'Bus fare', month: monthKey },
      { id: 3, date: today.toISOString().split('T')[0], category: 'Study', amount: 300, notes: 'Textbooks', month: monthKey }
    ];
    nextExpenseId = 4;
    saveExpenses();
  }
  
  showApp();
}

function showLoginForm() {
  const quickAccess = document.getElementById('quickAccessButtons');
  const loginForm = document.getElementById('loginForm');
  
  if (quickAccess) quickAccess.style.display = 'none';
  if (loginForm) loginForm.classList.add('active');
}

function hideLoginForm() {
  const quickAccess = document.getElementById('quickAccessButtons');
  const loginForm = document.getElementById('loginForm');
  
  if (quickAccess) quickAccess.style.display = 'flex';
  if (loginForm) loginForm.classList.remove('active');
}

function switchToLogin(e) {
  if (e) e.preventDefault();
  const quickAccess = document.getElementById('quickAccessButtons');
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  
  if (quickAccess) quickAccess.style.display = 'none';
  if (loginForm) loginForm.classList.add('active');
  if (signupForm) signupForm.classList.remove('active');
}

function switchToSignup(e) {
  if (e) e.preventDefault();
  const quickAccess = document.getElementById('quickAccessButtons');
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  
  if (quickAccess) quickAccess.style.display = 'none';
  if (loginForm) loginForm.classList.remove('active');
  if (signupForm) signupForm.classList.add('active');
}

function initAuth() {
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const authTabs = document.querySelectorAll('.auth-tab');

  // Tab switching
  authTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      authTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      if (tabName === 'login') {
        loginForm.classList.add('active');
        signupForm.classList.remove('active');
      } else {
        signupForm.classList.add('active');
        loginForm.classList.remove('active');
      }
    });
  });

  // Login form
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    
    if (username && password) {
      // Check if user exists
      const authData = loadFromStorage(STORAGE_KEYS.auth) || {};
      const userAuth = authData[username];
      
      // Support both old (string) and new (object) format
      const isValid = userAuth && 
        (typeof userAuth === 'string' ? userAuth === password : userAuth.password === password);
      
      if (isValid) {
        // Valid login
        saveToStorage(STORAGE_KEYS.currentUser, username);
        initializeDefaultData(username);
        loadAllData(username);
        showApp();
      } else {
        alert('Invalid username or password');
      }
    }
  });

  // Signup form with validation
  signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const username = document.getElementById('signupUsername').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;
    const income = parseInt(document.getElementById('signupIncome').value);
    
    // Validation
    if (name.length < 2) {
      alert('Please enter your full name (at least 2 characters)');
      return;
    }
    
    if (username.length < 3) {
      alert('Username must be at least 3 characters');
      return;
    }
    
    if (password.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }
    
    if (password !== confirmPassword) {
      alert('Passwords do not match. Please try again.');
      return;
    }
    
    if (!income || income <= 0) {
      alert('Please enter a valid monthly income');
      return;
    }
    
    // Check if username already exists
    const authData = loadFromStorage(STORAGE_KEYS.auth) || {};
    if (authData[username]) {
      alert('Username already exists. Please choose another or login.');
      return;
    }
    
    // Save credentials with email and name
    authData[username] = { password, email, name };
    saveToStorage(STORAGE_KEYS.auth, authData);
    saveToStorage(STORAGE_KEYS.currentUser, username);
    
    // Initialize user data (empty expenses on first login)
    initializeDefaultData(username);
    loadAllData(username);
    appData.income = income;
    saveUserData();
    
    // Show success message briefly
    alert('✅ Account created successfully! Welcome to Zeniwise!');
    
    showApp();
  });
}

function showApp() {
  document.getElementById('authScreen').classList.remove('active');
  document.getElementById('appScreen').classList.add('active');
  
  // Update hero username
  if (appData.user && appData.user.username) {
    document.getElementById('heroUsername').textContent = appData.user.username;
  }
  
  // Show welcome message for first-time users with empty expenses
  if (appData.expenses.length === 0) {
    const heroTitle = document.querySelector('.hero-title');
    if (heroTitle) {
      heroTitle.innerHTML = `Welcome to Zeniwise, <span id="heroUsername">${appData.user.username}</span>! 🎉<br><span style="font-size: 18px; font-weight: 400; opacity: 0.9;">Start your financial journey today!</span>`;
    }
  }
  
  // Check and update streak
  updateDailyStreak();
  updateGamificationUI();
  
  // Initialize current month if not set
  if (!appData.currentMonth) {
    appData.currentMonth = getCurrentMonthKey();
    saveCurrentMonth(appData.currentMonth);
  }
  
  // Check if budget exists for current month, if not show wizard
  if (!appData.monthlyBudgets[appData.currentMonth]) {
    setTimeout(() => showBudgetWizard(), 500);
  }
  
  // Data is already in memory, no need to load
  
  updateDashboard();
  renderExpensesList();
  renderGoalsList();
  renderTipsList();
  renderAchievementsList();
  renderAIInsights();
  drawChart();
}

// No IndexedDB loading - data is in memory only

// Navigation
function initNavigation() {
  const navButtons = document.querySelectorAll('.nav-btn[data-view]');
  const privacyToggle = document.getElementById('privacyToggle');
  const logoutBtn = document.getElementById('logoutBtn');
  const themeToggle = document.getElementById('themeToggle');
  
  // Dark mode toggle
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
      const isDark = document.body.classList.contains('dark-mode');
      themeToggle.textContent = isDark ? '☀️' : '🌙';
      saveToStorage('zeniwise_theme', isDark ? 'dark' : 'light');
    });
    
    // Load saved theme
    const savedTheme = loadFromStorage('zeniwise_theme', 'light');
    if (savedTheme === 'dark') {
      document.body.classList.add('dark-mode');
      themeToggle.textContent = '☀️';
    }
  }

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      switchView(view);
      
      navButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Render specific views
      if (view === 'budgetPlanner') {
        renderBudgetPlanner();
      } else if (view === 'monthlyReport') {
        generateMonthlyReport();
      } else if (view === 'achievements') {
        renderAchievementsList();
        renderStreakCalendar();
      } else if (view === 'insights') {
        renderAIInsights();
      } else if (view === 'parentCoPilot') {
        loadParentCoPilotSettings();
        updateParentCoPilotStatus();
      }
    });
  });

  privacyToggle.addEventListener('click', () => {
    privacyMode = !privacyMode;
    privacyToggle.classList.toggle('active');
    document.body.classList.toggle('privacy-mode', privacyMode);
    savePrivacyMode(privacyMode);
  });
}

function switchView(viewName) {
  const views = document.querySelectorAll('.view');
  views.forEach(view => view.classList.remove('active'));
  
  const targetView = document.getElementById(viewName + 'View') || document.getElementById(viewName + 'Screen');
  if (targetView) {
    targetView.classList.add('active');
    currentView = viewName;
    
    // Update specific views when shown
    if (viewName === 'dashboard') {
      updateDashboard();
      renderExpensesList();
      drawChart();
    } else if (viewName === 'parentView') {
      updateParentView();
    }
  }
}

// Dashboard Functions
function updateDashboard() {
  const totalIncome = appData.income;
  const totalSpent = calculateTotalSpent();
  const remainingSavings = totalIncome - totalSpent;

  document.getElementById('totalIncome').textContent = formatCurrency(totalIncome);
  document.getElementById('totalSpent').textContent = formatCurrency(totalSpent);
  document.getElementById('remainingSavings').textContent = formatCurrency(remainingSavings);
  
  // Update budget summary
  updateBudgetSummary();
  updateBudgetHealthAlert();
}

function updateBudgetSummary() {
  const currentMonthKey = appData.currentMonth || getCurrentMonthKey();
  const monthBudget = appData.monthlyBudgets[currentMonthKey];
  
  document.getElementById('currentMonthDisplay').textContent = getMonthName(currentMonthKey);
  
  if (!monthBudget) {
    document.getElementById('budgetHealthScore').textContent = '--';
    document.getElementById('totalBudget').textContent = '₹0';
    document.getElementById('budgetUsed').textContent = '₹0';
    document.getElementById('daysRemaining').textContent = '--';
    return;
  }
  
  // Calculate total budget (excluding Savings)
  let totalBudget = 0;
  Object.keys(monthBudget.budgets).forEach(category => {
    if (category !== 'Savings') {
      const budgetData = monthBudget.budgets[category];
      totalBudget += budgetData.amount || budgetData;
    }
  });
  
  const totalSpent = calculateMonthlySpent(currentMonthKey);
  const healthScore = calculateBudgetHealthScore(currentMonthKey);
  const daysRemaining = getDaysRemainingInMonth();
  
  document.getElementById('budgetHealthScore').textContent = `${healthScore}/100`;
  document.getElementById('totalBudget').textContent = formatCurrency(totalBudget);
  document.getElementById('budgetUsed').textContent = formatCurrency(totalSpent);
  document.getElementById('daysRemaining').textContent = `${daysRemaining} days`;
}

function updateBudgetHealthAlert() {
  const alertEl = document.getElementById('budgetHealthAlert');
  const currentMonthKey = appData.currentMonth || getCurrentMonthKey();
  const monthBudget = appData.monthlyBudgets[currentMonthKey];
  
  if (!monthBudget) {
    alertEl.classList.remove('show');
    return;
  }
  
  const categorySpending = calculateCategorySpendingForMonth(currentMonthKey);
  const overBudgetCategories = [];
  const nearLimitCategories = [];
  
  Object.keys(monthBudget.budgets).forEach(category => {
    if (category === 'Savings') return;
    const planned = monthBudget.budgets[category];
    const spent = categorySpending[category] || 0;
    const percentage = (spent / planned) * 100;
    
    if (percentage > 100) {
      overBudgetCategories.push(category);
    } else if (percentage >= 90) {
      nearLimitCategories.push(category);
    }
  });
  
  if (overBudgetCategories.length > 0) {
    alertEl.className = 'budget-health-alert danger show';
    alertEl.textContent = `⚠️ Warning: You're over budget in ${overBudgetCategories.join(', ')}!`;
  } else if (nearLimitCategories.length > 0) {
    alertEl.className = 'budget-health-alert warning show';
    alertEl.textContent = `⚠️ Approaching limit in ${nearLimitCategories.join(', ')} (90%+)`;
  } else {
    const totalBudget = Object.values(monthBudget.budgets).reduce((sum, val) => sum + val, 0) - (monthBudget.budgets.Savings || 0);
    const totalSpent = calculateMonthlySpent(currentMonthKey);
    const underBudget = totalBudget - totalSpent;
    
    if (underBudget > 0) {
      alertEl.className = 'budget-health-alert success show';
      alertEl.textContent = `🎉 Great job! You're ${formatCurrency(underBudget)} under budget this month!`;
    } else {
      alertEl.classList.remove('show');
    }
  }
}

function calculateBudgetHealthScore(monthKey) {
  const monthBudget = appData.monthlyBudgets[monthKey];
  if (!monthBudget) return 0;
  
  const categorySpending = calculateCategorySpendingForMonth(monthKey);
  let totalOverBudget = 0;
  let totalBudget = 0;
  
  Object.keys(monthBudget.budgets).forEach(category => {
    if (category === 'Savings') return;
    const budgetData = monthBudget.budgets[category];
    const planned = budgetData.amount || budgetData;
    const spent = categorySpending[category] || 0;
    totalBudget += planned;
    
    if (spent > planned) {
      totalOverBudget += (spent - planned);
    }
  });
  
  if (totalBudget === 0) return 100;
  
  const score = Math.max(0, 100 - Math.round((totalOverBudget / totalBudget) * 100));
  return score;
}

function getDaysRemainingInMonth() {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return lastDay.getDate() - now.getDate();
}

function calculateTotalSpent() {
  return appData.expenses.reduce((sum, expense) => sum + expense.amount, 0);
}

function calculateMonthlySpent(monthKey) {
  return appData.expenses
    .filter(exp => exp.month === monthKey)
    .reduce((sum, expense) => sum + expense.amount, 0);
}

function calculateCategorySpendingForMonth(monthKey) {
  const categories = { Food: 0, Travel: 0, Study: 0, Misc: 0 };
  appData.expenses
    .filter(exp => exp.month === monthKey)
    .forEach(expense => {
      if (categories.hasOwnProperty(expense.category)) {
        categories[expense.category] += expense.amount;
      }
    });
  return categories;
}

function calculateCategorySpending() {
  const categories = { Food: 0, Travel: 0, Study: 0, Misc: 0 };
  appData.expenses.forEach(expense => {
    if (categories.hasOwnProperty(expense.category)) {
      categories[expense.category] += expense.amount;
    }
  });
  return categories;
}

function formatCurrency(amount) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

function renderExpensesList() {
  const expensesList = document.getElementById('expensesList');
  
  if (appData.expenses.length === 0) {
    expensesList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🎉</div>
        <div class="empty-state-text">Ready to start tracking? Add your first expense!</div>
        <div class="empty-state-cta">
          <button class="btn btn-primary" onclick="switchView('addExpense')">Add First Expense</button>
        </div>
      </div>
    `;
    return;
  }

  // Sort by date (most recent first)
  const sortedExpenses = [...appData.expenses].sort((a, b) => new Date(b.date) - new Date(a.date));
  
  expensesList.innerHTML = sortedExpenses.map((expense, index) => `
    <div class="expense-item">
      <div class="expense-info">
        <div>
          <span class="expense-category ${expense.category}">${expense.category}</span>
          <span class="expense-date">${formatDate(expense.date)}</span>
        </div>
        ${expense.notes ? `<div class="expense-notes">${expense.notes}</div>` : ''}
      </div>
      <div style="display: flex; align-items: center; gap: 12px;">
        <div class="expense-amount amount">${formatCurrency(expense.amount)}</div>
        <button class="delete-btn" onclick="deleteExpense(${expense.id || index})" title="Delete expense">×</button>
      </div>
    </div>
  `).join('');
}

function deleteExpense(id) {
  if (confirm('Are you sure you want to delete this expense?')) {
    appData.expenses = appData.expenses.filter(exp => (exp.id || appData.expenses.indexOf(exp)) !== id);
    saveExpenses();
    updateDashboard();
    renderExpensesList();
    drawChart();
    showMessage('expenseMessage', 'Expense deleted successfully!', 'success');
  }
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// CUSTOM CHART DRAWING - Hand-crafted design
function drawChart() {
  const canvas = document.getElementById('spendingChart');
  const ctx = canvas.getContext('2d');
  const container = canvas.parentElement;
  
  // Set canvas size
  canvas.width = container.offsetWidth;
  canvas.height = container.offsetHeight;
  
  const categorySpending = calculateCategorySpending();
  const categories = Object.keys(categorySpending);
  const values = Object.values(categorySpending);
  const total = values.reduce((sum, val) => sum + val, 0);
  
  if (total === 0) {
    // Draw empty state
    ctx.fillStyle = '#8A93A6';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No expenses yet. Start tracking!', canvas.width / 2, canvas.height / 2);
    return;
  }
  
  // CUSTOM DONUT CHART with gradient fills
  createCustomDonutChart(ctx, canvas, categories, values, total);
}

function createCustomDonutChart(ctx, canvas, categories, values, total) {
  // Custom colors matching palette
  const colors = [
    ['#FF6B9D', '#FF8FB3'],  // Food - pink gradient
    ['#4ECDC4', '#72DDD6'],  // Travel - mint gradient
    ['#95E1D3', '#B0E9DF'],  // Study - teal gradient
    ['#FFD93D', '#FFE36D'],  // Misc - yellow gradient
    ['#A29BFE', '#B8B2FF']   // Other - lavender gradient
  ];
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2 - 20;
  const radius = Math.min(centerX, centerY) - 60;
  const innerRadius = radius * 0.55;
  
  let startAngle = -Math.PI / 2;
  
  // Draw segments with gradients
  categories.forEach((category, index) => {
    const value = values[index];
    const sliceAngle = (value / total) * 2 * Math.PI;
    const endAngle = startAngle + sliceAngle;
    
    // Create gradient
    const gradient = ctx.createLinearGradient(
      centerX - radius, centerY - radius,
      centerX + radius, centerY + radius
    );
    gradient.addColorStop(0, colors[index][0]);
    gradient.addColorStop(1, colors[index][1]);
    
    // Draw outer arc
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
    ctx.closePath();
    
    ctx.fillStyle = gradient;
    ctx.shadowColor = 'rgba(0,0,0,0.15)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;
    ctx.fill();
    
    // Draw separator
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    
    startAngle = endAngle;
  });
  
  // Draw center circle
  ctx.beginPath();
  ctx.arc(centerX, centerY, innerRadius, 0, 2 * Math.PI);
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0,0,0,0.1)';
  ctx.shadowBlur = 15;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  
  // Add total in center
  ctx.fillStyle = '#2A2A2A';
  ctx.font = 'bold 24px Poppins, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`₹${total}`, centerX, centerY - 8);
  
  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#8A93A6';
  ctx.fillText('Total Spent', centerX, centerY + 12);
  
  // Draw legend
  const legendY = canvas.height - 40;
  const legendSpacing = canvas.width / categories.length;
  
  categories.forEach((category, index) => {
    const x = legendSpacing * (index + 0.5);
    const value = values[index];
    const percentage = Math.round((value / total) * 100);
    
    // Draw color box
    ctx.fillStyle = colors[index][0];
    ctx.fillRect(x - 25, legendY - 8, 16, 16);
    
    // Draw text
    ctx.fillStyle = '#2A2A2A';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${category} (${percentage}%)`, x, legendY + 15);
  });
}

// Parent Co-Pilot Functions
let parentCoPilotSettings = {
  parentPhone: null,
  budgetLimit: 5000,
  alertThreshold: 90,
  monthlySummary: true,
  emergencyAlerts: true,
  setupDate: null
};

function loadParentCoPilotSettings() {
  const stored = loadFromStorage('zeniwise_parent_copilot');
  if (stored) {
    parentCoPilotSettings = stored;
    
    // Update UI
    if (parentCoPilotSettings.parentPhone) {
      const parts = parentCoPilotSettings.parentPhone.split('-');
      if (parts.length === 2) {
        document.getElementById('parentCountryCode').value = parts[0] || '+91';
        document.getElementById('parentMobileInput').value = parts[1] || '';
        const statusEl = document.getElementById('parentMobileStatus');
        statusEl.textContent = `✅ Saved: ${parentCoPilotSettings.parentPhone}`;
        statusEl.style.display = 'block';
      }
    }
    
    document.getElementById('parentBudgetLimit').value = parentCoPilotSettings.budgetLimit || 5000;
    document.getElementById('parentAlertThreshold').value = parentCoPilotSettings.alertThreshold || 90;
    document.getElementById('parentThresholdValue').textContent = (parentCoPilotSettings.alertThreshold || 90) + '%';
    document.getElementById('parentMonthlySummary').checked = parentCoPilotSettings.monthlySummary !== false;
    document.getElementById('parentEmergencyAlerts').checked = parentCoPilotSettings.emergencyAlerts !== false;
  }
  
  updateParentCoPilotStatus();
}

function saveParentCoPilotSettings() {
  const countryCode = document.getElementById('parentCountryCode').value;
  const mobile = document.getElementById('parentMobileInput').value.trim();
  const budgetLimit = parseFloat(document.getElementById('parentBudgetLimit').value);
  const alertThreshold = parseInt(document.getElementById('parentAlertThreshold').value);
  const monthlySummary = document.getElementById('parentMonthlySummary').checked;
  const emergencyAlerts = document.getElementById('parentEmergencyAlerts').checked;
  
  // Validate mobile number
  if (!mobile || !/^[0-9]{10}$/.test(mobile)) {
    showMessage('parentCoPilotMessage', '⚠️ Please enter a valid 10-digit mobile number', 'error');
    return;
  }
  
  // Validate budget limit
  if (!budgetLimit || budgetLimit <= 0) {
    showMessage('parentCoPilotMessage', '⚠️ Please enter a valid budget limit', 'error');
    return;
  }
  
  // Save settings
  parentCoPilotSettings = {
    parentPhone: `${countryCode}-${mobile}`,
    budgetLimit: budgetLimit,
    alertThreshold: alertThreshold,
    monthlySummary: monthlySummary,
    emergencyAlerts: emergencyAlerts,
    setupDate: new Date().toISOString()
  };
  
  saveToStorage('zeniwise_parent_copilot', parentCoPilotSettings);
  
  // Update status display
  const statusEl = document.getElementById('parentMobileStatus');
  statusEl.textContent = `✅ Saved: ${parentCoPilotSettings.parentPhone}`;
  statusEl.style.display = 'block';
  
  showMessage('parentCoPilotMessage', '✅ Parent Co-Pilot activated successfully!', 'success');
  updateParentCoPilotStatus();
  
  // Check if we need to send notification immediately
  checkParentCoPilotNotification();
}

function updateParentThresholdDisplay(value) {
  document.getElementById('parentThresholdValue').textContent = value + '%';
}

function updateParentCoPilotStatus() {
  const totalSpent = calculateTotalSpent();
  const budgetLimit = parentCoPilotSettings.budgetLimit || 5000;
  const remaining = budgetLimit - totalSpent;
  const percentage = (totalSpent / budgetLimit) * 100;
  
  document.getElementById('parentTotalSpent').textContent = formatCurrency(totalSpent);
  document.getElementById('parentBudgetLimitDisplay').textContent = formatCurrency(budgetLimit);
  document.getElementById('parentRemaining').textContent = formatCurrency(Math.max(0, remaining));
  
  const progressFill = document.getElementById('parentProgressFill');
  const messageEl = document.getElementById('parentBudgetMessage');
  
  progressFill.style.width = Math.min(percentage, 100) + '%';
  
  if (percentage >= 100) {
    progressFill.style.background = '#E85D5D';
    messageEl.innerHTML = '🚨 <strong>Budget exceeded!</strong> Parent has been notified.';
    messageEl.style.color = '#E85D5D';
  } else if (percentage >= parentCoPilotSettings.alertThreshold) {
    progressFill.style.background = '#F5A623';
    messageEl.innerHTML = '⚠️ <strong>Alert threshold reached!</strong> Parent has been notified.';
    messageEl.style.color = '#F5A623';
  } else {
    progressFill.style.background = '#2E8B57';
    messageEl.innerHTML = '✅ You\'re doing great! Keep it up.';
    messageEl.style.color = '#2E8B57';
  }
  
  renderParentNotificationLog();
}

function checkParentCoPilotNotification() {
  if (!parentCoPilotSettings.parentPhone) return;
  
  const totalSpent = calculateTotalSpent();
  const budgetLimit = parentCoPilotSettings.budgetLimit || 5000;
  const percentage = (totalSpent / budgetLimit) * 100;
  const threshold = parentCoPilotSettings.alertThreshold || 90;
  
  if (percentage >= threshold) {
    sendParentCoPilotNotification(totalSpent, budgetLimit, percentage);
  }
}

function sendParentCoPilotNotification(spent, limit, percentage) {
  const notification = {
    to: parentCoPilotSettings.parentPhone,
    subject: 'Zeniwise Budget Alert',
    message: `Your child has spent ₹${spent.toFixed(2)} (${percentage.toFixed(1)}%) of their ₹${limit} monthly budget.`,
    timestamp: new Date().toISOString(),
    type: percentage >= 100 ? 'exceeded' : 'warning'
  };
  
  // Store notification
  let notifications = loadFromStorage('zeniwise_parent_notifications') || [];
  notifications.unshift(notification);
  // Keep only last 20 notifications
  notifications = notifications.slice(0, 20);
  saveToStorage('zeniwise_parent_notifications', notifications);
  
  // Show user notification
  showSuccessToast('⚠️ Parent notified about budget status');
  
  // Update UI
  renderParentNotificationLog();
}

function renderParentNotificationLog() {
  const logEl = document.getElementById('parentNotificationLog');
  if (!logEl) return;
  
  const notifications = loadFromStorage('zeniwise_parent_notifications') || [];
  
  if (notifications.length === 0) {
    logEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔔</div>
        <div class="empty-state-text">No notifications sent yet</div>
      </div>
    `;
    return;
  }
  
  logEl.innerHTML = notifications.map(notif => {
    const date = new Date(notif.timestamp);
    const timeStr = date.toLocaleString('en-IN', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    const icon = notif.type === 'exceeded' ? '🚨' : '⚠️';
    
    return `
      <div class="notification-item">
        <div class="notification-icon">${icon}</div>
        <div class="notification-content">
          <div class="notification-message">${notif.message}</div>
          <div class="notification-time">${timeStr} • Sent to ${notif.to}</div>
        </div>
      </div>
    `;
  }).join('');
}

// Add Expense Functions
function initExpenseForm() {
  const expenseForm = document.getElementById('expenseForm');
  const expenseDate = document.getElementById('expenseDate');
  const expenseCategory = document.getElementById('expenseCategory');
  const expenseAmount = document.getElementById('expenseAmount');
  
  // CRITICAL FIX: Remove blocking attribute to allow form submission
  if (expenseForm) {
    expenseForm.removeAttribute('onsubmit');
  }
  
  // Set today's date as default
  const today = new Date().toISOString().split('T')[0];
  expenseDate.value = today;
  
  // Check budget warning on amount/category change
  const checkBudgetWarning = () => {
    const category = expenseCategory.value;
    const amount = parseInt(expenseAmount.value) || 0;
    
    if (category && amount > 0) {
      const date = expenseDate.value;
      const monthKey = date ? date.substring(0, 7) : getCurrentMonthKey();
      const monthBudget = appData.monthlyBudgets[monthKey];
      
      if (monthBudget && monthBudget.budgets[category]) {
        const categorySpending = calculateCategorySpendingForMonth(monthKey);
        const currentSpent = categorySpending[category] || 0;
        const budgetData = monthBudget.budgets[category];
        const planned = budgetData.amount || budgetData;
        const afterExpense = currentSpent + amount;
        
        let warningEl = document.getElementById('budgetWarningMessage');
        if (!warningEl) {
          warningEl = document.createElement('div');
          warningEl.id = 'budgetWarningMessage';
          warningEl.className = 'budget-warning';
          expenseForm.insertBefore(warningEl, expenseForm.lastElementChild);
        }
        
        if (afterExpense > planned) {
          const overAmount = afterExpense - planned;
          warningEl.textContent = `⚠️ This will exceed your ${category} budget by ${formatCurrency(overAmount)}`;
          warningEl.classList.add('show');
        } else {
          warningEl.classList.remove('show');
        }
      }
    }
  };
  
  expenseCategory.addEventListener('change', checkBudgetWarning);
  expenseAmount.addEventListener('input', checkBudgetWarning);
  
  // WORKING: Proper form submission handler
  // CRITICAL FIX: Ensure form submission works
  expenseForm.addEventListener('submit', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const date = expenseDate.value;
    const category = expenseCategory.value;
    const amount = parseInt(expenseAmount.value);
    const notes = document.getElementById('expenseNotes').value;
    const monthKey = date.substring(0, 7);
    
    // Validate inputs
    if (!date || !category || !amount || amount <= 0) {
      alert('Please fill all required fields with valid values');
      return;
    }
    
    const currentUser = appData.user ? appData.user.username : null;
    
    const expense = { 
      id: nextExpenseId++,
      date, 
      category, 
      amount, 
      notes,
      month: monthKey,
      method: 'manual',
      userId: currentUser
    };
    
    // Add expense to memory
    appData.expenses.push(expense);
    saveExpenses();
    
    console.log('✅ Expense added successfully:', expense);
    
    // Award XP
    awardXP(5, 'add_expense');
    checkAchievements();
    
    // Show success message
    showMessage('expenseMessage', '✅ Expense added successfully!', 'success');
    
    // Reset form
    expenseForm.reset();
    expenseDate.value = new Date().toISOString().split('T')[0];
    const warningEl = document.getElementById('budgetWarningMessage');
    if (warningEl) warningEl.classList.remove('show');
    
    // Update UI
    updateDashboard();
    renderExpensesList();
    drawChart();
    
    // Check parent co-pilot notification
    checkParentCoPilotNotification();
    updateParentCoPilotStatus();
    
    // Auto-switch to dashboard after 1 second
    setTimeout(() => {
      switchView('dashboard');
    }, 1000);
  });
}

// Goals Functions
function initGoalForm() {
  const goalForm = document.getElementById('goalForm');
  
  goalForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const name = document.getElementById('goalName').value;
    const target = parseInt(document.getElementById('goalTarget').value);
    const saved = parseInt(document.getElementById('goalSaved').value);
    
    if (name && target > 0 && saved >= 0) {
      const goal = { 
        id: nextGoalId++,
        name, 
        target, 
        saved 
      };
      appData.goals.push(goal);
      saveGoals();
      
      // Show success message
      showMessage('goalMessage', 'Goal added successfully!', 'success');
      
      // Reset form
      goalForm.reset();
      document.getElementById('goalSaved').value = '0';
      
      // Update goals list
      renderGoalsList();
    }
  });
}

function renderGoalsList() {
  const goalsList = document.getElementById('goalsList');
  
  if (appData.goals.length === 0) {
    goalsList.innerHTML = `
      <div class="card">
        <div class="empty-state">
          <div class="empty-state-icon">🎯</div>
          <div class="empty-state-text">No goals yet. Set your first savings goal!</div>
          <div class="empty-state-cta">
            <button class="btn btn-primary" onclick="document.getElementById('goalName').focus()">Create First Goal</button>
          </div>
        </div>
      </div>
    `;
    return;
  }
  
  goalsList.innerHTML = appData.goals.map((goal, index) => {
    const percentage = Math.min((goal.saved / goal.target) * 100, 100).toFixed(1);
    const isComplete = goal.saved >= goal.target;
    const progressClass = percentage >= 100 ? 'complete' : percentage >= 67 ? 'high' : percentage >= 34 ? 'medium' : 'low';
    
    return `
      <div class="goal-item card">
        <div class="goal-header">
          <div class="goal-name">${goal.name}</div>
          <div style="display: flex; align-items: center; gap: 12px;">
            <div class="goal-amount amount">${formatCurrency(goal.saved)} / ${formatCurrency(goal.target)}</div>
            <button class="delete-btn" onclick="deleteGoal(${goal.id || index})" title="Delete goal">×</button>
          </div>
        </div>
        <div class="goal-progress">
          <div class="goal-progress-bar ${progressClass}" style="width: ${percentage}%">
            ${percentage}%
          </div>
        </div>
        <div class="goal-actions">
          <button class="btn-add-money" onclick="showAddMoneyModal(${goal.id || index})">
            <span>+</span> Add Money
          </button>
          ${isComplete ? '<div class="goal-achievement">🎉 Goal Achieved!</div>' : ''}
        </div>
      </div>
    `;
  }).join('');
}

function deleteGoal(id) {
  if (confirm('Are you sure you want to delete this goal?')) {
    appData.goals = appData.goals.filter(goal => (goal.id || appData.goals.indexOf(goal)) !== id);
    saveGoals();
    renderGoalsList();
    showMessage('goalMessage', 'Goal deleted successfully!', 'success');
  }
}

// Tips Functions
function renderTipsList() {
  const tipsList = document.getElementById('tipsList');
  
  tipsList.innerHTML = financialTips.map(tip => `
    <div class="tip-item">
      <div class="tip-icon">${tip.icon}</div>
      <div class="tip-text">${tip.text}</div>
    </div>
  `).join('');
}

// Parent View Functions
function updateParentView() {
  const totalIncome = appData.income;
  const totalSpent = calculateTotalSpent();
  const remainingSavings = totalIncome - totalSpent;
  
  document.getElementById('parentIncome').textContent = formatCurrency(totalIncome);
  document.getElementById('parentSpent').textContent = formatCurrency(totalSpent);
  document.getElementById('parentRemaining').textContent = formatCurrency(remainingSavings);
  
  // Render category summary
  const categorySpending = calculateCategorySpending();
  const parentCategoryList = document.getElementById('parentCategoryList');
  
  parentCategoryList.innerHTML = Object.entries(categorySpending)
    .filter(([category, amount]) => amount > 0)
    .map(([category, amount]) => `
      <div class="parent-category-item">
        <div class="parent-category-name">${category}</div>
        <div class="parent-category-amount amount">${formatCurrency(amount)}</div>
      </div>
    `).join('');
  
  if (Object.values(categorySpending).every(amount => amount === 0)) {
    parentCategoryList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📊</div>
        <div class="empty-state-text">No spending data available</div>
      </div>
    `;
  }
}

// Utility Functions
function showMessage(elementId, message, type) {
  const messageEl = document.getElementById(elementId);
  messageEl.textContent = message;
  messageEl.className = `message ${type}`;
  messageEl.style.display = 'block';
  
  setTimeout(() => {
    messageEl.style.display = 'none';
  }, 3000);
}

// Income editing functionality
function initIncomeEdit() {
  const totalIncomeEl = document.getElementById('totalIncome');
  totalIncomeEl.style.cursor = 'pointer';
  totalIncomeEl.title = 'Click to edit income';
  
  totalIncomeEl.addEventListener('click', () => {
    const currentIncome = appData.income;
    const newIncome = prompt('Enter new monthly income (₹):', currentIncome);
    
    if (newIncome !== null && !isNaN(newIncome) && parseFloat(newIncome) >= 0) {
      saveIncome(parseFloat(newIncome));
      updateDashboard();
      showMessage('expenseMessage', 'Income updated successfully!', 'success');
    }
  });
}

// Add Money Functions
let currentGoalId = null;

function showAddMoneyModal(goalId) {
  currentGoalId = goalId;
  const goal = appData.goals.find(g => (g.id || appData.goals.indexOf(g)) === goalId);
  
  if (!goal) return;
  
  document.getElementById('addMoneyGoalName').textContent = `Adding money to: ${goal.name}`;
  document.getElementById('addMoneyAmount').value = '';
  document.getElementById('addMoneyModal').classList.add('active');
  document.getElementById('addMoneyAmount').focus();
}

function hideAddMoneyModal() {
  document.getElementById('addMoneyModal').classList.remove('active');
  currentGoalId = null;
}

function addMoneyToGoal(goalId, amount) {
  const goalIndex = appData.goals.findIndex(g => (g.id || appData.goals.indexOf(g)) === goalId);
  
  if (goalIndex === -1) return;
  
  const goal = appData.goals[goalIndex];
  const wasComplete = goal.saved >= goal.target;
  
  // Add amount to saved
  goal.saved += parseFloat(amount);
  
  // Save to storage
  saveGoals();
  
  // Check if goal is now achieved
  const isNowComplete = goal.saved >= goal.target;
  
  // Update UI
  renderGoalsList();
  
  // Show success message
  let message = `₹${parseFloat(amount).toLocaleString('en-IN')} added to ${goal.name}!`;
  if (!wasComplete && isNowComplete) {
    message += ' 🎉 Congratulations! Goal Achieved!';
  }
  showSuccessToast(message);
}

function initAddMoneyForm() {
  const addMoneyForm = document.getElementById('addMoneyForm');
  
  addMoneyForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const amount = parseFloat(document.getElementById('addMoneyAmount').value);
    
    if (amount > 0 && currentGoalId !== null) {
      addMoneyToGoal(currentGoalId, amount);
      hideAddMoneyModal();
    }
  });
  
  // Close modal on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideAddMoneyModal();
    }
  });
}

function showSuccessToast(message) {
  // Create toast element if it doesn't exist
  let toast = document.getElementById('successToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'successToast';
    toast.className = 'success-toast';
    document.body.appendChild(toast);
  }
  
  toast.textContent = message;
  toast.classList.add('active');
  
  setTimeout(() => {
    toast.classList.remove('active');
  }, 3000);
}

// Check for auto-login
function checkAutoLogin() {
  const currentUser = loadFromStorage(STORAGE_KEYS.currentUser);
  
  if (currentUser) {
    // Auto-login user
    initializeDefaultData(currentUser);
    const savedPrivacyMode = loadAllData(currentUser);
    
    // Set up next IDs based on existing data
    nextExpenseId = appData.expenses.length > 0 
      ? Math.max(...appData.expenses.map(e => e.id || 0)) + 1 
      : 1;
    nextGoalId = appData.goals.length > 0 
      ? Math.max(...appData.goals.map(g => g.id || 0)) + 1 
      : 1;
    
    showApp();
    loadProfileSettings();
    
    privacyMode = savedPrivacyMode;
    if (privacyMode) {
      document.body.classList.add('privacy-mode');
    }
  }
}

// Budget Recommendations Functions
function getBudgetRecommendations(income) {
  let recommendation;
  
  if (income <= BUDGET_RECOMMENDATIONS.low_income.threshold) {
    recommendation = BUDGET_RECOMMENDATIONS.low_income;
  } else if (income <= BUDGET_RECOMMENDATIONS.medium_income.threshold) {
    recommendation = BUDGET_RECOMMENDATIONS.medium_income;
  } else {
    recommendation = BUDGET_RECOMMENDATIONS.high_income;
  }
  
  const budgets = {};
  Object.keys(recommendation.percentages).forEach(category => {
    const percent = recommendation.percentages[category];
    budgets[category] = {
      percent: percent,
      amount: Math.round((income * percent) / 100)
    };
  });
  
  return budgets;
}

function getBudgetRecommendationPercentages(income) {
  let recommendation;
  
  if (income <= BUDGET_RECOMMENDATIONS.low_income.threshold) {
    recommendation = BUDGET_RECOMMENDATIONS.low_income;
  } else if (income <= BUDGET_RECOMMENDATIONS.medium_income.threshold) {
    recommendation = BUDGET_RECOMMENDATIONS.medium_income;
  } else {
    recommendation = BUDGET_RECOMMENDATIONS.high_income;
  }
  
  return recommendation.percentages;
}

function showBudgetWizard() {
  const modal = document.getElementById('budgetWizardModal');
  const incomeInput = document.getElementById('wizardIncome');
  
  // Reset wizard to step 1
  tempBudgetData = {
    income: appData.income,
    method: 'recommended',
    allocations: {}
  };
  
  incomeInput.value = appData.income;
  wizardGoToStep1();
  
  modal.classList.add('active');
  incomeInput.focus();
}

function wizardGoToStep1() {
  document.querySelectorAll('.wizard-step').forEach(step => step.classList.remove('active'));
  document.getElementById('wizardStep1').classList.add('active');
}

function wizardGoToStep2() {
  const income = parseInt(document.getElementById('wizardIncome').value);
  
  if (!income || income <= 0) {
    alert('Please enter a valid income amount');
    return;
  }
  
  tempBudgetData.income = income;
  
  document.querySelectorAll('.wizard-step').forEach(step => step.classList.remove('active'));
  document.getElementById('wizardStep2').classList.add('active');
}

function wizardUseRecommendations() {
  tempBudgetData.method = 'recommended';
  renderBudgetRecommendations(tempBudgetData.income);
  
  document.querySelectorAll('.wizard-step').forEach(step => step.classList.remove('active'));
  document.getElementById('wizardStep3Recommendations').classList.add('active');
}

function wizardCustomizeBudget() {
  tempBudgetData.method = 'custom';
  const recommendations = getBudgetRecommendationPercentages(tempBudgetData.income);
  renderCustomAllocationSliders('customAllocationSliders', recommendations, 'totalPercentageCircle', 'totalPercentageValue', 'totalPercentageMessage', 'saveCustomBudgetBtn');
  
  document.querySelectorAll('.wizard-step').forEach(step => step.classList.remove('active'));
  document.getElementById('wizardStep3Custom').classList.add('active');
}

function wizardCustomizeThese() {
  tempBudgetData.method = 'custom';
  const recommendations = getBudgetRecommendationPercentages(tempBudgetData.income);
  renderCustomAllocationSliders('customAllocationSliders', recommendations, 'totalPercentageCircle', 'totalPercentageValue', 'totalPercentageMessage', 'saveCustomBudgetBtn');
  
  document.querySelectorAll('.wizard-step').forEach(step => step.classList.remove('active'));
  document.getElementById('wizardStep3Custom').classList.add('active');
}

function hideBudgetWizard() {
  document.getElementById('budgetWizardModal').classList.remove('active');
}

// Edit Budget Modal Functions
function showEditBudgetModal() {
  const currentMonthKey = appData.currentMonth || getCurrentMonthKey();
  const monthBudget = appData.monthlyBudgets[currentMonthKey];
  
  if (!monthBudget) {
    alert('No budget set for this month. Please create a budget first.');
    return;
  }
  
  // Initialize temp data with current budget
  tempBudgetData = {
    income: monthBudget.income,
    method: monthBudget.method || 'recommended',
    allocations: {}
  };
  
  // Extract percentages from current budget
  Object.keys(monthBudget.budgets).forEach(category => {
    const budgetData = monthBudget.budgets[category];
    tempBudgetData.allocations[category] = budgetData.percent || Math.round((budgetData / monthBudget.income) * 100);
  });
  
  renderCustomAllocationSliders('editAllocationSliders', tempBudgetData.allocations, 'editTotalPercentageCircle', 'editTotalPercentageValue', 'editTotalPercentageMessage', 'saveEditBudgetBtn');
  
  document.getElementById('editBudgetModal').classList.add('active');
}

function hideEditBudgetModal() {
  document.getElementById('editBudgetModal').classList.remove('active');
}

function resetToRecommendations() {
  if (!confirm('Replace your custom budget with recommendations?')) {
    return;
  }
  
  const recommendations = getBudgetRecommendationPercentages(tempBudgetData.income);
  tempBudgetData.allocations = { ...recommendations };
  tempBudgetData.method = 'recommended';
  
  renderCustomAllocationSliders('editAllocationSliders', tempBudgetData.allocations, 'editTotalPercentageCircle', 'editTotalPercentageValue', 'editTotalPercentageMessage', 'saveEditBudgetBtn');
}

function saveEditedBudget() {
  const allocations = tempBudgetData.allocations;
  
  // Verify total is 100%
  const total = Object.values(allocations).reduce((sum, val) => sum + val, 0);
  if (total !== 100) {
    alert('Total percentage must equal 100%');
    return;
  }
  
  const income = tempBudgetData.income;
  const budgets = {};
  
  Object.keys(allocations).forEach(category => {
    const percent = allocations[category];
    budgets[category] = {
      percent: percent,
      amount: Math.round((income * percent) / 100)
    };
  });
  
  const currentMonthKey = appData.currentMonth || getCurrentMonthKey();
  
  appData.monthlyBudgets[currentMonthKey] = {
    income: income,
    method: 'custom',
    budgets: budgets
  };
  
  saveMonthlyBudgets();
  
  hideEditBudgetModal();
  updateDashboard();
  updateBudgetPlannerMonth(currentMonthKey);
  
  showSuccessToast('✅ Budget allocation updated!');
}

function renderBudgetRecommendations(income) {
  const budgets = getBudgetRecommendations(income);
  const listEl = document.getElementById('recommendationsList');
  
  listEl.innerHTML = Object.keys(budgets).map(category => {
    const data = budgets[category];
    const icon = CATEGORY_ICONS[category] || '💵';
    
    return `
      <div class="recommendation-item">
        <div class="recommendation-category">
          <div class="recommendation-icon">${icon}</div>
          <div class="recommendation-name">${category}</div>
        </div>
        <div class="recommendation-details">
          <div class="recommendation-amount">${formatCurrency(data.amount)}</div>
          <div class="recommendation-percent">${data.percent}% of income</div>
        </div>
      </div>
    `;
  }).join('');
}

function renderCustomAllocationSliders(containerId, initialPercentages, circleId, valueId, messageId, buttonId) {
  const container = document.getElementById(containerId);
  const income = tempBudgetData.income;
  
  // Initialize allocations with recommendations
  tempBudgetData.allocations = { ...initialPercentages };
  
  container.innerHTML = Object.keys(CATEGORY_ICONS).map(category => {
    const percent = initialPercentages[category] || 0;
    const amount = Math.round((income * percent) / 100);
    const icon = CATEGORY_ICONS[category];
    const colorClass = getSliderColorClass(percent);
    
    return `
      <div class="allocation-item">
        <div class="allocation-header">
          <div class="allocation-icon">${icon}</div>
          <div class="allocation-name">${category}</div>
          <div class="allocation-amount" id="amount-${category}">${formatCurrency(amount)}</div>
        </div>
        <div class="allocation-controls">
          <div class="allocation-slider-container">
            <input type="range" 
              class="allocation-slider ${colorClass}" 
              id="slider-${category}"
              min="0" 
              max="100" 
              step="1" 
              value="${percent}"
              oninput="updateAllocation('${category}', this.value, '${circleId}', '${valueId}', '${messageId}', '${buttonId}')">
            <input type="number" 
              class="allocation-input" 
              id="input-${category}"
              min="0" 
              max="100" 
              value="${percent}"
              oninput="updateAllocation('${category}', this.value, '${circleId}', '${valueId}', '${messageId}', '${buttonId}')">
            <span class="allocation-percent-label">%</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  updateTotalPercentage(circleId, valueId, messageId, buttonId);
}

function getSliderColorClass(percent) {
  if (percent <= 20) return 'low';
  if (percent <= 40) return 'moderate';
  if (percent <= 60) return 'high';
  return 'very-high';
}

function updateAllocation(category, value, circleId, valueId, messageId, buttonId) {
  const percent = Math.max(0, Math.min(100, parseInt(value) || 0));
  const income = tempBudgetData.income;
  const amount = Math.round((income * percent) / 100);
  
  // Update temp data
  tempBudgetData.allocations[category] = percent;
  
  // Update UI
  const slider = document.getElementById(`slider-${category}`);
  const input = document.getElementById(`input-${category}`);
  const amountEl = document.getElementById(`amount-${category}`);
  
  if (slider) {
    slider.value = percent;
    slider.className = `allocation-slider ${getSliderColorClass(percent)}`;
  }
  if (input) input.value = percent;
  if (amountEl) amountEl.textContent = formatCurrency(amount);
  
  updateTotalPercentage(circleId, valueId, messageId, buttonId);
}

function updateTotalPercentage(circleId, valueId, messageId, buttonId) {
  const total = Object.values(tempBudgetData.allocations).reduce((sum, val) => sum + val, 0);
  
  const circle = document.getElementById(circleId);
  const valueEl = document.getElementById(valueId);
  const messageEl = document.getElementById(messageId);
  const saveBtn = document.getElementById(buttonId);
  
  valueEl.textContent = `${total}%`;
  
  // Update circle styling
  circle.className = 'total-circle';
  messageEl.className = 'total-message';
  
  if (total === 100) {
    circle.classList.add('balanced');
    messageEl.classList.add('success');
    messageEl.textContent = '✓ Budget balanced at 100%!';
    if (saveBtn) saveBtn.disabled = false;
  } else if (total < 100) {
    circle.classList.add('warning');
    messageEl.classList.add('warning');
    const diff = 100 - total;
    messageEl.textContent = `⚠️ Add ${diff}% more to reach 100%`;
    if (saveBtn) saveBtn.disabled = true;
  } else {
    circle.classList.add('warning');
    messageEl.classList.add('error');
    const diff = total - 100;
    messageEl.textContent = `⚠️ Reduce by ${diff}% to reach 100%`;
    if (saveBtn) saveBtn.disabled = true;
  }
}

function applyBudgetRecommendations() {
  const income = tempBudgetData.income;
  
  if (income <= 0) {
    alert('Please enter a valid income amount');
    return;
  }
  
  const budgets = getBudgetRecommendations(income);
  const currentMonthKey = appData.currentMonth || getCurrentMonthKey();
  
  appData.income = income;
  appData.monthlyBudgets[currentMonthKey] = {
    income: income,
    method: 'recommended',
    budgets: budgets
  };
  
  saveIncome(income);
  saveMonthlyBudgets();
  
  hideBudgetWizard();
  updateDashboard();
  
  if (currentView === 'budgetPlanner') {
    renderBudgetPlanner();
  }
  
  showSuccessToast('✅ Budget created successfully!');
}

function applyCustomBudget() {
  const income = tempBudgetData.income;
  const allocations = tempBudgetData.allocations;
  
  // Verify total is 100%
  const total = Object.values(allocations).reduce((sum, val) => sum + val, 0);
  if (total !== 100) {
    alert('Total percentage must equal 100%');
    return;
  }
  
  const budgets = {};
  Object.keys(allocations).forEach(category => {
    const percent = allocations[category];
    budgets[category] = {
      percent: percent,
      amount: Math.round((income * percent) / 100)
    };
  });
  
  const currentMonthKey = appData.currentMonth || getCurrentMonthKey();
  
  appData.income = income;
  appData.monthlyBudgets[currentMonthKey] = {
    income: income,
    method: 'custom',
    budgets: budgets
  };
  
  saveIncome(income);
  saveMonthlyBudgets();
  
  hideBudgetWizard();
  updateDashboard();
  
  if (currentView === 'budgetPlanner') {
    renderBudgetPlanner();
  }
  
  showSuccessToast('✅ Custom budget saved successfully!');
}

// Budget Planner Functions
function renderBudgetPlanner() {
  const currentMonthKey = appData.currentMonth || getCurrentMonthKey();
  updateBudgetPlannerMonth(currentMonthKey);
}

function updateBudgetPlannerMonth(monthKey) {
  const monthBudget = appData.monthlyBudgets[monthKey];
  
  document.getElementById('selectedMonth').textContent = getMonthName(monthKey);
  
  // Update method badge
  const methodBadge = document.getElementById('budgetMethodBadge');
  if (!monthBudget) {
    document.getElementById('monthIncomeDisplay').textContent = formatCurrency(appData.income);
    methodBadge.style.display = 'none';
    document.getElementById('budgetAllocationTable').innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📊</div>
        <div class="empty-state-text">No budget set for this month. Click "Recalculate Budget" to create one.</div>
      </div>
    `;
    return;
  }
  
  document.getElementById('monthIncomeDisplay').textContent = formatCurrency(monthBudget.income);
  
  // Show budget method badge
  const method = monthBudget.method || 'recommended';
  methodBadge.style.display = 'inline-flex';
  methodBadge.className = `budget-method-badge ${method}`;
  methodBadge.textContent = method === 'custom' ? '🎨 Custom Budget Plan Active' : '💡 Smart Recommendations Active';
  
  const categorySpending = calculateCategorySpendingForMonth(monthKey);
  
  let tableHTML = '<table class="budget-allocation-table"><thead><tr>';
  tableHTML += '<th>Category</th><th>Budget %</th><th>Budget Amount</th><th>Spent</th><th>Remaining</th><th>Status</th>';
  tableHTML += '</tr></thead><tbody>';
  
  Object.keys(monthBudget.budgets).forEach(category => {
    const budgetData = monthBudget.budgets[category];
    const planned = budgetData.amount || budgetData;
    const percent = budgetData.percent || Math.round((planned / monthBudget.income) * 100);
    const spent = categorySpending[category] || 0;
    const remaining = planned - spent;
    const percentage = (spent / planned) * 100;
    
    let status, statusClass, progressClass;
    if (percentage < 90) {
      status = '✅ On Track';
      statusClass = 'on-track';
      progressClass = '';
    } else if (percentage < 100) {
      status = '⚠️ Near Limit';
      statusClass = 'near-limit';
      progressClass = 'warning';
    } else {
      status = '🛑 Over Budget';
      statusClass = 'over-budget';
      progressClass = 'danger';
    }
    
    const icon = CATEGORY_ICONS[category] || '';
    
    tableHTML += '<tr>';
    tableHTML += `<td>${icon} ${category}</td>`;
    tableHTML += `<td>${percent}%</td>`;
    tableHTML += `<td class="amount">${formatCurrency(planned)}</td>`;
    tableHTML += `<td class="amount">${formatCurrency(spent)}</td>`;
    tableHTML += `<td class="amount">${formatCurrency(remaining)}</td>`;
    tableHTML += `<td><span class="budget-status ${statusClass}">${status}</span></td>`;
    tableHTML += '</tr>';
  });
  
  tableHTML += '</tbody></table>';
  document.getElementById('budgetAllocationTable').innerHTML = tableHTML;
  
  // Draw budget chart
  drawBudgetChart(monthKey);
}

function navigateMonth(direction) {
  const currentMonthKey = appData.currentMonth || getCurrentMonthKey();
  const [year, month] = currentMonthKey.split('-').map(Number);
  
  const newDate = new Date(year, month - 1 + direction, 1);
  const newMonthKey = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`;
  
  appData.currentMonth = newMonthKey;
  saveCurrentMonth(newMonthKey);
  updateBudgetPlannerMonth(newMonthKey);
}

function editMonthIncome() {
  const currentMonthKey = appData.currentMonth || getCurrentMonthKey();
  const monthBudget = appData.monthlyBudgets[currentMonthKey];
  const currentIncome = monthBudget ? monthBudget.income : appData.income;
  
  const newIncome = prompt(`Enter income for ${getMonthName(currentMonthKey)} (₹):`, currentIncome);
  
  if (newIncome !== null && !isNaN(newIncome) && parseFloat(newIncome) >= 0) {
    const income = parseFloat(newIncome);
    
    if (!monthBudget) {
      appData.monthlyBudgets[currentMonthKey] = {
        income: income,
        method: 'recommended',
        budgets: getBudgetRecommendations(income)
      };
    } else {
      const oldIncome = monthBudget.income;
      monthBudget.income = income;
      
      // Recalculate amounts based on percentages if budget exists
      if (monthBudget.budgets) {
        Object.keys(monthBudget.budgets).forEach(category => {
          const budgetData = monthBudget.budgets[category];
          if (budgetData.percent !== undefined) {
            budgetData.amount = Math.round((income * budgetData.percent) / 100);
          } else {
            // Legacy format - convert to new format
            const percent = Math.round((budgetData / oldIncome) * 100);
            monthBudget.budgets[category] = {
              percent: percent,
              amount: Math.round((income * percent) / 100)
            };
          }
        });
      }
    }
    
    saveMonthlyBudgets();
    updateDashboard();
    updateBudgetPlannerMonth(currentMonthKey);
    showSuccessToast('Income updated successfully!');
  }
}

function drawBudgetChart(monthKey) {
  const canvas = document.getElementById('budgetChart');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  const container = canvas.parentElement;
  const monthBudget = appData.monthlyBudgets[monthKey];
  
  if (!monthBudget) return;
  
  canvas.width = container.offsetWidth;
  canvas.height = container.offsetHeight;
  
  const categorySpending = calculateCategorySpendingForMonth(monthKey);
  const categories = Object.keys(monthBudget.budgets).filter(c => c !== 'Savings');
  const planned = categories.map(c => {
    const budgetData = monthBudget.budgets[c];
    return budgetData.amount || budgetData;
  });
  const actual = categories.map(c => categorySpending[c] || 0);
  
  const maxValue = Math.max(...planned, ...actual, 1);
  const barWidth = (canvas.width - 100) / (categories.length * 2);
  const chartHeight = canvas.height - 80;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw bars
  categories.forEach((category, index) => {
    const x = 60 + index * barWidth * 2.5;
    
    // Planned bar (blue)
    const plannedHeight = (planned[index] / maxValue) * chartHeight;
    ctx.fillStyle = '#3B82F6';
    ctx.fillRect(x, canvas.height - 60 - plannedHeight, barWidth, plannedHeight);
    
    // Actual bar (green/red)
    const actualHeight = (actual[index] / maxValue) * chartHeight;
    ctx.fillStyle = actual[index] > planned[index] ? '#EF4444' : '#10B981';
    ctx.fillRect(x + barWidth + 5, canvas.height - 60 - actualHeight, barWidth, actualHeight);
    
    // Category label
    ctx.fillStyle = '#13343B';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(category, x + barWidth, canvas.height - 40);
  });
  
  // Legend
  ctx.fillStyle = '#3B82F6';
  ctx.fillRect(60, 20, 15, 15);
  ctx.fillStyle = '#13343B';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Planned', 80, 32);
  
  ctx.fillStyle = '#10B981';
  ctx.fillRect(160, 20, 15, 15);
  ctx.fillStyle = '#13343B';
  ctx.fillText('Actual', 180, 32);
}

// Toggle Budget View
function initBudgetViewToggle() {
  const toggleBtns = document.querySelectorAll('.toggle-btn[data-toggle]');
  
  toggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.toggle;
      toggleBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      document.getElementById('monthlyBudgetView').classList.toggle('active', view === 'monthly');
      document.getElementById('yearlyBudgetView').classList.toggle('active', view === 'yearly');
      
      if (view === 'yearly') {
        renderYearlyView();
      }
    });
  });
}

function renderYearlyView() {
  const currentYear = new Date().getFullYear();
  let totalIncome = 0;
  let totalExpenses = 0;
  
  // Calculate yearly totals
  Object.keys(appData.monthlyBudgets).forEach(monthKey => {
    if (monthKey.startsWith(String(currentYear))) {
      totalIncome += appData.monthlyBudgets[monthKey].income;
    }
  });
  
  appData.expenses.forEach(expense => {
    if (expense.month && expense.month.startsWith(String(currentYear))) {
      totalExpenses += expense.amount;
    }
  });
  
  const totalSavings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? Math.round((totalSavings / totalIncome) * 100) : 0;
  
  document.getElementById('yearlyIncome').textContent = formatCurrency(totalIncome);
  document.getElementById('yearlyExpenses').textContent = formatCurrency(totalExpenses);
  document.getElementById('yearlySavings').textContent = formatCurrency(totalSavings);
  document.getElementById('savingsRate').textContent = `${savingsRate}%`;
  
  // Render monthly breakdown
  renderMonthlyBreakdown();
  drawYearlyTrendChart();
}

function renderMonthlyBreakdown() {
  const currentYear = new Date().getFullYear();
  const months = [];
  
  for (let i = 0; i < 12; i++) {
    const monthKey = `${currentYear}-${String(i + 1).padStart(2, '0')}`;
    const monthBudget = appData.monthlyBudgets[monthKey];
    const income = monthBudget ? monthBudget.income : 0;
    const expenses = calculateMonthlySpent(monthKey);
    const savings = income - expenses;
    
    months.push({
      name: new Date(currentYear, i, 1).toLocaleDateString('en-US', { month: 'short' }),
      income,
      expenses,
      savings
    });
  }
  
  let tableHTML = '<table><thead><tr>';
  tableHTML += '<th>Month</th><th>Income</th><th>Expenses</th><th>Savings</th>';
  tableHTML += '</tr></thead><tbody>';
  
  months.forEach(month => {
    if (month.income > 0 || month.expenses > 0) {
      tableHTML += '<tr>';
      tableHTML += `<td>${month.name}</td>`;
      tableHTML += `<td class="amount">${formatCurrency(month.income)}</td>`;
      tableHTML += `<td class="amount">${formatCurrency(month.expenses)}</td>`;
      tableHTML += `<td class="amount">${formatCurrency(month.savings)}</td>`;
      tableHTML += '</tr>';
    }
  });
  
  tableHTML += '</tbody></table>';
  document.getElementById('monthlyBreakdownTable').innerHTML = tableHTML;
}

function drawYearlyTrendChart() {
  const canvas = document.getElementById('yearlyTrendChart');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  const container = canvas.parentElement;
  canvas.width = container.offsetWidth;
  canvas.height = container.offsetHeight;
  
  const currentYear = new Date().getFullYear();
  const monthlyData = [];
  
  for (let i = 0; i < 12; i++) {
    const monthKey = `${currentYear}-${String(i + 1).padStart(2, '0')}`;
    monthlyData.push(calculateMonthlySpent(monthKey));
  }
  
  const maxValue = Math.max(...monthlyData, 1);
  const chartHeight = canvas.height - 60;
  const stepX = (canvas.width - 80) / 11;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw line
  ctx.strokeStyle = '#3B82F6';
  ctx.lineWidth = 3;
  ctx.beginPath();
  
  monthlyData.forEach((value, index) => {
    const x = 50 + index * stepX;
    const y = canvas.height - 40 - (value / maxValue) * chartHeight;
    
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
    
    // Draw point
    ctx.fillStyle = '#3B82F6';
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  });
  
  ctx.stroke();
  
  // Draw month labels
  const monthNames = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
  ctx.fillStyle = '#13343B';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  
  monthNames.forEach((name, index) => {
    const x = 50 + index * stepX;
    ctx.fillText(name, x, canvas.height - 20);
  });
}

// Monthly Report Functions
function generateMonthlyReport() {
  const monthKey = document.getElementById('reportMonthSelect').value;
  const monthBudget = appData.monthlyBudgets[monthKey];
  const income = monthBudget ? monthBudget.income : 0;
  const expenses = calculateMonthlySpent(monthKey);
  const savings = income - expenses;
  
  document.getElementById('reportIncome').textContent = formatCurrency(income);
  document.getElementById('reportExpenses').textContent = formatCurrency(expenses);
  document.getElementById('reportSavings').textContent = formatCurrency(savings);
  
  // Render metrics
  const savingsRate = income > 0 ? Math.round((savings / income) * 100) : 0;
  const budgetAdherence = monthBudget ? calculateBudgetHealthScore(monthKey) : 0;
  const avgDailySpending = expenses / 30;
  
  const metricsHTML = `
    <div class="metric-item">
      <div class="metric-label">Savings Rate</div>
      <div class="metric-value">${savingsRate}%</div>
    </div>
    <div class="metric-item">
      <div class="metric-label">Budget Adherence</div>
      <div class="metric-value">${budgetAdherence}/100</div>
    </div>
    <div class="metric-item">
      <div class="metric-label">Average Daily Spending</div>
      <div class="metric-value amount">${formatCurrency(Math.round(avgDailySpending))}</div>
    </div>
  `;
  
  document.getElementById('reportMetrics').innerHTML = metricsHTML;
  
  // Category breakdown
  const categorySpending = calculateCategorySpendingForMonth(monthKey);
  const breakdownHTML = Object.keys(categorySpending)
    .filter(cat => categorySpending[cat] > 0)
    .map(category => {
      const amount = categorySpending[category];
      const percentage = income > 0 ? Math.round((amount / income) * 100) : 0;
      const icon = CATEGORY_ICONS[category] || '💵';
      
      return `
        <div class="category-breakdown-item">
          <div class="category-breakdown-info">
            <div class="category-breakdown-icon">${icon}</div>
            <div class="category-breakdown-name">${category}</div>
          </div>
          <div>
            <div class="category-breakdown-amount amount">${formatCurrency(amount)}</div>
            <div style="font-size: 12px; color: var(--color-text-secondary);">${percentage}% of income</div>
          </div>
        </div>
      `;
    }).join('');
  
  document.getElementById('reportCategoryBreakdown').innerHTML = breakdownHTML || '<div class="empty-state"><div class="empty-state-text">No expenses for this month</div></div>';
}

function exportReportCSV() {
  const monthKey = document.getElementById('reportMonthSelect').value;
  const monthExpenses = appData.expenses.filter(exp => exp.month === monthKey);
  
  let csv = 'Date,Category,Amount,Notes\n';
  monthExpenses.forEach(exp => {
    csv += `${exp.date},${exp.category},${exp.amount},"${exp.notes || ''}"\n`;
  });
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `expenses_${monthKey}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  
  showSuccessToast('Report exported successfully!');
}

// Gamification Functions
function updateDailyStreak() {
  const today = new Date().toISOString().split('T')[0];
  const lastActive = appData.gamification.lastActiveDate;
  
  if (lastActive === today) {
    return; // Already logged in today
  }
  
  if (lastActive) {
    const lastDate = new Date(lastActive);
    const todayDate = new Date(today);
    const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      // Consecutive day
      appData.gamification.streak++;
      if (!appData.gamification.streakDates) {
        appData.gamification.streakDates = [];
      }
      appData.gamification.streakDates.push(today);
      awardXP(5, 'Daily login bonus');
    } else if (diffDays > 1) {
      // Streak broken
      appData.gamification.streak = 1;
      appData.gamification.streakDates = [today];
    }
  } else {
    // First time
    appData.gamification.streak = 1;
    appData.gamification.streakDates = [today];
  }
  
  // Update longest streak
  if (appData.gamification.streak > appData.gamification.longestStreak) {
    appData.gamification.longestStreak = appData.gamification.streak;
  }
  
  appData.gamification.lastActiveDate = today;
  saveGamification();
  updateGamificationUI();
}

function updateGamificationUI() {
  const { level, xp, streak } = appData.gamification;
  const xpForNextLevel = getXPForLevel(level + 1);
  const xpProgress = ((xp / xpForNextLevel) * 100).toFixed(1);
  
  // Update hero section
  document.getElementById('heroStreak').textContent = `${streak} days`;
  document.getElementById('heroLevel').textContent = level;
  document.getElementById('heroXP').textContent = xp;
  document.getElementById('xpProgressFill').style.width = `${xpProgress}%`;
  document.getElementById('xpProgressText').textContent = `${xp} / ${xpForNextLevel} XP`;
  
  // Update nav
  const navStreakEl = document.getElementById('navStreakCount');
  const navLevelEl = document.getElementById('navLevelBadge');
  if (navStreakEl) navStreakEl.textContent = streak;
  if (navLevelEl) navLevelEl.textContent = `Lv.${level}`;
  
  // Update achievements view
  const totalAchievementsEl = document.getElementById('totalAchievements');
  const achievementLevelEl = document.getElementById('achievementLevel');
  const longestStreakEl = document.getElementById('longestStreak');
  
  if (totalAchievementsEl) {
    totalAchievementsEl.textContent = appData.gamification.achievements.length;
  }
  if (achievementLevelEl) {
    achievementLevelEl.textContent = level;
  }
  if (longestStreakEl) {
    longestStreakEl.textContent = `${appData.gamification.longestStreak} days`;
  }
}

function getXPForLevel(level) {
  return level * 100;
}

function awardXP(amount, reason) {
  const oldLevel = appData.gamification.level;
  appData.gamification.xp += amount;
  
  // Check for level up
  const xpForNextLevel = getXPForLevel(appData.gamification.level + 1);
  if (appData.gamification.xp >= xpForNextLevel) {
    appData.gamification.level++;
    showLevelUpModal(appData.gamification.level);
  }
  
  saveGamification();
  updateGamificationUI();
  
  // Show XP notification
  showXPNotification(amount, reason);
}

function showXPNotification(amount, reason) {
  // CRITICAL FIX: Enhanced XP notification with proper styling
  const notification = document.createElement('div');
  notification.className = 'xp-notification';
  notification.innerHTML = `
    <span class="xp-icon">⭐</span>
    <span class="xp-text">+${amount} XP</span>
    <span class="xp-action">${reason.replace('_', ' ')}</span>
  `;
  
  document.body.appendChild(notification);
  
  // Trigger animation
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);
  
  // Remove after 3 seconds
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

function showLevelUpModal(newLevel) {
  document.getElementById('levelUpNewLevel').textContent = `Level ${newLevel}`;
  document.getElementById('levelUpModal').classList.add('active');
}

function hideLevelUpModal() {
  document.getElementById('levelUpModal').classList.remove('active');
}

// Achievements System
const ACHIEVEMENTS = [
  { id: 'first_expense', name: 'First Steps', desc: 'Added your first expense', icon: '🎯', xp: 10 },
  { id: 'week_streak', name: 'Consistency King', desc: 'Tracked expenses for 7 days straight', icon: '🔥', xp: 50 },
  { id: 'budget_saver', name: 'Smart Saver', desc: 'Stayed under budget for a month', icon: '💰', xp: 100 },
  { id: 'goal_achiever', name: 'Goal Crusher', desc: 'Reached a savings goal', icon: '🏆', xp: 200 },
  { id: 'voice_user', name: 'Voice Master', desc: 'Used voice entry 5 times', icon: '🎤', xp: 30 },
  { id: 'scanner_pro', name: 'Scanner Pro', desc: 'Scanned 3 receipts', icon: '📸', xp: 40 },
  { id: 'chat_expert', name: 'Chat Expert', desc: 'Used chat entry 10 times', icon: '💬', xp: 50 },
  { id: 'level_5', name: 'Rising Star', desc: 'Reached Level 5', icon: '⭐', xp: 0 },
  { id: 'level_10', name: 'Budget Master', desc: 'Reached Level 10', icon: '🌟', xp: 0 }
];

function checkAchievements() {
  const { achievements } = appData.gamification;
  
  // First expense
  if (!achievements.includes('first_expense') && appData.expenses.length >= 1) {
    unlockAchievement('first_expense');
  }
  
  // Week streak
  if (!achievements.includes('week_streak') && appData.gamification.streak >= 7) {
    unlockAchievement('week_streak');
  }
  
  // Budget saver
  const currentMonthKey = getCurrentMonthKey();
  const healthScore = calculateBudgetHealthScore(currentMonthKey);
  if (!achievements.includes('budget_saver') && healthScore >= 90) {
    unlockAchievement('budget_saver');
  }
  
  // Goal achiever
  const completedGoals = appData.goals.filter(g => g.saved >= g.target);
  if (!achievements.includes('goal_achiever') && completedGoals.length >= 1) {
    unlockAchievement('goal_achiever');
  }
  
  // Voice user
  const voiceExpenses = appData.expenses.filter(e => e.method === 'voice');
  if (!achievements.includes('voice_user') && voiceExpenses.length >= 5) {
    unlockAchievement('voice_user');
  }
  
  // Scanner pro
  const scanExpenses = appData.expenses.filter(e => e.method === 'scan');
  if (!achievements.includes('scanner_pro') && scanExpenses.length >= 3) {
    unlockAchievement('scanner_pro');
  }
  
  // Chat expert
  const chatExpenses = appData.expenses.filter(e => e.method === 'chat');
  if (!achievements.includes('chat_expert') && chatExpenses.length >= 10) {
    unlockAchievement('chat_expert');
  }
  
  // Level achievements
  if (!achievements.includes('level_5') && appData.gamification.level >= 5) {
    unlockAchievement('level_5');
  }
  
  if (!achievements.includes('level_10') && appData.gamification.level >= 10) {
    unlockAchievement('level_10');
  }
}

function unlockAchievement(achievementId) {
  const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
  if (!achievement) return;
  
  appData.gamification.achievements.push(achievementId);
  saveGamification();
  
  // Award XP
  if (achievement.xp > 0) {
    awardXP(achievement.xp, achievement.name);
  }
  
  // Show achievement modal
  showAchievementModal(achievement);
  
  // Update achievements list
  renderAchievementsList();
}

function showAchievementModal(achievement) {
  document.getElementById('achievementBadgeLarge').textContent = achievement.icon;
  document.getElementById('achievementUnlockName').textContent = achievement.name;
  document.getElementById('achievementUnlockDesc').textContent = achievement.desc;
  document.getElementById('achievementXP').textContent = achievement.xp;
  document.getElementById('achievementModal').classList.add('active');
}

function hideAchievementModal() {
  document.getElementById('achievementModal').classList.remove('active');
}

function renderAchievementsList() {
  const listEl = document.getElementById('achievementsList');
  if (!listEl) return;
  
  const { achievements } = appData.gamification;
  
  listEl.innerHTML = ACHIEVEMENTS.map(achievement => {
    const isUnlocked = achievements.includes(achievement.id);
    return `
      <div class="achievement-item ${isUnlocked ? 'unlocked' : 'locked'}">
        ${isUnlocked ? '<div class="achievement-unlock-badge">✓</div>' : ''}
        <div class="achievement-icon">${achievement.icon}</div>
        <div class="achievement-name">${achievement.name}</div>
        <div class="achievement-desc">${achievement.desc}</div>
        <div class="achievement-xp">+${achievement.xp} XP</div>
      </div>
    `;
  }).join('');
}

function renderStreakCalendar() {
  const calendarEl = document.getElementById('streakCalendar');
  if (!calendarEl) return;
  
  const today = new Date();
  const streakDates = appData.gamification.streakDates || [];
  const todayStr = today.toISOString().split('T')[0];
  
  // Generate last 28 days
  const days = [];
  for (let i = 27; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const isActive = streakDates.includes(dateStr);
    const isToday = dateStr === todayStr;
    days.push({ date: date.getDate(), isActive, isToday });
  }
  
  calendarEl.innerHTML = days.map(day => `
    <div class="streak-day ${day.isActive ? 'active' : ''} ${day.isToday ? 'today' : ''}">
      ${day.date}
    </div>
  `).join('');
}

// Voice Entry Functions
let recognition = null;
let isRecording = false;

function startVoiceEntry() {
  switchView('addExpense');
  switchExpenseTab('voice');
}

function toggleVoiceRecording() {
  if (isRecording) {
    stopVoiceRecording();
  } else {
    startVoiceRecording();
  }
}

function setVoiceLanguage(lang) {
  currentVoiceLanguage = lang;
  
  // Update UI
  document.querySelectorAll('.language-btn').forEach(btn => {
    if (btn.id === 'voiceLangEN' && lang === 'en-IN') {
      btn.classList.add('active');
    } else if (btn.id === 'voiceLangTA' && lang === 'ta-IN') {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  // Update examples
  const examplesEl = document.getElementById('voiceExamples');
  const instructionEl = document.getElementById('voiceInstruction');
  
  if (lang === 'ta-IN') {
    instructionEl.textContent = 'மைக்ரோபோனை க்ளிக் செய்து இவ்வாறு சொல்லுங்கள்:';
    examplesEl.innerHTML = `
      <div class="voice-example">"செலவு இருநூறு ரூபாய் சாப்பாட்டுக்கு"</div>
      <div class="voice-example">"க்ரோசரி வாங்கினேன் ஆயிரம் ரூபாய்க்கு"</div>
      <div class="voice-example">"பஸ் கட்டணம் ஐம்பது ரூபாய்"</div>
    `;
  } else {
    instructionEl.textContent = 'Click the microphone and say something like:';
    examplesEl.innerHTML = `
      <div class="voice-example">"Spent 200 rupees on lunch"</div>
      <div class="voice-example">"Bought groceries for 1500"</div>
      <div class="voice-example">"Paid 50 for bus ride"</div>
    `;
  }
}

function startVoiceRecording() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    alert('Voice recognition is not supported in your browser. Please try Chrome.');
    return;
  }
  
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.lang = currentVoiceLanguage; // Use selected language
  recognition.continuous = false;
  recognition.interimResults = false;
  
  recognition.onstart = () => {
    isRecording = true;
    const btn = document.getElementById('voiceRecordBtn');
    btn.classList.add('recording');
    btn.querySelector('.voice-text').textContent = 'Listening...';
    document.getElementById('voiceTranscript').textContent = '';
    document.getElementById('voiceParsedResult').innerHTML = '';
  };
  
  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    document.getElementById('voiceTranscript').textContent = `You said: "${transcript}"`;
    parseVoiceExpense(transcript);
  };
  
  recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    stopVoiceRecording();
    alert('Voice recognition error. Please try again.');
  };
  
  recognition.onend = () => {
    stopVoiceRecording();
  };
  
  recognition.start();
}

function stopVoiceRecording() {
  isRecording = false;
  const btn = document.getElementById('voiceRecordBtn');
  btn.classList.remove('recording');
  btn.querySelector('.voice-text').textContent = 'Tap to Speak';
  if (recognition) {
    recognition.stop();
  }
}

function parseVoiceExpense(text) {
  const lowerText = text.toLowerCase();
  
  // Enhanced amount extraction patterns (English and Tamil)
  let amount = null;
  const amountPatterns = [
    /(\d+)\s*(rupees?|rs?\.?|inr|ரூபாய்)/i,
    /(?:spent|paid|bought|cost|செலவு|கட்டணம்|வாங்கினேன்)\s*(?:rs\.?|rupees?|₹|ரூபாய்)?\s*(\d+)/i,
    /(\d+)\s*(?:rs\.?|rupees?|₹|ரூபாய்)/i,
    /(?:for|of|க்கு)\s*(\d+)/i
  ];
  
  for (const pattern of amountPatterns) {
    const match = lowerText.match(pattern);
    if (match) {
      amount = parseInt(match[1]);
      break;
    }
  }
  
  // Enhanced category detection with more keywords (English and Tamil)
  let category = 'Misc';
  const categoryKeywords = {
    Food: ['food', 'lunch', 'dinner', 'breakfast', 'snack', 'grocery', 'groceries', 'restaurant', 'cafe', 'coffee', 'tea', 'meal', 'eating', 'canteen', 'mess', 'pizza', 'burger', 'biryani',
           'சாப்பாடு', 'உணவு', 'காலை உணவு', 'மதிய உணவு', 'இரவு உணவு', 'க்ரோசரி', 'கடை'],
    Travel: ['travel', 'bus', 'metro', 'taxi', 'uber', 'ola', 'train', 'flight', 'transport', 'auto', 'rickshaw', 'cab', 'ride', 'petrol', 'fuel',
             'பயணம்', 'பஸ்', 'மெட்ரோ', 'டாக்ஸி', 'ரிக்ஷா', 'ட்ரைன்', 'போக்குவரத்து'],
    Study: ['study', 'book', 'books', 'course', 'education', 'tuition', 'college', 'school', 'pen', 'pencil', 'notebook', 'textbook', 'stationery', 'fees', 'assignment',
            'படிப்பு', 'புத்தகம்', 'கல்வி', 'பள்ளி', 'காலேஜ்'],
    Misc: ['movie', 'game', 'shopping', 'clothes', 'gift', 'entertainment', 'phone', 'mobile', 'recharge', 'medicine', 'health',
           'படம்', 'விளையாட்டு', 'வாங்குதல்', 'செல்போன்']
  };
  
  for (const [cat, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      category = cat;
      break;
    }
  }
  
  if (amount) {
    const resultHTML = `
      <div style="text-align: center; margin-bottom: 16px;">
        <div style="font-size: 48px; margin-bottom: 8px;">✓</div>
        <h4 style="margin: 0 0 16px 0; color: var(--color-success);">Expense Detected!</h4>
      </div>
      <div style="background: rgba(255,255,255,0.5); padding: 16px; border-radius: 8px; margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <strong>Amount:</strong>
          <span style="color: var(--color-primary); font-weight: 600;">₹${amount}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <strong>Category:</strong>
          <span class="expense-category ${category}">${category}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <strong>Date:</strong>
          <span>Today</span>
        </div>
      </div>
      <div style="display: flex; gap: 8px;">
        <button class="btn btn-primary" style="flex: 1;" onclick="confirmVoiceExpense(${amount}, '${category}')">✓ Confirm &amp; Add</button>
        <button class="btn btn-secondary" onclick="startVoiceRecording()">↻ Try Again</button>
      </div>
    `;
    document.getElementById('voiceParsedResult').innerHTML = resultHTML;
  } else {
    document.getElementById('voiceParsedResult').innerHTML = `
      <div style="text-align: center;">
        <div style="font-size: 48px; margin-bottom: 8px;">🤔</div>
        <p style="color: var(--color-warning); font-weight: 600; margin-bottom: 8px;">Could not detect amount</p>
        <p style="font-size: 12px; opacity: 0.8; margin-bottom: 16px;">Try: "Spent 250 rupees on lunch"</p>
        <button class="btn btn-primary" onclick="startVoiceRecording()">🎤 Try Again</button>
      </div>
    `;
  }
}

function confirmVoiceExpense(amount, category) {
  const today = new Date().toISOString().split('T')[0];
  const monthKey = today.substring(0, 7);
  
  // CRITICAL: Preserve session before adding expense
  const currentUser = appData.user ? appData.user.username : null;
  
  const expense = {
    id: nextExpenseId++,
    date: today,
    category,
    amount,
    notes: `Added via voice (${currentVoiceLanguage === 'ta-IN' ? 'Tamil' : 'English'})`,
    month: monthKey,
    method: 'voice',
    userId: currentUser
  };
  
  // Add expense to memory
  appData.expenses.push(expense);
  saveExpenses();
  
  console.log('✅ Voice expense added:', expense);
  
  awardXP(10, 'Voice entry bonus');
  checkAchievements();
  
  document.getElementById('voiceParsedResult').innerHTML = `
    <p style="color: var(--color-success); font-weight: 600;">✅ Expense added successfully!</p>
  `;
  
  // Update UI immediately
  updateDashboard();
  renderExpensesList();
  drawChart();
  
  setTimeout(() => {
    switchView('dashboard');
  }, 1500);
}

// Chat Entry Functions
function openChatEntry() {
  switchView('addExpense');
  switchExpenseTab('chat');
}

function handleChatKeyPress(event) {
  if (event.key === 'Enter') {
    sendChatMessage();
  }
}

function setChatLanguage(lang) {
  currentChatLanguage = lang;
  
  // Update UI
  document.querySelectorAll('.language-btn').forEach(btn => {
    if (btn.id === 'chatLangEN' && lang === 'en') {
      btn.classList.add('active');
    } else if (btn.id === 'chatLangTA' && lang === 'ta') {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  // Update welcome message
  const welcomeEl = document.getElementById('chatWelcomeMessage');
  if (lang === 'ta') {
    welcomeEl.textContent = 'வணக்கம்! உங்கள் செலவை சொல்லுங்கள். உதாரணம்: "சாப்பாட்டுக்கு 150 செலவு"';
  } else {
    welcomeEl.textContent = 'Hi! Tell me about your expense. For example: "Spent 150 on coffee"';
  }
}

function sendChatMessage() {
  const input = document.getElementById('chatInput');
  const message = input.value.trim();
  
  if (!message) return;
  
  const chatMessages = document.getElementById('chatMessages');
  
  // Add user message
  const userMsg = document.createElement('div');
  userMsg.className = 'chat-message user';
  userMsg.innerHTML = `
    <div class="chat-avatar">👤</div>
    <div class="chat-bubble">${message}</div>
  `;
  chatMessages.appendChild(userMsg);
  
  input.value = '';
  chatMessages.scrollTop = chatMessages.scrollHeight;
  
  // Parse and respond
  setTimeout(() => {
    parseChatExpense(message);
  }, 500);
}

function parseChatExpense(text) {
  const lowerText = text.toLowerCase();
  
  // Enhanced amount extraction (English and Tamil)
  let amount = null;
  const amountPatterns = [
    /(?:spent|paid|bought|cost|செலவு|கட்டணம்|வாங்கினேன்)\s*(?:rs\.?|rupees?|₹|ரூபாய்)?\s*(\d+)/i,
    /(\d+)\s*(?:rs\.?|rupees?|₹|ரூபாய்)/i,
    /(?:for|of|க்கு)\s*(\d+)/i,
    /(\d+)/
  ];
  
  for (const pattern of amountPatterns) {
    const match = lowerText.match(pattern);
    if (match) {
      amount = parseInt(match[1]);
      break;
    }
  }
  
  // Enhanced category detection (English and Tamil)
  let category = 'Misc';
  const categoryKeywords = {
    Food: ['food', 'lunch', 'dinner', 'breakfast', 'snack', 'grocery', 'groceries', 'restaurant', 'cafe', 'coffee', 'tea', 'meal', 'eating', 'canteen', 'mess', 'pizza', 'burger', 'biryani',
           'சாப்பாடு', 'உணவு', 'காலை', 'மதியம்', 'இரவு', 'க்ரோசரி'],
    Travel: ['travel', 'bus', 'metro', 'taxi', 'uber', 'ola', 'train', 'flight', 'transport', 'auto', 'rickshaw', 'cab', 'ride', 'petrol', 'fuel',
             'பயணம்', 'பஸ்', 'மெட்ரோ', 'டாக்ஸி', 'ரிக்ஷா'],
    Study: ['study', 'book', 'books', 'course', 'education', 'tuition', 'college', 'school', 'pen', 'pencil', 'notebook', 'textbook', 'stationery', 'fees', 'assignment',
            'படிப்பு', 'புத்தகம்', 'கல்வி', 'பள்ளி'],
    Misc: ['movie', 'game', 'shopping', 'clothes', 'gift', 'entertainment', 'phone', 'mobile', 'recharge', 'medicine', 'health',
           'படம்', 'விளையாட்டு', 'செல்போன்']
  };
  
  for (const [cat, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      category = cat;
      break;
    }
  }
  
  const chatMessages = document.getElementById('chatMessages');
  
  if (amount) {
    const botMsg = document.createElement('div');
    botMsg.className = 'chat-message bot';
    botMsg.innerHTML = `
      <div class="chat-avatar">🤖</div>
      <div class="chat-bubble">
        <div style="margin-bottom: 12px;">✓ Perfect! I detected:</div>
        <div style="background: rgba(255,255,255,0.5); padding: 12px; border-radius: 8px; margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span>💰 Amount:</span>
            <strong style="color: var(--color-primary);">₹${amount}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span>📂 Category:</span>
            <span class="expense-category ${category}">${category}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>📅 Date:</span>
            <span>Today</span>
          </div>
        </div>
        <button class="btn btn-primary btn-sm" style="width: 100%;" onclick="confirmChatExpense(${amount}, '${category}')">✓ Confirm &amp; Add Expense</button>
      </div>
    `;
    chatMessages.appendChild(botMsg);
  } else {
    const botMsg = document.createElement('div');
    botMsg.className = 'chat-message bot';
    botMsg.innerHTML = `
      <div class="chat-avatar">🤖</div>
      <div class="chat-bubble">
        <div style="margin-bottom: 8px;">🤔 I couldn't detect an amount.</div>
        <div style="font-size: 12px; opacity: 0.8;">Try: "Spent 250 on lunch" or "Bought books for 800"</div>
      </div>
    `;
    chatMessages.appendChild(botMsg);
  }
  
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function confirmChatExpense(amount, category) {
  const today = new Date().toISOString().split('T')[0];
  const monthKey = today.substring(0, 7);
  
  // CRITICAL: Preserve session before adding expense
  const currentUser = appData.user ? appData.user.username : null;
  
  const expense = {
    id: nextExpenseId++,
    date: today,
    category,
    amount,
    notes: `Added via chat (${currentChatLanguage === 'ta' ? 'Tamil' : 'English'})`,
    month: monthKey,
    method: 'chat',
    userId: currentUser
  };
  
  // Add expense to memory
  appData.expenses.push(expense);
  saveExpenses();
  
  console.log('✅ Chat expense added:', expense);
  
  awardXP(5, 'Chat entry');
  checkAchievements();
  
  const chatMessages = document.getElementById('chatMessages');
  const botMsg = document.createElement('div');
  botMsg.className = 'chat-message bot';
  botMsg.innerHTML = `
    <div class="chat-avatar">🤖</div>
    <div class="chat-bubble">✅ ${currentChatLanguage === 'ta' ? 'செலவு வெற்றிகரமாக சேர்க்கப்பட்டது!' : 'Expense added successfully! You earned +5 XP!'}</div>
  `;
  chatMessages.appendChild(botMsg);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  
  // Update UI immediately
  updateDashboard();
  renderExpensesList();
  drawChart();
  
  setTimeout(() => {
    switchView('dashboard');
  }, 1500);
}

// Receipt Scanner Functions
function openReceiptScanner() {
  switchView('addExpense');
  switchExpenseTab('scan');
}

function handleReceiptUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById('scannerUploadArea').style.display = 'none';
    const preview = document.getElementById('scannerPreview');
    preview.style.display = 'block';
    
    const img = document.getElementById('receiptImage');
    img.src = e.target.result;
    
    // Show loading
    document.getElementById('scannerLoading').style.display = 'block';
    document.getElementById('scannedData').style.display = 'none';
    
    // Simulate OCR processing
    setTimeout(() => {
      mockOCRProcessing();
    }, 2000);
  };
  reader.readAsDataURL(file);
}

function mockOCRProcessing() {
  // Enhanced mock OCR with more realistic results (Including Tamil merchants)
  const mockResults = [
    { merchant: 'BigBazaar', amount: 1250, category: 'Food', confidence: 94 },
    { merchant: 'Crossword Books', amount: 450, category: 'Study', confidence: 89 },
    { merchant: 'Metro Card Office', amount: 500, category: 'Travel', confidence: 96 },
    { merchant: 'Cafe Coffee Day', amount: 380, category: 'Food', confidence: 92 },
    { merchant: 'BookMyShow', amount: 250, category: 'Misc', confidence: 88 },
    { merchant: 'Reliance Fresh', amount: 850, category: 'Food', confidence: 95 },
    { merchant: 'DMart', amount: 1450, category: 'Food', confidence: 91 },
    { merchant: 'Campus Canteen', amount: 150, category: 'Food', confidence: 87 },
    { merchant: 'சரவணா பவன்', amount: 280, category: 'Food', confidence: 85 },
    { merchant: 'MTC Bus Ticket', amount: 45, category: 'Travel', confidence: 93 },
    { merchant: 'புத்தக கடை', amount: 620, category: 'Study', confidence: 90 }
  ];
  
  const result = mockResults[Math.floor(Math.random() * mockResults.length)];
  
  // Determine confidence color
  let confidenceClass = 'success';
  if (result.confidence < 90) confidenceClass = 'warning';
  if (result.confidence < 80) confidenceClass = 'error';
  
  document.getElementById('scannerLoading').style.display = 'none';
  const scannedDataEl = document.getElementById('scannedData');
  scannedDataEl.style.display = 'block';
  scannedDataEl.innerHTML = `
    <div style="text-align: center; margin-bottom: 16px;">
      <div style="font-size: 48px; margin-bottom: 8px;">📄</div>
      <h4 style="margin: 0 0 8px 0; color: var(--color-success);">✓ Receipt Scanned Successfully</h4>
    </div>
    <div style="background: rgba(255,255,255,0.5); padding: 16px; border-radius: 8px; margin-bottom: 16px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <strong>Merchant:</strong>
        <span>${result.merchant}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <strong>Amount:</strong>
        <span style="color: var(--color-primary); font-weight: 600;">₹${result.amount}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <strong>Category:</strong>
        <span class="expense-category ${result.category}">${result.category}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <strong>Date:</strong>
        <span>Today</span>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <strong>Confidence:</strong>
        <span style="display: flex; align-items: center; gap: 8px;">
          <span style="color: ${confidenceClass === 'success' ? '#10B981' : confidenceClass === 'warning' ? '#F59E0B' : '#EF4444'}; font-weight: 600;">${result.confidence}%</span>
          <span style="font-size: 12px;">${confidenceClass === 'success' ? '✓ High' : confidenceClass === 'warning' ? '⚠ Medium' : '⚠ Low'}</span>
        </span>
      </div>
    </div>
    <div style="display: flex; gap: 8px;">
      <button class="btn btn-primary" style="flex: 1;" onclick="confirmScannedExpense(${result.amount}, '${result.category}', '${result.merchant}')">✓ Confirm &amp; Add</button>
      <button class="btn btn-secondary" onclick="resetScanner()">↻ Scan Another</button>
    </div>
  `;
}

function confirmScannedExpense(amount, category, merchant) {
  const today = new Date().toISOString().split('T')[0];
  const monthKey = today.substring(0, 7);
  
  // CRITICAL: Preserve session before adding expense
  const currentUser = appData.user ? appData.user.username : null;
  
  const expense = {
    id: nextExpenseId++,
    date: today,
    category,
    amount,
    notes: `Scanned from ${merchant}`,
    month: monthKey,
    method: 'scan',
    userId: currentUser
  };
  
  // Add expense to memory
  appData.expenses.push(expense);
  saveExpenses();
  
  console.log('✅ Scanned expense added:', expense);
  
  awardXP(15, 'Receipt scan bonus');
  checkAchievements();
  
  document.getElementById('scannedData').innerHTML = `
    <p style="color: var(--color-success); font-weight: 600; font-size: 18px;">✅ Expense added successfully!</p>
  `;
  
  // Update UI immediately
  updateDashboard();
  renderExpensesList();
  drawChart();
  
  setTimeout(() => {
    switchView('dashboard');
    resetScanner();
  }, 1500);
}

function resetScanner() {
  document.getElementById('scannerUploadArea').style.display = 'block';
  document.getElementById('scannerPreview').style.display = 'none';
  document.getElementById('receiptFileInput').value = '';
}

function switchExpenseTab(tab) {
  // Update tabs
  document.querySelectorAll('.expense-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.expense-tab[data-tab="${tab}"]`).classList.add('active');
  
  // Update content
  document.querySelectorAll('.expense-tab-content').forEach(c => c.classList.remove('active'));
  
  if (tab === 'manual') {
    document.getElementById('manualExpenseContent').classList.add('active');
  } else if (tab === 'voice') {
    document.getElementById('voiceExpenseContent').classList.add('active');
  } else if (tab === 'chat') {
    document.getElementById('chatExpenseContent').classList.add('active');
  } else if (tab === 'scan') {
    document.getElementById('scanExpenseContent').classList.add('active');
  }
}

// AI Insights Functions
function renderAIInsights() {
  renderAIRecommendations();
  renderSpendingAnalysis();
  renderAIPredictions();
  renderSavingsTips();
}

function renderAIRecommendations() {
  const el = document.getElementById('aiRecommendations');
  if (!el) return;
  
  const recommendations = [
    { icon: '💡', text: 'You typically spend 30% more on weekends. Try planning activities in advance to reduce impulse purchases.' },
    { icon: '🎯', text: 'Based on your spending patterns, setting a daily limit of ₹200 could help you save ₹1,500 more per month.' },
    { icon: '🏆', text: 'You\'re doing great with your Study budget! You\'ve stayed 15% under budget this month.' }
  ];
  
  el.innerHTML = recommendations.map(r => `
    <div class="ai-insight-item">
      <div class="ai-insight-icon">${r.icon}</div>
      <div class="ai-insight-text">${r.text}</div>
    </div>
  `).join('');
}

function renderSpendingAnalysis() {
  const el = document.getElementById('spendingAnalysis');
  if (!el) return;
  
  const categorySpending = calculateCategorySpending();
  const totalSpent = calculateTotalSpent();
  
  const analysis = [
    { icon: '🍔', text: `Your Food spending (₹${categorySpending.Food}) is ${Math.round((categorySpending.Food / totalSpent) * 100)}% of total expenses.` },
    { icon: '📊', text: 'Your spending is most consistent on weekdays. Weekend expenses are 40% higher on average.' },
    { icon: '⏰', text: 'You typically spend more between 12-2 PM. Carrying a packed lunch could save you ₹300/week.' }
  ];
  
  el.innerHTML = analysis.map(a => `
    <div class="ai-insight-item">
      <div class="ai-insight-icon">${a.icon}</div>
      <div class="ai-insight-text">${a.text}</div>
    </div>
  `).join('');
}

function renderAIPredictions() {
  const el = document.getElementById('aiPredictions');
  if (!el) return;
  
  const currentMonthKey = getCurrentMonthKey();
  const monthSpent = calculateMonthlySpent(currentMonthKey);
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const currentDay = new Date().getDate();
  const projectedSpending = Math.round((monthSpent / currentDay) * daysInMonth);
  
  const predictions = [
    { icon: '🔮', text: `Based on current trends, you\'ll spend approximately ₹${projectedSpending} this month.` },
    { icon: '💰', text: `At your current saving rate, you\'ll reach your laptop goal in approximately 8 months.` },
    { icon: '📈', text: 'Your Food expenses are trending upward. Consider meal prepping to save ₹500/month.' }
  ];
  
  el.innerHTML = predictions.map(p => `
    <div class="ai-insight-item">
      <div class="ai-insight-icon">${p.icon}</div>
      <div class="ai-insight-text">${p.text}</div>
    </div>
  `).join('');
}

function renderSavingsTips() {
  const el = document.getElementById('savingsTips');
  if (!el) return;
  
  const tips = [
    { icon: '🍳', text: 'Cook at home twice a week to save ₹500/month. Try meal prepping on Sundays!' },
    { icon: '🎓', text: 'Use your student ID! Many places offer 10-20% discounts for students.' },
    { icon: '💳', text: 'Try the 24-hour rule: Wait a day before making non-essential purchases over ₹500.' },
    { icon: '🚌', text: 'Consider a monthly bus pass instead of daily tickets to save ₹200/month.' }
  ];
  
  el.innerHTML = tips.map(t => `
    <div class="ai-insight-item">
      <div class="ai-insight-icon">${t.icon}</div>
      <div class="ai-insight-text">${t.text}</div>
    </div>
  `).join('');
}

// Parent Notification System
function checkParentNotification() {
  if (!appData.profile || !appData.profile.parentMobile) return;
  
  const currentMonthKey = getCurrentMonthKey();
  const monthBudget = appData.monthlyBudgets[currentMonthKey];
  
  if (!monthBudget) return;
  
  const totalSpent = calculateMonthlySpent(currentMonthKey);
  const totalBudget = Object.values(monthBudget.budgets)
    .filter((_, idx) => Object.keys(monthBudget.budgets)[idx] !== 'Savings')
    .reduce((sum, val) => sum + (val.amount || val), 0);
  
  const percentageUsed = (totalSpent / totalBudget) * 100;
  const threshold = appData.profile.alertThreshold || 110;
  
  if (percentageUsed >= threshold) {
    const message = `⚠️ Alert: Spending at ${Math.round(percentageUsed)}% of budget (Threshold: ${threshold}%)`;
    showParentNotification(message);
  }
}

function showParentNotification(message) {
  const notification = document.getElementById('parentNotification');
  notification.querySelector('.parent-notif-text').textContent = message;
  notification.style.display = 'flex';
  
  setTimeout(() => {
    notification.style.display = 'none';
  }, 5000);
}

// Profile Functions
function loadProfileSettings() {
  if (!appData.profile) return;
  
  // Load profile picture
  if (appData.profile.profilePicture) {
    document.getElementById('profilePicture').src = appData.profile.profilePicture;
    document.getElementById('profilePicture').style.display = 'block';
    document.getElementById('profilePlaceholder').style.display = 'none';
  }
  
  // CRITICAL: Ensure phone input is always enabled and accessible
  const phoneInput = document.getElementById('parentMobile');
  if (phoneInput) {
    phoneInput.removeAttribute('disabled');
    phoneInput.removeAttribute('readonly');
    phoneInput.setAttribute('type', 'tel');
    console.log('Phone input initialized and enabled');
  }
  
  // Load profile info
  document.getElementById('profileUsername').textContent = appData.profile.username || 'Student';
  document.getElementById('profileLevel').textContent = appData.gamification.level;
  document.getElementById('profileXP').textContent = appData.gamification.xp;
  
  // Load parent mobile
  if (appData.profile.parentMobile) {
    // Parse and display saved number
    const parts = appData.profile.parentMobile.split('-');
    if (parts.length === 2) {
      document.getElementById('countryCode').value = parts[0];
      document.getElementById('parentMobile').value = parts[1];
      const displayEl = document.getElementById('savedNumberDisplay');
      displayEl.textContent = `✅ Saved: ${appData.profile.parentMobile}`;
      displayEl.style.display = 'block';
    }
  }
  
  // Load alert threshold
  document.getElementById('alertThreshold').value = appData.profile.alertThreshold || 110;
  document.getElementById('thresholdValue').textContent = (appData.profile.alertThreshold || 110) + '%';
  
  // Load toggles
  document.getElementById('monthlySummary').checked = appData.profile.monthlySummary !== false;
  document.getElementById('emergencyAlerts').checked = appData.profile.emergencyAlerts !== false;
  document.getElementById('darkModeToggle').checked = appData.profile.darkMode || false;
  document.getElementById('notificationsToggle').checked = appData.profile.notifications !== false;
  document.getElementById('privacyModeToggle').checked = appData.profile.privacyMode || false;
  
  // Apply dark mode if enabled
  if (appData.profile.darkMode) {
    document.body.classList.add('dark-mode');
  }
}

function initProfilePicture() {
  const input = document.getElementById('profilePicInput');
  input.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const imageData = event.target.result;
      appData.profile.profilePicture = imageData;
      saveProfileData();
      
      document.getElementById('profilePicture').src = imageData;
      document.getElementById('profilePicture').style.display = 'block';
      document.getElementById('profilePlaceholder').style.display = 'none';
      
      showSuccessToast('Profile picture updated!');
    };
    reader.readAsDataURL(file);
  });
}

function saveParentMobile() {
  const mobileInput = document.getElementById('parentMobile');
  const countryCode = document.getElementById('countryCode').value;
  const mobile = mobileInput ? mobileInput.value.trim() : '';
  
  if (!mobile) {
    alert('Please enter a mobile number');
    if (mobileInput) mobileInput.focus();
    return;
  }
  
  if (!/^[0-9]{10}$/.test(mobile)) {
    alert('Please enter a valid 10-digit mobile number (numbers only, no spaces or dashes)');
    if (mobileInput) {
      mobileInput.focus();
      mobileInput.select();
    }
    return;
  }
  
  const fullNumber = `${countryCode}-${mobile}`;
  appData.profile.parentMobile = fullNumber;
  saveProfileData();
  
  // Display saved number
  const displayEl = document.getElementById('savedNumberDisplay');
  if (displayEl) {
    displayEl.textContent = `✅ Saved: ${fullNumber}`;
    displayEl.style.display = 'block';
  }
  
  showSuccessToast('✅ Parent mobile number saved successfully!');
}

function updateThresholdDisplay(value) {
  document.getElementById('thresholdValue').textContent = value + '%';
  appData.profile.alertThreshold = parseInt(value);
  saveProfileData();
}

function toggleDarkMode() {
  const checked = document.getElementById('darkModeToggle').checked;
  appData.profile.darkMode = checked;
  saveProfileData();
  
  document.body.classList.toggle('dark-mode', checked);
}

function togglePrivacyMode() {
  const checked = document.getElementById('privacyModeToggle').checked;
  privacyMode = checked;
  appData.profile.privacyMode = checked;
  saveProfileData();
  
  document.body.classList.toggle('privacy-mode', checked);
}

function downloadUserData() {
  let csv = 'Date,Category,Amount,Notes\n';
  appData.expenses.forEach(exp => {
    csv += `${exp.date},${exp.category},${exp.amount},"${exp.notes || ''}"\n`;
  });
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `zeniwise_data_${appData.user.username}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  
  showSuccessToast('Data downloaded successfully!');
}

function clearAllData() {
  if (!confirm('Are you sure you want to clear all data? This action cannot be undone!')) {
    return;
  }
  
  const username = appData.user.username;
  appData.expenses = [];
  appData.goals = [];
  appData.monthlyBudgets = {};
  appData.gamification = {
    level: 1,
    xp: 0,
    streak: 0,
    longestStreak: 0,
    lastActiveDate: null,
    achievements: [],
    streakDates: []
  };
  
  saveUserData();
  
  updateDashboard();
  renderExpensesList();
  renderGoalsList();
  updateGamificationUI();
  
  showSuccessToast('All data cleared!');
}

function logoutUser() {
  if (!confirm('Are you sure you want to logout?')) {
    return;
  }
  
  // Clear current user
  persistentStorage[STORAGE_KEYS.currentUser] = null;
  appData.user = null;
  
  // Return to auth screen
  document.getElementById('appScreen').classList.remove('active');
  document.getElementById('authScreen').classList.add('active');
  document.getElementById('loginForm').reset();
  document.getElementById('signupForm').reset();
}

// Simple tab navigation for dashboard
function showTab(tabName) {
  // Hide all tabs
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  
  // Remove active from all nav tabs
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  
  // Show selected tab
  if (tabName === 'home') {
    document.getElementById('homeTab').classList.add('active');
    document.querySelectorAll('.nav-tab[data-tab="home"]').forEach(t => t.classList.add('active'));
  } else if (tabName === 'expenses') {
    document.getElementById('expensesTab').classList.add('active');
    document.querySelectorAll('.nav-tab[data-tab="expenses"]').forEach(t => t.classList.add('active'));
  } else if (tabName === 'profile') {
    document.getElementById('profileTab').classList.add('active');
    document.querySelectorAll('.nav-tab[data-tab="profile"]').forEach(t => t.classList.add('active'));
  }
}

// Initialize date on page load
window.addEventListener('DOMContentLoaded', function() {
  const dateInput = document.getElementById('expenseDate');
  if (dateInput) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }
});

// Initialize app
function init() {
  console.log('🚀 Zeniwise Budget Planner - Starting...');
  
  // Add tab navigation listeners
  document.querySelectorAll('.nav-tab[data-tab]').forEach(tab => {
    tab.addEventListener('click', function() {
      const tabName = this.getAttribute('data-tab');
      showTab(tabName);
    });
  });
  
  initAuth();
  initNavigation();
  initExpenseForm();
  initGoalForm();
  initAddMoneyForm();
  initIncomeEdit();
  initBudgetViewToggle();
  initProfilePicture();
  checkAutoLogin();
  
  // Initialize Parent Co-Pilot
  loadParentCoPilotSettings();
  
  // Initialize gamification
  updateGamificationUI();
  checkAchievements();
  
  // Handle window resize for charts
  window.addEventListener('resize', () => {
    if (currentView === 'dashboard') {
      drawChart();
    } else if (currentView === 'budgetPlanner') {
      const currentMonthKey = appData.currentMonth || getCurrentMonthKey();
      drawBudgetChart(currentMonthKey);
      if (document.getElementById('yearlyBudgetView').classList.contains('active')) {
        drawYearlyTrendChart();
      }
    }
  });
}

// Start the app when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Check parent notifications periodically
setInterval(() => {
  if (appData.user) {
    checkParentNotification();
  }
}, 60000); // Check every minute