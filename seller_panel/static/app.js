const API_BASE = '/api';
// Make API_BASE available globally for sale-functions.js
window.API_BASE = API_BASE;

// Current user data
let currentUser = null;
let currentToken = null;
let userPermissions = [];

// Check authentication on page load
function checkAuth() {
    console.log('checkAuth called'); // Debug log
    const token = localStorage.getItem('seller_token');
    const userId = localStorage.getItem('seller_id');
    
    console.log('Token:', token ? 'exists' : 'not found');
    console.log('User ID:', userId);
    
    if (token && userId) {
        currentToken = token;
        loadCurrentUser(parseInt(userId));
        showPanel();
    } else {
        console.log('No token found, showing login page');
        showLogin();
    }
}

// Load current user data without showing panel (used after login)
async function loadCurrentUserData(userId) {
    try {
        const token = localStorage.getItem('seller_token');
        if (!token) {
            console.warn('No token found');
            return;
        }
        
        const response = await fetch(`${API_BASE}/auth/me`, {
            headers: {
                'X-Seller-ID': userId,
                'Authorization': token ? `Bearer ${token}` : ''
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            currentUser = data;
            currentToken = token;
            userPermissions = data.permissions || [];
            
            // Store in global for other scripts
            if (typeof window !== 'undefined') {
                window.currentUser = data;
            }
            
            // Update UI if needed
            const sellerNameEl = document.getElementById('seller-name');
            if (sellerNameEl && data.name && !sellerNameEl.textContent) {
                sellerNameEl.textContent = data.name;
            }
            
            const sellerRoleEl = document.getElementById('seller-role');
            if (sellerRoleEl && data.role_name && !sellerRoleEl.textContent) {
                sellerRoleEl.textContent = data.role_name;
            }
            
            // Update navigation based on permissions
            updateNavigation();
            
            // Check if user is admin and show admin nav item
            const isAdmin = data.role_name?.toLowerCase().includes('admin') || 
                          (data.permissions && (
                              data.permissions.includes('admin.settings') ||
                              data.permissions.includes('admin.sellers') ||
                              data.permissions.includes('admin.roles')
                          ));
            
            const adminNavItem = document.getElementById('admin-nav-item');
            if (adminNavItem) {
                if (isAdmin) {
                    adminNavItem.style.display = 'flex';
                } else {
                    adminNavItem.style.display = 'none';
                }
            }
        } else {
            console.error('Auth failed:', response.status);
        }
    } catch (error) {
        console.error('Error loading current user data:', error);
    }
}

// Load current user and show panel (used on page load)
async function loadCurrentUser(userId) {
    try {
        const token = localStorage.getItem('seller_token');
        if (!token) {
            console.warn('No token found, showing login');
            showLogin();
            return;
        }
        
        const response = await fetch(`${API_BASE}/auth/me`, {
            headers: {
                'X-Seller-ID': userId,
                'Authorization': token ? `Bearer ${token}` : ''
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            currentUser = data;
            currentToken = token;
            userPermissions = data.permissions || [];
            
            // Store in global for other scripts
            if (typeof window !== 'undefined') {
                window.currentUser = data;
            }
            
            // Update UI
            const sellerNameEl = document.getElementById('seller-name');
            if (sellerNameEl && data.name) {
                sellerNameEl.textContent = data.name;
            }
            
            const sellerRoleEl = document.getElementById('seller-role');
            if (sellerRoleEl) {
                const roleName = data.role_name || data.role || 'Sotuvchi';
                sellerRoleEl.textContent = roleName;
                console.log('Seller role updated:', roleName);
            }
            
            // Show panel
            showPanel();
            
            // Update navigation based on permissions
            updateNavigation();
            
            // Check if user is admin and show admin nav item
            const isAdmin = data.role_name?.toLowerCase().includes('admin') || 
                          (data.permissions && (
                              data.permissions.includes('admin.settings') ||
                              data.permissions.includes('admin.sellers') ||
                              data.permissions.includes('admin.roles')
                          ));
            
            const adminNavItem = document.getElementById('admin-nav-item');
            if (adminNavItem) {
                if (isAdmin) {
                    adminNavItem.style.display = 'flex';
                } else {
                    adminNavItem.style.display = 'none';
                }
            }
        } else {
            // If auth fails, clear token and show login
            console.error('Auth failed:', response.status);
            localStorage.removeItem('seller_token');
            localStorage.removeItem('seller_id');
            showLogin();
        }
    } catch (error) {
        console.error('Error loading current user:', error);
        // On error, clear auth and show login
        localStorage.removeItem('seller_token');
        localStorage.removeItem('seller_id');
        showLogin();
    }
}

function showLogin() {
    console.log('showLogin called'); // Debug log
    const loginPage = document.getElementById('login-page');
    const sellerPanel = document.getElementById('seller-panel');
    
    if (loginPage) {
        loginPage.classList.add('active');
        loginPage.style.display = 'flex';
        console.log('Login page should be visible now');
    } else {
        console.error('Login page element not found!');
    }
    
    if (sellerPanel) {
        sellerPanel.classList.remove('active');
        sellerPanel.style.display = 'none';
    }
    
    // Clear form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.reset();
    }
    
    // Clear error message
    const errorDiv = document.getElementById('login-error');
    if (errorDiv) {
        errorDiv.style.display = 'none';
        errorDiv.textContent = '';
    }
}

function showPanel() {
    console.log('showPanel called'); // Debug log
    const loginPage = document.getElementById('login-page');
    const sellerPanel = document.getElementById('seller-panel');
    
    // Login sahifasini kuchli tarzda yashirish
    if (loginPage) {
        loginPage.classList.remove('active');
        loginPage.style.display = 'none';
        loginPage.style.visibility = 'hidden';
        loginPage.style.opacity = '0';
        loginPage.style.position = 'absolute';
        loginPage.style.zIndex = '-1';
    }
    
    // Sotuv panelini ko'rsatish
    if (sellerPanel) {
        sellerPanel.classList.add('active');
        sellerPanel.style.display = 'flex';
        sellerPanel.style.visibility = 'visible';
        sellerPanel.style.opacity = '1';
        sellerPanel.style.position = 'relative';
        sellerPanel.style.zIndex = '1';
        console.log('Panel should be visible now'); // Debug log
    }
    
    // Show default page (dashboard) after panel is shown
    setTimeout(() => {
        showPage('dashboard');
    }, 100);
}

async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    const errorDiv = document.getElementById('login-error');
    
    try {
        // Ensure API_BASE is set correctly
        const apiBase = API_BASE || '/api';
        const loginUrl = `${apiBase}/auth/login`;
        
        console.log('Login URL:', loginUrl);
        console.log('Username:', username);
        
        const response = await fetch(loginUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Login error response:', errorText);
            try {
                const errorData = JSON.parse(errorText);
                throw new Error(errorData.message || errorData.detail || `HTTP error! status: ${response.status}`);
            } catch (e) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        }
        
        const data = await response.json();
        console.log('Login response:', data); // Debug log
        
        // Check if login was successful (either data.success === true or token exists)
        if (data.success || data.token) {
            currentToken = data.token;
            currentUser = { 
                id: data.seller_id, 
                name: data.seller_name,
                role_id: data.role_id,
                role_name: data.role_name,
                role: data.role_name || data.role
            };
            userPermissions = data.permissions || [];
            
            // Make currentUser available globally
            if (typeof window !== 'undefined') {
                window.currentUser = currentUser;
            }
            
            localStorage.setItem('seller_token', data.token);
            localStorage.setItem('seller_id', data.seller_id.toString());
            
            console.log('Login successful, showing panel...'); // Debug log
            
            // Update seller name and role immediately from login response
            const sellerNameEl = document.getElementById('seller-name');
            if (sellerNameEl && data.seller_name) {
                sellerNameEl.textContent = data.seller_name;
            }
            
            const sellerRoleEl = document.getElementById('seller-role');
            if (sellerRoleEl && (data.role_name || data.role)) {
                sellerRoleEl.textContent = data.role_name || data.role;
                console.log('Seller role updated from login:', data.role_name || data.role);
            }
            
            // Clear error message
            if (errorDiv) {
                errorDiv.style.display = 'none';
                errorDiv.textContent = '';
            }
            
            // Show panel
            showPanel();
            
            // Load additional user data (permissions, etc.) without calling showPanel again
            setTimeout(() => {
                loadCurrentUserData(data.seller_id);
            }, 100);
        } else {
            const errorMessage = data.message || data.detail || 'Noto\'g\'ri login yoki parol';
            if (errorDiv) {
                errorDiv.textContent = errorMessage;
                errorDiv.style.display = 'block';
            }
            console.log('Login failed:', errorMessage); // Debug log
        }
    } catch (error) {
        console.error('Login error:', error);
        const errorMessage = error.message || 'Xatolik yuz berdi. Serverga ulanib bo\'lmadi.';
        errorDiv.textContent = errorMessage;
        errorDiv.style.display = 'block';
    }
}

function logout() {
    try {
        // Clear localStorage
        localStorage.removeItem('seller_token');
        localStorage.removeItem('seller_id');
        
        // Clear sessionStorage as well
        sessionStorage.removeItem('seller_token');
        sessionStorage.removeItem('seller_id');
        
        // Clear current user data
        currentToken = null;
        currentUser = null;
        userPermissions = [];
        
        // Clear global variables
        if (typeof window !== 'undefined') {
            window.currentUser = null;
            window.saleProducts = null;
            window.saleCustomers = null;
            window.saleItems = null;
            window.selectedCustomer = null;
        }
        
        // Force show login page
        const loginPage = document.getElementById('login-page');
        const sellerPanel = document.getElementById('seller-panel');
        
        if (loginPage) {
            loginPage.classList.add('active');
            loginPage.style.display = 'flex';
            loginPage.style.visibility = 'visible';
            loginPage.style.opacity = '1';
            loginPage.style.position = 'relative';
            loginPage.style.zIndex = '10';
        }
        
        if (sellerPanel) {
            sellerPanel.classList.remove('active');
            sellerPanel.style.display = 'none';
            sellerPanel.style.visibility = 'hidden';
            sellerPanel.style.opacity = '0';
            sellerPanel.style.position = 'absolute';
            sellerPanel.style.zIndex = '-1';
        }
        
        // Clear any forms
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.reset();
        }
        
        console.log('Logout successful');
    } catch (error) {
        console.error('Error during logout:', error);
        // Force page reload as fallback
        window.location.href = window.location.pathname;
    }
}

// Make logout globally accessible
window.logout = logout;

function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const page = item.dataset.page;
            if (page) {
                showPage(page);
            }
        });
    });
}

function showPage(pageId) {
    console.log('showPage called with:', pageId);
    
    // List of all panel page IDs
    const allPanelPageIds = [
        'dashboard-page',
        'products-page',
        'sales-page',
        'new-sale-page',
        'customers-page',
        'orders-page',
        'admin-page',
        'admin-page'
    ];
    
    // Hide all panel pages - ONLY .panel-page, NOT .page (which includes seller-panel)
    // First hide by ID to ensure proper hiding
    allPanelPageIds.forEach(hidePageId => {
        const page = document.getElementById(hidePageId);
        if (page) {
            page.classList.remove('active');
            page.style.display = 'none';
            console.log('Hidden page by ID:', hidePageId);
        }
    });
    
    // Also hide by class selector as backup
    const allPanelPages = document.querySelectorAll('.panel-page');
    console.log('Found panel pages by class:', allPanelPages.length);
    allPanelPages.forEach(page => {
        if (!allPanelPageIds.includes(page.id)) {
            // Only hide if it's not in our list (safety check)
            page.classList.remove('active');
            page.style.display = 'none';
            console.log('Hidden page by class:', page.id);
        }
    });
    
    // Hide login page if it exists
    const loginPage = document.getElementById('login-page');
    if (loginPage) {
        loginPage.classList.remove('active');
        loginPage.style.display = 'none';
    }
    
    // Hide navigation items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Show selected page - try both pageId and pageId + '-page'
    let targetPage = document.getElementById(pageId);
    if (!targetPage) {
        targetPage = document.getElementById(pageId + '-page');
    }
    
    if (targetPage) {
        // Double-check: Ensure all other pages are hidden first
        allPanelPageIds.forEach(checkPageId => {
            if (checkPageId !== targetPage.id) {
                const otherPage = document.getElementById(checkPageId);
                if (otherPage) {
                    otherPage.classList.remove('active');
                    otherPage.style.display = 'none';
                }
            }
        });
        
        // Now show target page - MUST set inline display to override !important
        targetPage.classList.add('active');
        targetPage.style.display = 'block'; // Force show with inline style to override CSS !important
        console.log('Page shown:', pageId, targetPage.id);
        console.log('Page classes:', targetPage.className);
        console.log('Page inline display:', targetPage.style.display);
        console.log('Page computed style display:', window.getComputedStyle(targetPage).display);
        
        // Final verification - ensure only one page is active
        const activePages = document.querySelectorAll('.panel-page.active');
        console.log('Active pages count after show:', activePages.length);
        if (activePages.length > 1) {
            console.warn('WARNING: Multiple pages are still active!', Array.from(activePages).map(p => p.id));
            activePages.forEach(page => {
                if (page.id !== targetPage.id) {
                    page.classList.remove('active');
                    page.style.display = 'none';
                }
            });
        }
    } else {
        console.error('Page not found:', pageId, 'or', pageId + '-page');
    }
    
    // Update navigation - mark active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        if (item.dataset.page === pageId) {
            item.classList.add('active');
        }
    });
    
    // Update navigation
    updateNavigation();
    
    // Load page-specific data
    switch(pageId) {
        case 'dashboard':
        case 'dashboard-page':
            // For seller panel, always load dashboard (no permission check needed)
            setTimeout(() => {
                loadDashboard();
            }, 100);
            break;
        case 'products':
            if (userPermissions.includes('products.view')) {
                loadProducts();
                // Initialize barcode scanner after page loads
                setTimeout(() => {
                    initSellerProductBarcodeScanner();
                }, 300);
            }
            break;
        case 'sales':
        case 'sales-page':
            if (userPermissions.includes('sales.view')) {
                loadCustomersForSellerSaleFilter();
                loadSales();
            }
            break;
        case 'new-sale':
            if (userPermissions.includes('sales.create')) {
                // Wait for sale-functions.js to load and DOM to be ready
                setTimeout(() => {
                    console.log('Initializing new sale page...');
                    console.log('window.initSalePage:', typeof window.initSalePage);
                    
                    // Try to call initSalePage
                    if (typeof window.initSalePage === 'function') {
                        console.log('Calling window.initSalePage...');
                        Promise.resolve(window.initSalePage()).catch(err => {
                            console.error('Error in initSalePage:', err);
                        });
                    } else {
                        console.error('initSalePage not found!');
                        // Try direct initialization as fallback
                        const apiBase = window.API_BASE || '/api';
                        console.log('Loading data directly from:', apiBase);
                        
                        Promise.all([
                            fetch(`${apiBase}/products?limit=1000`),
                            fetch(`${apiBase}/customers?limit=1000`)
                        ]).then(([productsRes, customersRes]) => {
                            return Promise.all([productsRes.json(), customersRes.json()]);
                        }).then(([products, customers]) => {
                            console.log('Directly loaded products:', products.length, 'customers:', customers.length);
                            window.saleProducts = products;
                            window.saleCustomers = customers;
                            
                            // Setup listeners
                            if (typeof window.setupSaleEventListeners === 'function') {
                                window.setupSaleEventListeners();
                            } else {
                                console.error('setupSaleEventListeners not found!');
                            }
                            
                            // Render
                            if (typeof window.renderProductsGrid === 'function') {
                                window.renderProductsGrid();
                            } else {
                                console.error('renderProductsGrid not found!');
                            }
                        }).catch(err => {
                            console.error('Error in direct initialization:', err);
                        });
                    }
                }, 200);
            }
            break;
        case 'customers':
            // Load customers regardless of permission (sellers need to see customers for sales)
            console.log('Customers page selected, loading customers...');
            // Ensure page is visible and DOM is ready
            setTimeout(() => {
                loadCustomers();
            }, 150);
            break;
        case 'orders':
            if (userPermissions.includes('orders.view')) {
                loadOrders();
            }
            break;
        case 'admin':
            // Check if user is admin
            const isAdmin = currentUser?.role_name?.toLowerCase().includes('admin') || 
                          (userPermissions && (
                              userPermissions.includes('admin.settings') ||
                              userPermissions.includes('admin.sellers') ||
                              userPermissions.includes('admin.roles')
                          ));
            if (isAdmin) {
                // Ensure admin page is shown
                const adminPage = document.getElementById('admin-page');
                if (adminPage) {
                    adminPage.style.display = 'block';
                    adminPage.classList.add('active');
                }
                // Load dashboard and show first tab
                setTimeout(() => {
                    loadAdminDashboard();
                    showAdminTab('admin-dashboard');
                }, 100);
            } else {
                alert('Sizda admin panelga kirish uchun ruxsat yo\'q');
                showPage('dashboard');
            }
            break;
    }
}

function updateNavigation() {
    // Update navigation based on permissions
    document.querySelectorAll('.nav-item').forEach(item => {
        const requiredPermission = item.dataset.permission;
        
        // Dashboard doesn't require permission (always visible)
        if (!requiredPermission) {
            item.style.display = 'flex';
            return;
        }
        
        // Hide if user doesn't have the required permission
        if (userPermissions.length === 0 || !userPermissions.includes(requiredPermission)) {
            item.style.display = 'none';
        } else {
            item.style.display = 'flex';
        }
    });
}


// Dashboard
async function loadDashboard() {
    try {
        console.log('Loading dashboard...');
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const todayStr = today.toISOString().split('T')[0];
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        
        const sellerId = localStorage.getItem('seller_id');
        console.log('Dashboard sellerId:', sellerId);
        
        // Fetch all data with proper error handling
        let stats = { total_profit: 0, total_sales: 0, total_amount: 0 };
        let productsCount = 0;
        let todaySales = [];
        let pendingOrders = [];
        
        try {
            // Statistics endpoint with seller_id filter
            const token = currentToken || localStorage.getItem('seller_token');
            const statsUrl = `${API_BASE}/statistics?start_date=${todayStr}&end_date=${tomorrowStr}${sellerId ? `&seller_id=${sellerId}` : ''}`;
            console.log('Fetching statistics from:', statsUrl);
            const headers = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;
            if (sellerId) headers['X-Seller-ID'] = sellerId;
            const statsResponse = await fetch(statsUrl, { headers });
            if (statsResponse.ok) {
                stats = await statsResponse.json();
                console.log('Statistics loaded:', stats);
            } else {
                console.error('Statistics response not OK:', statsResponse.status, statsResponse.statusText);
            }
        } catch (e) {
            console.error('Error fetching statistics:', e);
        }
        
        try {
            const token = currentToken || localStorage.getItem('seller_token');
            const headers = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;
            if (sellerId) headers['X-Seller-ID'] = sellerId;
            const productsResponse = await fetch(`${API_BASE}/products/count`, { headers });
            if (productsResponse.ok) {
                const productsData = await productsResponse.json();
                productsCount = productsData.count || 0;
            }
        } catch (e) {
            console.error('Error fetching products count:', e);
        }
        
        try {
            const token = currentToken || localStorage.getItem('seller_token');
            const salesUrl = `${API_BASE}/sales?start_date=${todayStr}&end_date=${tomorrowStr}${sellerId ? `&seller_id=${sellerId}` : ''}`;
            console.log('Fetching sales from:', salesUrl);
            const headers = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;
            if (sellerId) headers['X-Seller-ID'] = sellerId;
            const salesResponse = await fetch(salesUrl, { headers });
            if (salesResponse.ok) {
                todaySales = await salesResponse.json();
                console.log('Sales fetched:', todaySales.length, 'sales');
            } else {
                console.error('Sales response not OK:', salesResponse.status, salesResponse.statusText);
            }
        } catch (e) {
            console.error('Error fetching sales:', e);
        }
        
        try {
            const token = currentToken || localStorage.getItem('seller_token');
            const headers = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;
            if (sellerId) headers['X-Seller-ID'] = sellerId;
            const ordersResponse = await fetch(`${API_BASE}/orders?status=pending`, { headers });
            if (ordersResponse.ok) {
                pendingOrders = await ordersResponse.json();
            }
        } catch (e) {
            console.error('Error fetching pending orders:', e);
        }
        
        // Filter sales by seller_id if needed (double-check)
        const todaySalesForSeller = sellerId 
            ? todaySales.filter(s => String(s.seller_id) === String(sellerId))
            : todaySales;
        
        // Use actual sales count from API response, but prefer filtered count for seller
        const actualSalesCount = todaySalesForSeller.length;
        const todayRevenue = todaySalesForSeller.reduce((sum, s) => sum + (parseFloat(s.total_amount) || 0), 0);
        
        console.log('Dashboard stats calculated:', {
            sellerId: sellerId,
            statsTotalSales: stats.total_sales,
            todaySalesCount: todaySales.length,
            todaySalesForSellerCount: actualSalesCount,
            todayRevenue: todayRevenue,
            productsCount: productsCount,
            pendingOrdersCount: pendingOrders.length
        });
        
        // Update stats cards - use correct element IDs
        const totalProductsEl = document.getElementById('dashboard-total-products');
        const totalSalesEl = document.getElementById('dashboard-total-sales');
        const todayRevenueEl = document.getElementById('dashboard-today-revenue');
        const pendingOrdersEl = document.getElementById('dashboard-pending-orders');
        
        console.log('Dashboard elements:', {
            totalProductsEl: !!totalProductsEl,
            totalSalesEl: !!totalSalesEl,
            todayRevenueEl: !!todayRevenueEl,
            pendingOrdersEl: !!pendingOrdersEl
        });
        
        if (totalProductsEl) {
            totalProductsEl.textContent = productsCount;
            console.log('Updated total products:', productsCount);
        }
        if (totalSalesEl) {
            // Use actual filtered sales count for this seller
            totalSalesEl.textContent = actualSalesCount;
            console.log('Updated total sales:', actualSalesCount);
        }
        if (todayRevenueEl) {
            const revenueText = formatMoney(todayRevenue);
            todayRevenueEl.textContent = revenueText;
            console.log('Updated today revenue:', revenueText);
        }
        if (pendingOrdersEl) {
            pendingOrdersEl.textContent = pendingOrders.length;
            console.log('Updated pending orders:', pendingOrders.length);
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
        // Set default values on error
        const totalProductsEl = document.getElementById('dashboard-total-products');
        const totalSalesEl = document.getElementById('dashboard-total-sales');
        const todayRevenueEl = document.getElementById('dashboard-today-revenue');
        const pendingOrdersEl = document.getElementById('dashboard-pending-orders');
        
        if (totalProductsEl) totalProductsEl.textContent = 'Xatolik';
        if (totalSalesEl) totalSalesEl.textContent = 'Xatolik';
        if (todayRevenueEl) todayRevenueEl.textContent = 'Xatolik';
        if (pendingOrdersEl) pendingOrdersEl.textContent = 'Xatolik';
        
        console.error('Dashboard loading error details:', error.message);
    }
}

// Products
let sellerProductFilterTimeout;
let sellerProductBarcodeScanner = null;

function handleSellerProductFilterChange() {
    clearTimeout(sellerProductFilterTimeout);
    sellerProductFilterTimeout = setTimeout(() => {
        currentProductPage = 1;
        loadProducts();
    }, 500);
}

// Initialize barcode scanner for seller products page
function initSellerProductBarcodeScanner() {
    const searchInput = document.getElementById('seller-products-search');
    if (!searchInput || !window.BarcodeScanner) {
        console.warn('Barcode scanner not available or input not found');
        return;
    }
    
    // Detach previous scanner if exists
    if (sellerProductBarcodeScanner) {
        sellerProductBarcodeScanner.detach();
    }
    
    // Create new scanner instance
    sellerProductBarcodeScanner = new window.BarcodeScanner({
        minLength: 3,
        maxLength: 50,
        timeout: 100,
        onScan: (barcode) => {
            console.log('Seller: Barcode scanned:', barcode);
            // Set search input value and trigger search
            searchInput.value = barcode;
            handleSellerProductFilterChange();
        }
    });
    
    // Attach to search input
    sellerProductBarcodeScanner.attach(searchInput);
    console.log('Seller product barcode scanner initialized');
}

function clearSellerProductFilters() {
    document.getElementById('seller-products-search').value = '';
    document.getElementById('seller-product-brand-filter').value = '';
    document.getElementById('seller-product-supplier-filter').value = '';
    document.getElementById('seller-product-location-filter').value = '';
    document.getElementById('seller-stock-filter').value = 'all';
    currentProductPage = 1;
    loadProducts();
}

async function loadProducts() {
    try {
        const tbody = document.getElementById('products-tbody');
        if (!tbody) {
            console.error('products-tbody element not found');
            return;
        }
        
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">Yuklanmoqda...</td></tr>';
        
        const skip = (currentProductPage - 1) * productsPerPage;
        const searchQuery = document.getElementById('seller-products-search')?.value?.trim() || '';
        const brand = document.getElementById('seller-product-brand-filter')?.value?.trim() || '';
        const supplier = document.getElementById('seller-product-supplier-filter')?.value?.trim() || '';
        const location = document.getElementById('seller-product-location-filter')?.value?.trim() || '';
        const stockFilter = document.getElementById('seller-stock-filter')?.value || 'all';
        
        // Check if filters are active
        const hasFilters = searchQuery || brand || supplier || location || stockFilter !== 'all';
        
        // Build URL with pagination and all filters
        const params = new URLSearchParams();
        
        // Always apply server-side pagination when no filters are active
        // When filters are active, load more items then apply client-side pagination
        if (!hasFilters) {
            params.append('skip', skip.toString());
            params.append('limit', productsPerPage.toString());
        } else {
            // If filters are active, load all filtered items (up to reasonable limit) then paginate client-side
            params.append('skip', '0');
            params.append('limit', '5000');  // Load more to ensure proper filtering
        }
        
        if (searchQuery) params.append('search', searchQuery);
        if (brand) params.append('brand', brand);
        if (supplier) params.append('supplier', supplier);
        if (location) params.append('location', location);
        
        if (stockFilter === 'low') {
            params.append('low_stock_only', 'true');
            params.append('min_stock', '10');
        } else if (stockFilter === 'out') {
            params.append('low_stock_only', 'true');
            params.append('min_stock', '0');
        }
        
        const url = `${API_BASE}/products?${params.toString()}`;
        const sellerId = localStorage.getItem('seller_id');
        const token = currentToken || localStorage.getItem('seller_token');
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (sellerId) headers['X-Seller-ID'] = sellerId;
        
        const response = await fetch(url, { headers });
        
        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            console.error('Products API error:', response.status, errorText);
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        let products = await response.json();
        
        if (!products) {
            throw new Error('Serverdan javob olinmadi');
        }
        
        if (!Array.isArray(products)) {
            throw new Error('Serverdan noto\'g\'ri javob olindi');
        }
        
        // If filters are active, apply client-side pagination
        // When no filters, server-side pagination is already applied
        let paginatedProducts = products;
        if (hasFilters) {
            // Apply client-side pagination when filters are active
            paginatedProducts = products.slice(skip, skip + productsPerPage);
        }
        
        // Get total count for pagination with same filters
        try {
            const countParams = new URLSearchParams();
            if (searchQuery) countParams.append('search', searchQuery);
            if (brand) countParams.append('brand', brand);
            if (supplier) countParams.append('supplier', supplier);
            if (location) countParams.append('location', location);
            if (stockFilter === 'low') {
                countParams.append('low_stock_only', 'true');
                countParams.append('min_stock', '10');
            } else if (stockFilter === 'out') {
                countParams.append('low_stock_only', 'true');
                countParams.append('min_stock', '0');
            }
            
            const token = currentToken || localStorage.getItem('seller_token');
            const headers = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;
            if (sellerId) headers['X-Seller-ID'] = sellerId;
            const countResponse = await fetch(`${API_BASE}/products/count?${countParams.toString()}`, { headers });
            if (countResponse.ok) {
                const countData = await countResponse.json();
                totalProductsCount = countData.count || 0;
                console.log('Products count received:', totalProductsCount, 'with filters:', hasFilters);
            } else {
                console.warn('Failed to get products count, using fallback');
                // If filters active, use filtered array length
                // Otherwise estimate based on current page if count fails
                if (hasFilters) {
                    totalProductsCount = products.length;
                } else {
                    // Estimate: if we got a full page, assume there are more
                    totalProductsCount = products.length >= productsPerPage 
                        ? (currentProductPage * productsPerPage) + 1  // Assume there's at least one more
                        : (currentProductPage - 1) * productsPerPage + products.length;
                }
            }
        } catch (e) {
            console.error('Error getting products count:', e);
            // If filters active, use filtered array length
            if (hasFilters) {
                totalProductsCount = products.length;
            } else {
                // Estimate: if we got a full page, assume there are more
                totalProductsCount = products.length >= productsPerPage 
                    ? (currentProductPage * productsPerPage) + 1  // Assume there's at least one more
                    : (currentProductPage - 1) * productsPerPage + products.length;
            }
        }
        
        // Debug log
        console.log('Products loaded:', {
            totalReceived: products.length,
            paginated: paginatedProducts.length,
            hasFilters,
            currentPage: currentProductPage,
            skip,
            limit: productsPerPage,
            totalCount: totalProductsCount
        });
        
        if (!paginatedProducts || paginatedProducts.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center">Mahsulotlar topilmadi</td></tr>';
            renderProductPagination();
            return;
        }
        
        tbody.innerHTML = '';
        
        // Store products for search (only first page or all if searching)
        if (!hasFilters || currentProductPage === 1) {
            allProducts = products;
        }
        
        paginatedProducts.forEach(product => {
            const row = document.createElement('tr');
            const stockClass = (product.total_pieces || 0) === 0 ? 'badge-danger' : 
                              (product.total_pieces || 0) < 10 ? 'badge-warning' : 'badge-success';
            
            // Get product image
            let imageCell = '<td>-</td>';
            if (product.image_url) {
                let imageUrl = product.image_url;
                if (!imageUrl.startsWith('http')) {
                    imageUrl = imageUrl.startsWith('/') 
                        ? window.location.origin + imageUrl 
                        : window.location.origin + '/' + imageUrl;
                }
                imageCell = `<td><img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(product.name)}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; cursor: pointer;" onclick="showProductImage('${escapeHtml(imageUrl)}', '${escapeHtml(product.name)}')" title="Rasmni kattalashtirish"></td>`;
            }
            
            row.innerHTML = `
                ${imageCell}
                <td>${product.id}</td>
                <td>${escapeHtml(product.name || 'Noma\'lum')}</td>
                <td>${product.packages_in_stock || 0}</td>
                <td>${product.pieces_in_stock || 0}</td>
                <td>${formatMoney(product.wholesale_price || 0)}</td>
                <td>${formatMoney(product.retail_price || 0)}</td>
                <td>${formatMoney(product.regular_price || 0)}</td>
            `;
            tbody.appendChild(row);
        });
        
        // Render pagination
        renderProductPagination();
    } catch (error) {
        console.error('Error loading products:', error);
        const tbody = document.getElementById('products-tbody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="color: red;">Xatolik: ${error.message || 'Noma\'lum xatolik'}<br><small>Ma\'lumotlarni yuklashda xatolik yuz berdi</small></td></tr>`;
        }
    }
}

function renderProductPagination() {
    const paginationTop = document.getElementById('products-pagination');
    const paginationBottom = document.getElementById('products-pagination-bottom');
    
    if (!paginationTop || !paginationBottom) {
        console.error('Pagination containers not found');
        return;
    }
    
    // Calculate total pages
    const totalPages = Math.ceil(totalProductsCount / productsPerPage);
    
    console.log('Rendering pagination:', {
        currentPage: currentProductPage,
        totalPages,
        totalCount: totalProductsCount,
        perPage: productsPerPage
    });
    
    // Show pagination info even if only 1 page (to show total count)
    if (totalProductsCount === 0) {
        paginationTop.innerHTML = '<div style="text-align: center; padding: 1rem; color: #666;">Mahsulotlar topilmadi</div>';
        paginationBottom.innerHTML = '';
        return;
    }
    
    // If only 1 page, still show pagination info but disable navigation
    if (totalPages <= 1) {
        paginationTop.innerHTML = `<div style="text-align: center; padding: 1rem; font-weight: 600;">Jami: ${totalProductsCount} ta mahsulot</div>`;
        paginationBottom.innerHTML = paginationTop.innerHTML;
        return;
    }
    
    let paginationHtml = '<div style="display: flex; gap: 0.5rem; align-items: center; justify-content: center; padding: 1rem;">';
    
    // Previous button
    if (currentProductPage > 1) {
        paginationHtml += `<button class="btn btn-secondary" onclick="changeProductPage(${currentProductPage - 1})" style="padding: 0.5rem 1rem;">← Oldingi</button>`;
    } else {
        paginationHtml += `<button class="btn btn-secondary" disabled style="padding: 0.5rem 1rem; opacity: 0.5; cursor: not-allowed;">← Oldingi</button>`;
    }
    
    // Page numbers
    paginationHtml += `<span style="padding: 0 1rem; font-weight: 600;">Sahifa ${currentProductPage} / ${totalPages} (Jami: ${totalProductsCount} ta)</span>`;
    
    // Next button
    if (currentProductPage < totalPages) {
        paginationHtml += `<button class="btn btn-secondary" onclick="changeProductPage(${currentProductPage + 1})" style="padding: 0.5rem 1rem;">Keyingi →</button>`;
    } else {
        paginationHtml += `<button class="btn btn-secondary" disabled style="padding: 0.5rem 1rem; opacity: 0.5; cursor: not-allowed;">Keyingi →</button>`;
    }
    
    paginationHtml += '</div>';
    
    paginationTop.innerHTML = paginationHtml;
    paginationBottom.innerHTML = paginationHtml;
}

function changeProductPage(page) {
    currentProductPage = page;
    loadProducts();
}

function viewProduct(id) {
    // Show product details modal
    alert('Mahsulot ID: ' + id);
}

// Products pagination
let currentProductPage = 1;
let productsPerPage = 20;
let totalProductsCount = 0;

// Search products - now handled by handleSellerProductFilterChange
async function searchProducts() {
    // This function is kept for backward compatibility
    handleSellerProductFilterChange();
}

// Sales
let allCustomersForSellerSaleFilter = [];
let selectedCustomerIdForSellerSaleFilter = null;

async function loadSales() {
    try {
        const userId = localStorage.getItem('seller_id');
        const tbody = document.getElementById('sales-tbody');
        
        if (!tbody) {
            console.error('sales-tbody element not found');
            return;
        }
        
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">Yuklanmoqda...</td></tr>';
        
        // Build filter params
        const params = new URLSearchParams();
        params.append('seller_id', userId);
        params.append('limit', '50');
        
        const startDate = document.getElementById('seller-sale-start-date')?.value;
        const endDate = document.getElementById('seller-sale-end-date')?.value;
        const customerId = selectedCustomerIdForSellerSaleFilter;
        const statusFilter = document.getElementById('seller-sale-status-filter')?.value;
        
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        if (customerId) params.append('customer_id', customerId);
        if (statusFilter) params.append('status', statusFilter);
        
        console.log('Loading sales with filters:', {
            seller_id: userId,
            start_date: startDate,
            end_date: endDate,
            customer_id: customerId,
            status: statusFilter
        });
        
        const token = currentToken || localStorage.getItem('seller_token');
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (userId) headers['X-Seller-ID'] = userId;
        const response = await fetch(`${API_BASE}/sales?${params.toString()}`, { headers });
        
        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            console.error('Sales API error:', response.status, errorText);
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const sales = await response.json();
        
        if (!sales) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="color: red;">Serverdan javob olinmadi</td></tr>';
            return;
        }
        
        if (!Array.isArray(sales)) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="color: red;">Serverdan noto\'g\'ri javob olindi</td></tr>';
            return;
        }
        
        if (sales.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">Sotuvlar topilmadi</td></tr>';
            return;
        }
        
        tbody.innerHTML = '';
        
        sales.forEach(sale => {
            const row = document.createElement('tr');
            
            // Get payment method name
            const paymentMethodMap = {
                'cash': 'Naqd',
                'card': 'Karta',
                'bank_transfer': 'Hisob raqam'
            };
            const paymentMethod = paymentMethodMap[sale.payment_method] || sale.payment_method || 'Naqd';
            
            // Format date
            const saleDate = formatDate(sale.created_at);
            
            // Check sale status
            let statusBadge = '';
            let canViewReceipt = false;
            
            if (sale.requires_admin_approval) {
                if (sale.admin_approved === null) {
                    statusBadge = '<span class="badge badge-warning">Kutilmoqda</span>';
                    canViewReceipt = false;
                } else if (sale.admin_approved === true) {
                    statusBadge = '<span class="badge badge-success">Tasdiqlandi</span>';
                    canViewReceipt = true;
                } else {
                    statusBadge = '<span class="badge badge-danger">Rad etildi</span>';
                    canViewReceipt = false;
                }
            } else {
                statusBadge = '<span class="badge badge-info">Tasdiqlangan</span>';
                canViewReceipt = true;
            }
            
            row.innerHTML = `
                <td>${sale.id}</td>
                <td>${escapeHtml(sale.customer_name || 'Noma\'lum')}</td>
                <td>${formatMoney(sale.total_amount || 0)}</td>
                <td>${paymentMethod}</td>
                <td>${saleDate}</td>
                <td>${statusBadge}</td>
                <td>
                    ${canViewReceipt ? 
                        `<button class="btn btn-sm btn-primary" onclick="viewSaleReceipt(${sale.id})" title="Chek ko'rish" style="margin-left: 0.5rem;">
                            <i class="fas fa-receipt"></i> Chek
                        </button>` : 
                        `<button class="btn btn-sm btn-secondary" disabled title="Chek faqat tasdiqlangan sotuvlar uchun" style="margin-left: 0.5rem;">
                            <i class="fas fa-receipt"></i> Chek
                        </button>`
                    }
                    ${userPermissions.includes('sales.update') && sale.admin_approved !== false ? 
                        `<button class="btn btn-sm btn-success" onclick="editSale(${sale.id})" title="Tahrirlash" style="margin-left: 0.5rem;">
                            <i class="fas fa-edit"></i> Tahrirlash
                        </button>` : ''}
                </td>
            `;
            tbody.appendChild(row);
        });
        
        console.log('Loaded', sales.length, 'sales');
    } catch (error) {
        console.error('Error loading sales:', error);
        const tbody = document.getElementById('sales-tbody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="color: red;">Xatolik: ${error.message || 'Noma\'lum xatolik'}</td></tr>`;
        }
    }
}

// Load customers for seller sale filter search
async function loadCustomersForSellerSaleFilter() {
    try {
        const customers = await fetch(`${API_BASE}/customers?limit=1000`).then(r => r.json());
        allCustomersForSellerSaleFilter = customers;
    } catch (error) {
        console.error('Error loading customers for seller sale filter:', error);
    }
}

// Handle customer search for seller sale filter
function handleSellerSaleCustomerSearch() {
    const searchInput = document.getElementById('seller-sale-customer-search');
    const query = searchInput?.value?.toLowerCase() || '';
    
    if (!query) {
        selectedCustomerIdForSellerSaleFilter = null;
        loadSales();
        return;
    }
    
    // Find matching customer
    const match = allCustomersForSellerSaleFilter.find(c => 
        (c.name && c.name.toLowerCase().includes(query)) ||
        (c.phone && c.phone.includes(query))
    );
    
    if (match) {
        selectedCustomerIdForSellerSaleFilter = match.id;
        loadSales();
    } else {
        // If no match, clear selection
        if (selectedCustomerIdForSellerSaleFilter) {
            selectedCustomerIdForSellerSaleFilter = null;
            loadSales();
        }
    }
}

// Clear seller sale filters
function clearSellerSaleFilters() {
    document.getElementById('seller-sale-start-date').value = '';
    document.getElementById('seller-sale-end-date').value = '';
    document.getElementById('seller-sale-customer-search').value = '';
    document.getElementById('seller-sale-status-filter').value = '';
    selectedCustomerIdForSellerSaleFilter = null;
    loadSales();
}

async function viewCustomerHistory(customerId, customerName) {
    try {
        console.log('Loading customer history for:', customerId);
        const response = await fetch(`${API_BASE}/customers/${customerId}/sales-history?limit=100`);
        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            console.error('Customer history API error:', response.status, errorText);
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const sales = await response.json();
        console.log('Customer sales history loaded:', sales.length, 'sales');
        
        let historyHtml = `
            <h2 style="margin-bottom: 1rem;"><i class="fas fa-history"></i> ${escapeHtml(customerName)} - Sotuv Tarixi</h2>
            <div style="margin-bottom: 1rem; padding: 1rem; background: #f1f5f9; border-radius: 8px;">
                <strong>Jami sotuvlar:</strong> ${sales.length} ta<br>
                <strong>Jami summa:</strong> ${formatMoney(sales.reduce((sum, s) => sum + (s.total_amount || 0), 0))}
            </div>
            <div style="max-height: 600px; overflow-y: auto;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: var(--primary-color); color: white;">
                            <th style="padding: 0.75rem; text-align: left; border: 1px solid #ddd;">ID</th>
                            <th style="padding: 0.75rem; text-align: left; border: 1px solid #ddd;">Sana</th>
                            <th style="padding: 0.75rem; text-align: left; border: 1px solid #ddd;">Mahsulotlar</th>
                            <th style="padding: 0.75rem; text-align: right; border: 1px solid #ddd;">Summa</th>
                            <th style="padding: 0.75rem; text-align: left; border: 1px solid #ddd;">To'lov</th>
                            <th style="padding: 0.75rem; text-align: center; border: 1px solid #ddd;">Holat</th>
                            <th style="padding: 0.75rem; text-align: center; border: 1px solid #ddd;">Amallar</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        if (sales.length === 0) {
            historyHtml += '<tr><td colspan="7" style="padding: 2rem; text-align: center;">Sotuvlar topilmadi</td></tr>';
        } else {
            sales.forEach(sale => {
                const productsList = sale.items && Array.isArray(sale.items) 
                    ? sale.items.map(item => item.product_name || 'Noma\'lum').join(', ')
                    : 'Mahsulotlar topilmadi';
                const paymentMethodMap = {
                    'cash': 'Naqd',
                    'card': 'Karta',
                    'bank_transfer': 'Hisob raqam'
                };
                const paymentMethod = paymentMethodMap[sale.payment_method] || sale.payment_method || 'Naqd';
                const saleDate = formatDate(sale.created_at);
                
                // Status badge
                let statusBadge = '';
                let canViewReceipt = false;
                if (sale.requires_admin_approval) {
                    if (sale.admin_approved === null) {
                        statusBadge = '<span class="badge badge-warning">Kutilmoqda</span>';
                        canViewReceipt = false;
                    } else if (sale.admin_approved === true) {
                        statusBadge = '<span class="badge badge-success">Tasdiqlandi</span>';
                        canViewReceipt = true;
                    } else {
                        statusBadge = '<span class="badge badge-danger">Rad etildi</span>';
                        canViewReceipt = false;
                    }
                } else {
                    statusBadge = '<span class="badge badge-info">Tasdiqlangan</span>';
                    canViewReceipt = true;
                }
                
                historyHtml += `
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 0.75rem; border: 1px solid #ddd;">${sale.id}</td>
                        <td style="padding: 0.75rem; border: 1px solid #ddd;">${saleDate}</td>
                        <td style="padding: 0.75rem; border: 1px solid #ddd;">${escapeHtml(productsList)}</td>
                        <td style="padding: 0.75rem; text-align: right; border: 1px solid #ddd; font-weight: 600;">${formatMoney(sale.total_amount || 0)}</td>
                        <td style="padding: 0.75rem; border: 1px solid #ddd;">${paymentMethod}</td>
                        <td style="padding: 0.75rem; text-align: center; border: 1px solid #ddd;">${statusBadge}</td>
                        <td style="padding: 0.75rem; text-align: center; border: 1px solid #ddd;">
                            ${canViewReceipt ? 
                                `<button class="btn btn-sm btn-primary" onclick="window.open('${API_BASE}/sales/${sale.id}/receipt', '_blank')" style="padding: 0.25rem 0.5rem; font-size: 0.875rem;">
                                    <i class="fas fa-receipt"></i> Chek
                                </button>` : 
                                `<button class="btn btn-sm btn-secondary" disabled title="Chek faqat tasdiqlangan sotuvlar uchun" style="padding: 0.25rem 0.5rem; font-size: 0.875rem;">
                                    <i class="fas fa-receipt"></i> Chek
                                </button>`
                            }
                        </td>
                    </tr>
                `;
            });
        }
        
        historyHtml += '</tbody></table></div>';
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
        modal.style.zIndex = '1000';
        modal.innerHTML = `
            <div style="background: white; margin: 2rem auto; padding: 2rem; max-width: 1000px; max-height: 90vh; overflow-y: auto; border-radius: 8px; position: relative;">
                <span onclick="this.closest('.modal').remove()" style="position: absolute; top: 1rem; right: 1rem; font-size: 28px; font-weight: bold; cursor: pointer; color: #aaa;">&times;</span>
                ${historyHtml}
            </div>
        `;
        document.body.appendChild(modal);
        
        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    } catch (error) {
        console.error('Error loading customer history:', error);
        alert('Xatolik: ' + error.message);
    }
}

// View customer debt history
async function viewCustomerDebtHistory(customerId, customerName) {
    try {
        console.log('Loading customer debt history for:', customerId);
        const response = await fetch(`${API_BASE}/customers/${customerId}/debt-history?limit=100`);
        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            console.error('Customer debt history API error:', response.status, errorText);
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const history = await response.json();
        console.log('Customer debt history loaded:', history.length, 'entries');
        
        // Get current customer debt balance
        const customerResponse = await fetch(`${API_BASE}/customers/${customerId}`);
        let currentDebtBalance = 0;
        if (customerResponse.ok) {
            const customer = await customerResponse.json();
            currentDebtBalance = customer.debt_balance || 0;
        }
        
        let historyHtml = `
            <h2 style="margin-bottom: 1rem;"><i class="fas fa-file-invoice-dollar"></i> ${escapeHtml(customerName)} - Qarz Tarixi</h2>
            <div style="margin-bottom: 1rem; padding: 1rem; background: #f1f5f9; border-radius: 8px;">
                <strong>Joriy qarz balansi:</strong> <span style="color: ${currentDebtBalance > 0 ? '#dc2626' : '#10b981'}; font-weight: bold; font-size: 1.1rem;">${formatMoney(currentDebtBalance)}</span><br>
                <strong>Jami operatsiyalar:</strong> ${history.length} ta
            </div>
            <div style="max-height: 600px; overflow-y: auto;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: var(--primary-color); color: white;">
                            <th style="padding: 0.75rem; text-align: left; border: 1px solid #ddd;">Sana</th>
                            <th style="padding: 0.75rem; text-align: left; border: 1px solid #ddd;">Operatsiya turi</th>
                            <th style="padding: 0.75rem; text-align: right; border: 1px solid #ddd;">Summa</th>
                            <th style="padding: 0.75rem; text-align: right; border: 1px solid #ddd;">Qarz oldin</th>
                            <th style="padding: 0.75rem; text-align: right; border: 1px solid #ddd;">Qarz keyin</th>
                            <th style="padding: 0.75rem; text-align: left; border: 1px solid #ddd;">Izoh</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        if (history.length === 0) {
            historyHtml += '<tr><td colspan="6" style="padding: 2rem; text-align: center;">Qarz tarixi topilmadi</td></tr>';
        } else {
            history.forEach(entry => {
                const date = formatDate(entry.created_at);
                
                // Transaction type labels
                const typeMap = {
                    'payment': 'To\'lov',
                    'debt_added': 'Qarz qo\'shildi',
                    'debt_paid': 'Qarz to\'landi',
                    'order_payment': 'Buyurtma to\'lovi',
                    'sale_payment': 'Sotuv to\'lovi'
                };
                const typeLabel = typeMap[entry.transaction_type] || entry.transaction_type || 'Noma\'lum';
                
                // Color for amount based on type
                const amountColor = entry.amount > 0 ? '#10b981' : '#dc2626';
                const amountPrefix = entry.amount > 0 ? '+' : '';
                
                historyHtml += `
                    <tr>
                        <td style="padding: 0.75rem; border: 1px solid #ddd;">${date}</td>
                        <td style="padding: 0.75rem; border: 1px solid #ddd;">${typeLabel}</td>
                        <td style="padding: 0.75rem; text-align: right; border: 1px solid #ddd; color: ${amountColor}; font-weight: 600;">${amountPrefix}${formatMoney(entry.amount)}</td>
                        <td style="padding: 0.75rem; text-align: right; border: 1px solid #ddd;">${formatMoney(entry.balance_before)}</td>
                        <td style="padding: 0.75rem; text-align: right; border: 1px solid #ddd; font-weight: 600;">${formatMoney(entry.balance_after)}</td>
                        <td style="padding: 0.75rem; border: 1px solid #ddd;">${escapeHtml(entry.notes || entry.reference_type || '-')}</td>
                    </tr>
                `;
            });
        }
        
        historyHtml += `
                    </tbody>
                </table>
            </div>
        `;
        
        // Create modal similar to viewCustomerHistory
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
        modal.style.zIndex = '1000';
        modal.innerHTML = `
            <div style="background: white; margin: 2rem auto; padding: 2rem; max-width: 1000px; max-height: 90vh; overflow-y: auto; border-radius: 8px; position: relative;">
                <span onclick="this.closest('.modal').remove()" style="position: absolute; top: 1rem; right: 1rem; font-size: 28px; font-weight: bold; cursor: pointer; color: #aaa;">&times;</span>
                ${historyHtml}
            </div>
        `;
        document.body.appendChild(modal);
        
        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    } catch (error) {
        console.error('Error loading customer debt history:', error);
        alert('Xatolik: ' + error.message);
    }
}

async function viewSaleReceipt(saleId) {
    try {
        // First check if sale is approved
        const response = await fetch(`${API_BASE}/sales/${saleId}`);
        if (!response.ok) {
            throw new Error('Sotuv topilmadi');
        }
        const sale = await response.json();
        
        // Check if sale is approved
        if (sale.requires_admin_approval && sale.admin_approved !== true) {
            if (sale.admin_approved === null) {
                alert('Sotuv hali admin tomonidan tasdiqlanmagan. Chek faqat tasdiqlangan sotuvlar uchun ko\'rsatiladi.');
            } else if (sale.admin_approved === false) {
                alert('Sotuv rad etilgan. Chek ko\'rsatilmaydi.');
            }
            return;
        }
        
        // Open receipt
        window.open(`${API_BASE}/sales/${saleId}/receipt`, '_blank');
    } catch (error) {
        console.error('Error checking sale status:', error);
        alert('Xatolik: ' + error.message);
    }
}

// Customers
async function loadCustomers() {
    try {
        console.log('=== loadCustomers called ===');
        // Wait a bit to ensure DOM is ready
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const tbody = document.getElementById('customers-tbody');
        console.log('tbody element:', tbody);
        if (!tbody) {
            console.error('customers-tbody element not found');
            // Try again after a short delay
            setTimeout(() => {
                const retryTbody = document.getElementById('customers-tbody');
                if (retryTbody) {
                    console.log('Found tbody on retry, calling loadCustomers again');
                    loadCustomers();
                } else {
                    console.error('customers-tbody still not found after retry');
                }
            }, 500);
            return;
        }
        
        // Check if customers-page is visible
        const customersPage = document.getElementById('customers-page');
        console.log('customers-page element:', customersPage);
        if (customersPage) {
            console.log('customers-page classes:', customersPage.className);
            console.log('customers-page computed display:', window.getComputedStyle(customersPage).display);
        }
        
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Yuklanmoqda...</td></tr>';
        
        console.log('Loading customers from:', `${API_BASE}/customers?limit=100`);
        const sellerId = localStorage.getItem('seller_id');
        const token = currentToken || localStorage.getItem('seller_token');
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (sellerId) headers['X-Seller-ID'] = sellerId;
        const response = await fetch(`${API_BASE}/customers?limit=100`, { headers });
        
        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            console.error('Customers API error:', response.status, errorText);
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const customers = await response.json();
        console.log('Customers API response:', customers);
        
        if (!customers) {
            console.error('Customers response is null or undefined');
            tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="color: red;">Serverdan javob olinmadi</td></tr>';
            return;
        }
        
        if (!Array.isArray(customers)) {
            console.error('Customers response is not an array:', customers);
            tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="color: red;">Serverdan noto\'g\'ri javob olindi</td></tr>';
            return;
        }
        
        if (customers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">Mijozlar topilmadi</td></tr>';
            return;
        }
        
        // Store customers for search
        allCustomers = customers;
        
        console.log('Rendering', customers.length, 'customers to table...');
        console.log('tbody element:', tbody);
        console.log('tbody.innerHTML before clear:', tbody.innerHTML.substring(0, 100));
        
        tbody.innerHTML = '';
        
        console.log('tbody.innerHTML after clear:', tbody.innerHTML);
        
        let renderedCount = 0;
        customers.forEach((customer, index) => {
            try {
                const row = document.createElement('tr');
                const debtBalance = customer.debt_balance !== undefined ? customer.debt_balance : (customer.total_debt || 0);
                
                // Get customer type - handle both enum value and string
                let customerType = customer.customer_type;
                if (customerType && typeof customerType === 'object' && customerType.value) {
                    customerType = customerType.value;
                }
                if (typeof customerType !== 'string') {
                    customerType = String(customerType || 'regular');
                }
                
                // Get customer type label
                let customerTypeLabel = 'Oddiy';
                let customerTypeClass = 'badge-warning';
                if (customerType === 'wholesale') {
                    customerTypeLabel = 'Ulgurji';
                    customerTypeClass = 'badge-success';
                } else if (customerType === 'retail') {
                    customerTypeLabel = 'Dona';
                    customerTypeClass = 'badge-info';
                }
                
                row.innerHTML = `
                    <td>${customer.id || index + 1}</td>
                    <td>${escapeHtml(customer.name || 'Noma\'lum')}</td>
                    <td>${escapeHtml(customer.phone || '-')}</td>
                    <td><span class="badge ${customerTypeClass}">${customerTypeLabel}</span></td>
                    <td>${formatMoney(debtBalance)}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="viewCustomerHistory(${customer.id || 0}, '${escapeHtml(customer.name || 'Noma\'lum')}')" title="Sotuv tarixi">
                            <i class="fas fa-history"></i> Tarix
                        </button>
                        <button class="btn btn-sm btn-info" onclick="viewCustomerDebtHistory(${customer.id || 0}, '${escapeHtml(customer.name || 'Noma\'lum')}')" title="Qarz tarixi" style="margin-left: 0.25rem;">
                            <i class="fas fa-file-invoice-dollar"></i> Qarz
                        </button>
                    </td>
                `;
                tbody.appendChild(row);
                renderedCount++;
                console.log(`Rendered customer ${index + 1}:`, customer.name, 'Row:', row);
            } catch (err) {
                console.error(`Error rendering customer ${index}:`, err, customer);
            }
        });
        
        console.log('Successfully rendered', renderedCount, 'out of', customers.length, 'customers');
        console.log('tbody.innerHTML after rendering:', tbody.innerHTML.substring(0, 200));
        console.log('tbody child count:', tbody.children.length);
        
        // Force a reflow to ensure the table updates
        if (tbody.children.length > 0) {
            tbody.offsetHeight; // Trigger reflow
            console.log('Table should be visible now with', tbody.children.length, 'rows');
            
            // Double check visibility
            const table = tbody.closest('table');
            if (table) {
                console.log('Table element:', table);
                console.log('Table computed display:', window.getComputedStyle(table).display);
            }
            
            // Force visibility
            tbody.style.display = '';
            if (tbody.parentElement) {
                tbody.parentElement.style.display = '';
            }
        } else {
            console.error('WARNING: No rows were appended to tbody! Using fallback innerHTML method...');
            // Fallback: try setting innerHTML directly
            const rowsHtml = customers.map((customer, index) => {
                const debtBalance = customer.debt_balance !== undefined ? customer.debt_balance : (customer.total_debt || 0);
                let customerType = customer.customer_type;
                if (customerType && typeof customerType === 'object' && customerType.value) {
                    customerType = customerType.value;
                }
                if (typeof customerType !== 'string') {
                    customerType = String(customerType || 'regular');
                }
                let customerTypeLabel = 'Oddiy';
                let customerTypeClass = 'badge-warning';
                if (customerType === 'wholesale') {
                    customerTypeLabel = 'Ulgurji';
                    customerTypeClass = 'badge-success';
                } else if (customerType === 'retail') {
                    customerTypeLabel = 'Dona';
                    customerTypeClass = 'badge-info';
                }
                return `
                    <tr>
                        <td>${customer.id || index + 1}</td>
                        <td>${escapeHtml(customer.name || 'Noma\'lum')}</td>
                        <td>${escapeHtml(customer.phone || '-')}</td>
                        <td><span class="badge ${customerTypeClass}">${customerTypeLabel}</span></td>
                        <td>${formatMoney(debtBalance)}</td>
                        <td>
                            <button class="btn btn-sm btn-primary" onclick="viewCustomerHistory(${customer.id || 0}, '${escapeHtml(customer.name || 'Noma\'lum')}')" title="Sotuv tarixi">
                                <i class="fas fa-history"></i> Tarix
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
            tbody.innerHTML = rowsHtml;
            console.log('Used fallback: innerHTML method, rows:', tbody.children.length);
            
            // Force visibility after innerHTML
            tbody.style.display = '';
            if (tbody.parentElement) {
                tbody.parentElement.style.display = '';
            }
        }
        
        // Final verification
        setTimeout(() => {
            const finalCount = tbody.children.length;
            console.log('=== Final check ===');
            console.log('tbody children count:', finalCount);
            console.log('tbody visible:', window.getComputedStyle(tbody).display !== 'none');
            console.log('customers-page visible:', customersPage ? window.getComputedStyle(customersPage).display !== 'none' : 'N/A');
            
            if (finalCount === 0 && customers.length > 0) {
                console.error('CRITICAL: Customers were loaded but not rendered!');
                // Last resort: force render using innerHTML
                const emergencyHtml = customers.map((customer, index) => {
                    const debtBalance = customer.debt_balance !== undefined ? customer.debt_balance : (customer.total_debt || 0);
                    let customerType = customer.customer_type;
                    if (customerType && typeof customerType === 'object' && customerType.value) {
                        customerType = customerType.value;
                    }
                    if (typeof customerType !== 'string') {
                        customerType = String(customerType || 'regular');
                    }
                    let customerTypeLabel = 'Oddiy';
                    let customerTypeClass = 'badge-warning';
                    if (customerType === 'wholesale') {
                        customerTypeLabel = 'Ulgurji';
                        customerTypeClass = 'badge-success';
                    } else if (customerType === 'retail') {
                        customerTypeLabel = 'Dona';
                        customerTypeClass = 'badge-info';
                    }
                    return `<tr><td>${customer.id || index + 1}</td><td>${escapeHtml(customer.name || 'Noma\'lum')}</td><td>${escapeHtml(customer.phone || '-')}</td><td><span class="badge ${customerTypeClass}">${customerTypeLabel}</span></td><td>${formatMoney(debtBalance)}</td><td><button class="btn btn-sm btn-primary" onclick="viewCustomerHistory(${customer.id || 0}, '${escapeHtml(customer.name || 'Noma\'lum')}')" title="Sotuv tarixi"><i class="fas fa-history"></i> Tarix</button> <button class="btn btn-sm btn-info" onclick="viewCustomerDebtHistory(${customer.id || 0}, '${escapeHtml(customer.name || 'Noma\'lum')}')" title="Qarz tarixi" style="margin-left: 0.25rem;"><i class="fas fa-file-invoice-dollar"></i> Qarz</button></td></tr>`;
                }).join('');
                tbody.innerHTML = emergencyHtml;
                console.log('Emergency render completed, rows:', tbody.children.length);
            }
        }, 200);
    } catch (error) {
        console.error('Error loading customers:', error);
        const tbody = document.getElementById('customers-tbody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="color: red;">Xatolik: ${error.message || 'Noma\'lum xatolik'}<br><small>Console'da batafsil ma\'lumotni ko\'ring (F12)</small></td></tr>`;
        }
    }
}

// Customer management
function showAddCustomerModal() {
    document.getElementById('customer-modal-title').textContent = 'Yangi Mijoz';
    document.getElementById('customer-form').reset();
    document.getElementById('customer-modal').style.display = 'block';
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

async function saveCustomer(event) {
    event.preventDefault();
    
    const name = document.getElementById('customer-name').value;
    const phone = document.getElementById('customer-phone').value;
    const address = document.getElementById('customer-address').value;
    const customerType = document.getElementById('customer-type').value;
    const debtLimit = document.getElementById('customer-debt-limit').value;
    const notes = document.getElementById('customer-notes').value;
    
    const customerData = {
        name: name,
        phone: phone || null,
        address: address || null,
        customer_type: customerType,
        notes: notes || null
    };
    
    if (debtLimit && debtLimit.trim() !== '') {
        customerData.debt_limit = parseFloat(debtLimit);
    }
    
    try {
        const response = await fetch(`${API_BASE}/customers`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(customerData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Xatolik yuz berdi');
        }
        
        alert('Mijoz muvaffaqiyatli yaratildi');
        closeModal('customer-modal');
        loadCustomers();
    } catch (error) {
        console.error('Error saving customer:', error);
        alert('Xatolik: ' + (error.message || 'Noma\'lum xatolik'));
    }
}

// Product image modal
function showProductImage(imageUrl, productName) {
    // Create modal if it doesn't exist
    let modal = document.getElementById('product-image-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'product-image-modal';
        modal.className = 'modal';
        modal.style.display = 'none';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 90%; max-height: 90vh; text-align: center;">
                <span class="close" onclick="closeModal('product-image-modal')" style="float: right; font-size: 28px; font-weight: bold; cursor: pointer; color: #aaa;">&times;</span>
                <h2 id="product-image-title" style="margin-bottom: 1rem;"></h2>
                <img id="product-image-full" src="" alt="" style="max-width: 100%; max-height: 70vh; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);">
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    document.getElementById('product-image-title').textContent = productName || 'Mahsulot rasmi';
    document.getElementById('product-image-full').src = imageUrl;
    document.getElementById('product-image-full').alt = productName || 'Mahsulot rasmi';
    modal.style.display = 'block';
    
    // Close on background click
    modal.onclick = function(e) {
        if (e.target === modal) {
            closeModal('product-image-modal');
        }
    };
}

// Alias for showImageModal (used in admin products table)
function showImageModal(imageUrl) {
    showProductImage(imageUrl, 'Mahsulot rasmi');
}

// Profile management
let profileImageFile = null;

async function showProfileModal() {
    if (!currentUser || !currentUser.id) {
        alert('Foydalanuvchi ma\'lumotlari topilmadi');
        return;
    }
    
    if (!currentToken) {
        alert('Autentifikatsiya xatosi. Iltimos, qaytadan kirib ko\'ring.');
        return;
    }
    
    try {
        console.log('Loading profile for seller:', currentUser.id);
        // Load profile data
        const response = await fetch(`${API_BASE}/sellers/${currentUser.id}`, {
            headers: {
                'Authorization': `Bearer ${currentToken}`,
                'X-Seller-ID': currentUser.id.toString(),
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Profile response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Profile error:', errorText);
            throw new Error(`Profil ma'lumotlarini yuklashda xatolik: ${response.status}`);
        }
        
        const profile = await response.json();
        console.log('Profile loaded:', profile);
        
        // Populate form
        document.getElementById('profile-seller-id').value = profile.id;
        document.getElementById('profile-name').value = profile.name || '';
        document.getElementById('profile-username').value = profile.username || '';
        document.getElementById('profile-email').value = profile.email || '';
        document.getElementById('profile-phone').value = profile.phone || '';
        document.getElementById('profile-password').value = '';
        document.getElementById('profile-confirm-password').value = '';
        
        // Show profile image if exists
        const imagePreview = document.getElementById('profile-image-preview');
        if (profile.image_url) {
            const imageUrl = profile.image_url.startsWith('http') 
                ? profile.image_url 
                : `${window.location.origin}${profile.image_url}`;
            imagePreview.src = imageUrl;
            imagePreview.style.display = 'block';
        } else {
            imagePreview.style.display = 'none';
        }
        
        profileImageFile = null;
        
        // Show modal
        document.getElementById('profile-modal').style.display = 'block';
    } catch (error) {
        console.error('Error loading profile:', error);
        alert('Profil ma\'lumotlarini yuklashda xatolik: ' + error.message);
    }
}

// Make showProfileModal globally accessible
window.showProfileModal = showProfileModal;

function handleProfileImageChange(event) {
    const file = event.target.files[0];
    if (file) {
        profileImageFile = file;
        
        // Show preview
        const reader = new FileReader();
        reader.onload = function(e) {
            const imagePreview = document.getElementById('profile-image-preview');
            imagePreview.src = e.target.result;
            imagePreview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

async function uploadProfileImage(sellerId, file) {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_BASE}/sellers/${sellerId}/upload-image`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${currentToken}`,
            'X-Seller-ID': sellerId.toString()
        },
        body: formData
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Rasm yuklashda xatolik');
    }
    
    return await response.json();
}

async function saveProfile(event) {
    event.preventDefault();
    
    const sellerId = parseInt(document.getElementById('profile-seller-id').value);
    if (!sellerId) {
        alert('Sotuvchi ID topilmadi');
        return;
    }
    
    const name = document.getElementById('profile-name').value;
    const username = document.getElementById('profile-username').value;
    const email = document.getElementById('profile-email').value;
    const phone = document.getElementById('profile-phone').value;
    const password = document.getElementById('profile-password').value;
    const confirmPassword = document.getElementById('profile-confirm-password').value;
    
    // Validate password if provided
    if (password) {
        if (password.length < 6) {
            alert('Parol kamida 6 ta belgidan iborat bo\'lishi kerak');
            return;
        }
        if (password !== confirmPassword) {
            alert('Parollar mos kelmayapti');
            return;
        }
    }
    
    try {
        // Upload image first if selected
        if (profileImageFile) {
            try {
                await uploadProfileImage(sellerId, profileImageFile);
            } catch (error) {
                console.error('Error uploading image:', error);
                alert('Rasm yuklashda xatolik: ' + error.message);
                return;
            }
        }
        
        // Update profile data
        const profileData = {
            name: name,
            username: username || null,
            email: email || null,
            phone: phone || null
        };
        
        if (password) {
            profileData.password = password;
        }
        
        const response = await fetch(`${API_BASE}/sellers/${sellerId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`,
                'X-Seller-ID': sellerId.toString()
            },
            body: JSON.stringify(profileData)
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Noma\'lum xatolik' }));
            throw new Error(errorData.detail || 'Profilni yangilashda xatolik');
        }
        
        const updatedProfile = await response.json();
        
        // Reload current user data to get updated profile including image
        try {
            const fullProfileResponse = await fetch(`${API_BASE}/sellers/${sellerId}`, {
                headers: {
                    'Authorization': `Bearer ${currentToken}`,
                    'X-Seller-ID': sellerId.toString()
                }
            });
            
            if (fullProfileResponse.ok) {
                const fullProfile = await fullProfileResponse.json();
                currentUser = { ...currentUser, ...fullProfile };
            }
        } catch (err) {
            console.warn('Could not reload full profile:', err);
        }
        
        // Reload current user data
        await loadCurrentUser(sellerId);
        
        alert('Profil muvaffaqiyatli yangilandi');
        closeModal('profile-modal');
    } catch (error) {
        console.error('Error saving profile:', error);
        alert('Xatolik: ' + (error.message || 'Noma\'lum xatolik'));
    }
}

// Search customers
let allCustomers = [];
async function searchCustomers() {
    const searchInput = document.getElementById('customers-search');
    if (!searchInput) return;
    
    const query = searchInput.value.trim().toLowerCase();
    
    // Load customers if not loaded
    if (allCustomers.length === 0) {
        try {
            const response = await fetch(`${API_BASE}/customers?limit=1000`);
            if (response.ok) {
                allCustomers = await response.json();
            }
        } catch (error) {
            console.error('Error loading customers for search:', error);
            return;
        }
    }
    
    // Filter customers
    let filteredCustomers = allCustomers;
    if (query) {
        filteredCustomers = allCustomers.filter(c => 
            (c.name && c.name.toLowerCase().includes(query)) ||
            (c.phone && c.phone.toLowerCase().includes(query)) ||
            (c.id && c.id.toString().includes(query))
        );
    }
    
    // Render filtered customers
    const tbody = document.getElementById('customers-tbody');
    if (!tbody) return;
    
    if (filteredCustomers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Qidiruv natijasi topilmadi</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    filteredCustomers.forEach(customer => {
        const row = document.createElement('tr');
        const debtBalance = customer.debt_balance || customer.total_debt || 0;
        
        // Get customer type label
        let customerTypeLabel = 'Oddiy';
        let customerTypeClass = 'badge-warning';
        if (customer.customer_type === 'wholesale') {
            customerTypeLabel = 'Ulgurji';
            customerTypeClass = 'badge-success';
        } else if (customer.customer_type === 'retail') {
            customerTypeLabel = 'Dona';
            customerTypeClass = 'badge-info';
        }
        
        row.innerHTML = `
            <td>${customer.id}</td>
            <td>${escapeHtml(customer.name || 'Noma\'lum')}</td>
            <td>${escapeHtml(customer.phone || '-')}</td>
            <td><span class="badge ${customerTypeClass}">${customerTypeLabel}</span></td>
            <td>${formatMoney(debtBalance)}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="viewCustomerHistory(${customer.id}, '${escapeHtml(customer.name || 'Noma\'lum')}')" title="Sotuv tarixi">
                    <i class="fas fa-history"></i> Tarix
                </button>
                <button class="btn btn-sm btn-info" onclick="viewCustomerDebtHistory(${customer.id}, '${escapeHtml(customer.name || 'Noma\'lum')}')" title="Qarz tarixi" style="margin-left: 0.25rem;">
                    <i class="fas fa-file-invoice-dollar"></i> Qarz
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Load Orders
async function loadOrders() {
    try {
        const userId = localStorage.getItem('seller_id');
        const tbody = document.getElementById('orders-tbody');
        
        if (!tbody) {
            console.error('orders-tbody element not found');
            return;
        }
        
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">Yuklanmoqda...</td></tr>';
        
        const token = currentToken || localStorage.getItem('seller_token');
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (userId) headers['X-Seller-ID'] = userId;
        const response = await fetch(`${API_BASE}/orders?seller_id=${userId}`, { headers });
        
        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            console.error('Orders API error:', response.status, errorText);
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const orders = await response.json();
        
        if (!orders) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="color: red;">Serverdan javob olinmadi</td></tr>';
            return;
        }
        
        if (!Array.isArray(orders)) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="color: red;">Serverdan noto\'g\'ri javob olindi</td></tr>';
            return;
        }
        
        if (orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">Buyurtmalar topilmadi</td></tr>';
            return;
        }
        
        tbody.innerHTML = orders.map(order => {
            const itemsCount = (order.items && Array.isArray(order.items)) ? order.items.length : 0;
            return `
            <tr>
                <td>${order.id}</td>
                <td>${escapeHtml(order.customer_name || 'Noma\'lum')}</td>
                <td>${itemsCount} ta mahsulot</td>
                <td><strong>${formatMoney(order.total_amount || 0)}</strong></td>
                <td><span class="badge badge-${getOrderStatusClass(order.status)}">${getOrderStatusName(order.status)}</span></td>
                <td>${formatDate(order.created_at)}</td>
                <td>
                    ${order.status === 'pending' && userPermissions.includes('orders.update') ? 
                        `<button class="btn btn-success" onclick="acceptOrder(${order.id})">Qabul qilish</button>` : ''}
                </td>
            </tr>
        `;
        }).join('');
        
        console.log('Loaded', orders.length, 'orders');
    } catch (error) {
        console.error('Error loading orders:', error);
        const tbody = document.getElementById('orders-tbody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="color: red;">Xatolik: ${error.message || 'Noma\'lum xatolik'}</td></tr>`;
        }
    }
}

async function acceptOrder(orderId) {
    if (!confirm('Buyurtmani qabul qilishni tasdiqlaysizmi?')) return;
    
    try {
        const userId = localStorage.getItem('seller_id');
        const response = await fetch(`${API_BASE}/orders/${orderId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Seller-ID': userId
            },
            body: JSON.stringify({ status: 'processing' })
        });
        
        if (response.ok) {
            alert('Buyurtma qabul qilindi!');
            loadOrders();
        } else {
            alert('Xatolik yuz berdi');
        }
    } catch (error) {
        console.error('Error accepting order:', error);
        alert('Xatolik yuz berdi');
    }
}

// Edit sale function (opens sale in new sale page for editing)
async function editSale(saleId) {
    try {
        console.log('Editing sale:', saleId);
        const response = await fetch(`${API_BASE}/sales/${saleId}`);
        if (!response.ok) {
            alert('Sotuv topilmadi');
            return;
        }
        
        const sale = await response.json();
        console.log('Sale loaded:', sale);
        
        // Load sale data first (ensure products and customers are loaded)
        if (typeof window.initSalePage === 'function') {
            await window.initSalePage();
        } else if (typeof window.loadSaleData === 'function') {
            // Fallback: just load data
            await window.loadSaleData();
            if (typeof window.setupSaleEventListeners === 'function') {
                window.setupSaleEventListeners();
            }
        }
        
        // Wait a bit for data to be ready
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Get products and customers
        const products = (typeof window !== 'undefined' && window.saleProducts) ? window.saleProducts : (typeof saleProducts !== 'undefined' ? saleProducts : []);
        const customers = (typeof window !== 'undefined' && window.saleCustomers) ? window.saleCustomers : (typeof saleCustomers !== 'undefined' ? saleCustomers : []);
        
        // Pre-fill customer
        if (sale.customer_id) {
            const customer = customers.find(c => c.id === sale.customer_id);
            if (!customer) {
                // Try to fetch customer
                try {
                    const customerRes = await fetch(`${API_BASE}/customers/${sale.customer_id}`);
                    if (customerRes.ok) {
                        const customer = await customerRes.json();
                        if (!window.saleCustomers) window.saleCustomers = [];
                        window.saleCustomers.push(customer);
                        
                        // Select customer
                        if (typeof window.selectCustomer === 'function') {
                            window.selectCustomer(sale.customer_id);
                        }
                    }
                } catch (e) {
                    console.error('Error loading customer:', e);
                }
            } else {
                // Select customer
                if (typeof window.selectCustomer === 'function') {
                    window.selectCustomer(sale.customer_id);
                }
            }
        }
        
        // Pre-fill items
        if (sale.items && sale.items.length > 0) {
            window.saleItems = [];
            for (const item of sale.items) {
                const product = products.find(p => p.id === item.product_id);
                if (!product) {
                    // Try to fetch product
                    try {
                        const productRes = await fetch(`${API_BASE}/products/${item.product_id}`);
                        if (productRes.ok) {
                            const product = await productRes.json();
                            if (!window.saleProducts) window.saleProducts = [];
                            window.saleProducts.push(product);
                            
                            // Add to sale items
                            if (typeof window.addProductToSale === 'function') {
                                window.addProductToSale(item.product_id);
                                // Set quantity
                                if (window.saleItems && window.saleItems.length > 0) {
                                    const lastItem = window.saleItems[window.saleItems.length - 1];
                                    lastItem.quantity = item.requested_quantity;
                                    lastItem.total = item.subtotal;
                                }
                            }
                        }
                    } catch (e) {
                        console.error('Error loading product:', e);
                    }
                } else {
                    // Add to sale items
                    if (typeof window.addProductToSale === 'function') {
                        window.addProductToSale(item.product_id);
                        // Set quantity after a delay
                        setTimeout(() => {
                            if (window.saleItems && window.saleItems.length > 0) {
                                const lastItem = window.saleItems[window.saleItems.length - 1];
                                if (lastItem && lastItem.product.id === item.product_id) {
                                    lastItem.quantity = item.requested_quantity;
                                    lastItem.total = item.subtotal;
                                    if (typeof window.updateSaleSummary === 'function') {
                                        window.updateSaleSummary();
                                    }
                                    if (typeof window.renderSaleItems === 'function') {
                                        window.renderSaleItems();
                                    }
                                }
                            }
                        }, 100);
                    }
                }
            }
            
            // Update summary
            setTimeout(() => {
                if (typeof window.updateSaleSummary === 'function') {
                    window.updateSaleSummary();
                }
                if (typeof window.renderSaleItems === 'function') {
                    window.renderSaleItems();
                }
            }, 300);
        }
        
        // Store sale ID for update
        window.editingSaleId = saleId;
        
        // Show new sale page
        showPage('new-sale');
        
        // Change button text
        const completeBtn = document.querySelector('.btn-complete');
        if (completeBtn) {
            const span = completeBtn.querySelector('span');
            if (span) {
                span.textContent = 'Saqlash';
            }
        }
    } catch (error) {
        console.error('Error editing sale:', error);
        alert('Xatolik: ' + error.message);
    }
}

async function viewSaleReceipt(saleId) {
    try {
        // First check if sale is approved
        const response = await fetch(`${API_BASE}/sales/${saleId}`);
        if (!response.ok) {
            throw new Error('Sotuv topilmadi');
        }
        const sale = await response.json();
        
        // Check if sale is approved
        if (sale.requires_admin_approval && sale.admin_approved !== true) {
            if (sale.admin_approved === null) {
                alert('Sotuv hali admin tomonidan tasdiqlanmagan. Chek faqat tasdiqlangan sotuvlar uchun ko\'rsatiladi.');
            } else if (sale.admin_approved === false) {
                alert('Sotuv rad etilgan. Chek ko\'rsatilmaydi.');
            }
            return;
        }
        
        // Open receipt
        window.open(`${API_BASE}/sales/${saleId}/receipt`, '_blank');
    } catch (error) {
        console.error('Error checking sale status:', error);
        alert('Xatolik: ' + error.message);
    }
}

function getOrderStatusClass(status) {
    const classes = {
        'pending': 'warning',
        'processing': 'info',
        'completed': 'success',
        'cancelled': 'danger'
    };
    return classes[status] || 'secondary';
}

function getOrderStatusName(status) {
    const names = {
        'pending': 'Kutilmoqda',
        'processing': 'Jarayonda',
        'completed': 'Tugallangan',
        'cancelled': 'Bekor qilingan'
    };
    return names[status] || status;
}

// Utility functions
function formatMoney(amount) {
    return new Intl.NumberFormat('uz-UZ', {
        style: 'currency',
        currency: 'UZS',
        minimumFractionDigits: 0
    }).format(amount);
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    
    // Format in Uzbekistan timezone (UTC+5)
    return date.toLocaleString('uz-UZ', {
        timeZone: 'Asia/Tashkent',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// New Sale functions are now in sale-functions.js
// Do NOT redeclare loadSaleData here - it's in sale-functions.js
// Use window.loadSaleData() instead

// All sale-related functions have been moved to sale-functions.js
// Do NOT redeclare any sale functions here to avoid conflicts
// Use window.loadSaleData(), window.completeSale(), etc. from sale-functions.js

// ==================== ADMIN FUNCTIONS ====================

// Admin tab management
function showAdminTab(tabId, clickedElement) {
    // Hide all admin tabs
    document.querySelectorAll('.admin-tab-content').forEach(tab => {
        tab.classList.remove('active');
        tab.style.display = 'none';
    });
    
    // Show selected tab
    const selectedTab = document.getElementById(tabId);
    if (selectedTab) {
        selectedTab.classList.add('active');
        selectedTab.style.display = 'block';
    }
    
    // Update tab buttons
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Set active button
    if (clickedElement) {
        clickedElement.classList.add('active');
    } else {
        // Find button by onclick attribute
        const buttons = document.querySelectorAll('.admin-tab-btn');
        buttons.forEach(btn => {
            const onclick = btn.getAttribute('onclick');
            if (onclick && onclick.includes(`'${tabId}'`)) {
                btn.classList.add('active');
            }
        });
    }
    
    // Load tab-specific data
    switch(tabId) {
        case 'admin-dashboard':
            loadAdminDashboard();
            break;
        case 'admin-products':
            loadAdminProducts();
            break;
        case 'admin-customers':
            loadAdminCustomers();
            break;
        case 'admin-sales':
            loadAdminSales();
            break;
        case 'admin-orders':
            loadAdminOrders();
            break;
        case 'admin-sellers':
            loadAdminSellers();
            break;
        case 'admin-gps':
            loadAdminGPSMap();
            loadAdminSellersMarkers();
            break;
        case 'admin-settings':
            loadAdminSettings();
            break;
    }
}

// Admin Dashboard
async function loadAdminDashboard() {
    try {
        const token = currentToken || localStorage.getItem('seller_token');
        const sellerId = localStorage.getItem('seller_id');
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (sellerId) headers['X-Seller-ID'] = sellerId;
        
        const [productsRes, ordersRes, salesRes, customersRes] = await Promise.all([
            fetch(`${API_BASE}/products/count`, { headers }),
            fetch(`${API_BASE}/orders?limit=1`, { headers }),
            fetch(`${API_BASE}/sales?limit=1`, { headers }),
            fetch(`${API_BASE}/customers/count`, { headers })
        ]);
        
        const productsCount = productsRes.ok ? (await productsRes.json()).count : 0;
        const orders = ordersRes.ok ? await ordersRes.json() : [];
        const sales = salesRes.ok ? await salesRes.json() : [];
        const customersCount = customersRes.ok ? (await customersRes.json()).count : 0;
        
        // Get actual counts instead of "Ko'p"
        let ordersCount = 0;
        let salesCount = 0;
        
        try {
            const ordersCountRes = await fetch(`${API_BASE}/orders/count`, { headers });
            if (ordersCountRes.ok) {
                const ordersCountData = await ordersCountRes.json();
                ordersCount = ordersCountData.count || 0;
            }
        } catch (e) {
            console.error('Error getting orders count:', e);
        }
        
        try {
            const salesCountRes = await fetch(`${API_BASE}/sales/count`, { headers });
            if (salesCountRes.ok) {
                const salesCountData = await salesCountRes.json();
                salesCount = salesCountData.count || 0;
            }
        } catch (e) {
            console.error('Error getting sales count:', e);
            // Fallback: try statistics endpoint
            try {
                const statsRes = await fetch(`${API_BASE}/statistics`, { headers });
                if (statsRes.ok) {
                    const stats = await statsRes.json();
                    salesCount = stats.total_sales || 0;
                }
            } catch (e2) {
                console.error('Error getting stats:', e2);
            }
        }
        
        const productsEl = document.getElementById('admin-total-products');
        const ordersEl = document.getElementById('admin-total-orders');
        const salesEl = document.getElementById('admin-total-sales');
        const customersEl = document.getElementById('admin-total-customers');
        
        if (productsEl) productsEl.textContent = productsCount;
        if (ordersEl) ordersEl.textContent = ordersCount;
        if (salesEl) salesEl.textContent = salesCount;
        if (customersEl) customersEl.textContent = customersCount;
    } catch (error) {
        console.error('Error loading admin dashboard:', error);
    }
}

// Admin Products
async function loadAdminProducts() {
    try {
        const tbody = document.getElementById('admin-products-tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">Yuklanmoqda...</td></tr>';
        
        const token = currentToken || localStorage.getItem('seller_token');
        const sellerId = localStorage.getItem('seller_id');
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (sellerId) headers['X-Seller-ID'] = sellerId;
        
        const response = await fetch(`${API_BASE}/products?limit=100`, { headers });
        if (!response.ok) throw new Error('Failed to load products');
        
        const products = await response.json();
        
        if (products.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center">Mahsulotlar topilmadi</td></tr>';
            return;
        }
        
        const searchTerm = document.getElementById('admin-product-search')?.value.toLowerCase() || '';
        const filteredProducts = products.filter(p => 
            !searchTerm || 
            (p.name && p.name.toLowerCase().includes(searchTerm)) ||
            (p.barcode && p.barcode.toLowerCase().includes(searchTerm))
        );
        
        if (filteredProducts.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center">Mahsulotlar topilmadi</td></tr>';
            return;
        }
        
        tbody.innerHTML = filteredProducts.map(p => {
            const imageUrl = p.image_url ? (p.image_url.startsWith('http') ? p.image_url : `${window.location.origin}${p.image_url}`) : '';
            return `
            <tr>
                <td>${p.id}</td>
                <td>${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(p.name)}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; cursor: pointer;" onclick="showImageModal('${escapeHtml(imageUrl)}')">` : '-'}</td>
                <td>${escapeHtml(p.name || 'Noma\'lum')}</td>
                <td>${escapeHtml(p.barcode || '-')}</td>
                <td>${p.packages_in_stock || 0}</td>
                <td>${p.pieces_in_stock || 0}</td>
                <td>${formatMoney(p.regular_price || 0)}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="editAdminProduct(${p.id})" title="Tahrirlash">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteAdminProduct(${p.id})" title="O'chirish">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
        }).join('');
    } catch (error) {
        console.error('Error loading admin products:', error);
        const tbody = document.getElementById('admin-products-tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="color: red;">Xatolik: ' + error.message + '</td></tr>';
        }
    }
}

// Admin Customers
async function loadAdminCustomers() {
    try {
        const tbody = document.getElementById('admin-customers-tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">Yuklanmoqda...</td></tr>';
        
        const token = currentToken || localStorage.getItem('seller_token');
        const sellerId = localStorage.getItem('seller_id');
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (sellerId) headers['X-Seller-ID'] = sellerId;
        
        const response = await fetch(`${API_BASE}/customers?limit=50`, { headers });
        if (!response.ok) throw new Error('Failed to load customers');
        
        const customers = await response.json();
        
        if (customers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">Mijozlar topilmadi</td></tr>';
            return;
        }
        
        const searchTerm = document.getElementById('admin-customer-search')?.value.toLowerCase() || '';
        const filteredCustomers = customers.filter(c => 
            !searchTerm || 
            (c.name && c.name.toLowerCase().includes(searchTerm)) ||
            (c.phone && c.phone.toLowerCase().includes(searchTerm))
        );
        
        if (filteredCustomers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">Mijozlar topilmadi</td></tr>';
            return;
        }
        
        tbody.innerHTML = filteredCustomers.map(c => {
            const debtClass = (c.debt_balance || 0) > 0 ? 'badge-danger' : 'badge-success';
            const typeNames = { wholesale: 'Ulgurji', retail: 'Dona', regular: 'Oddiy' };
            return `
            <tr>
                <td>${c.id}</td>
                <td>${escapeHtml(c.name || 'Noma\'lum')}</td>
                <td>${escapeHtml(c.phone || '-')}</td>
                <td>${escapeHtml(c.address || '-')}</td>
                <td><span class="badge ${c.customer_type === 'wholesale' ? 'badge-success' : c.customer_type === 'retail' ? 'badge-info' : 'badge-warning'}">${typeNames[c.customer_type] || c.customer_type}</span></td>
                <td><span class="badge ${debtClass}">${formatMoney(c.debt_balance || 0)}</span></td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="editAdminCustomer(${c.id})" title="Tahrirlash">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteAdminCustomer(${c.id})" title="O'chirish">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
        }).join('');
    } catch (error) {
        console.error('Error loading admin customers:', error);
        const tbody = document.getElementById('admin-customers-tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="color: red;">Xatolik: ' + error.message + '</td></tr>';
        }
    }
}

// Admin Sales
async function loadAdminSales() {
    try {
        const tbody = document.getElementById('admin-sales-tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">Yuklanmoqda...</td></tr>';
        
        const token = currentToken || localStorage.getItem('seller_token');
        const sellerId = localStorage.getItem('seller_id');
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (sellerId) headers['X-Seller-ID'] = sellerId;
        
        const response = await fetch(`${API_BASE}/sales?limit=100`, { headers });
        if (!response.ok) throw new Error('Failed to load sales');
        
        const sales = await response.json();
        
        if (sales.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center">Sotuvlar topilmadi</td></tr>';
            return;
        }
        
        const startDate = document.getElementById('admin-sale-start-date')?.value;
        const endDate = document.getElementById('admin-sale-end-date')?.value;
        const statusFilter = document.getElementById('admin-sale-status-filter')?.value || '';
        
        let filteredSales = sales;
        if (startDate || endDate || statusFilter) {
            filteredSales = sales.filter(s => {
                const saleDate = s.created_at ? new Date(s.created_at).toISOString().split('T')[0] : '';
                const dateMatch = (!startDate || saleDate >= startDate) && (!endDate || saleDate <= endDate);
                const statusMatch = !statusFilter || s.status === statusFilter;
                return dateMatch && statusMatch;
            });
        }
        
        if (filteredSales.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center">Sotuvlar topilmadi</td></tr>';
            return;
        }
        
        tbody.innerHTML = filteredSales.map(s => {
            const statusBadges = {
                pending: '<span class="badge badge-warning">Kutilmoqda</span>',
                approved: '<span class="badge badge-success">Tasdiqlangan</span>',
                rejected: '<span class="badge badge-danger">Rad etilgan</span>'
            };
            const paymentMethods = { cash: 'Naqd', card: 'Karta', bank_transfer: 'Hisob raqam' };
            return `
            <tr>
                <td>${s.id}</td>
                <td>${formatDate(s.created_at)}</td>
                <td>${escapeHtml(s.customer_name || 'Noma\'lum')}</td>
                <td>${escapeHtml(s.seller_name || '-')}</td>
                <td>${formatMoney(s.total_amount || 0)}</td>
                <td>${paymentMethods[s.payment_method] || s.payment_method || 'cash'}</td>
                <td>${statusBadges[s.status] || '<span class="badge">-</span>'}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="viewAdminSale(${s.id})" title="Ko'rish">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${s.status === 'pending' ? `
                        <button class="btn btn-sm btn-success" onclick="approveAdminSale(${s.id})" title="Tasdiqlash">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="rejectAdminSale(${s.id})" title="Rad etish">
                            <i class="fas fa-times"></i>
                        </button>
                    ` : ''}
                </td>
            </tr>
        `;
        }).join('');
    } catch (error) {
        console.error('Error loading admin sales:', error);
        const tbody = document.getElementById('admin-sales-tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center" style="color: red;">Xatolik: ' + error.message + '</td></tr>';
        }
    }
}

// Admin Orders
async function loadAdminOrders() {
    try {
        const tbody = document.getElementById('admin-orders-tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">Yuklanmoqda...</td></tr>';
        
        const token = currentToken || localStorage.getItem('seller_token');
        const sellerId = localStorage.getItem('seller_id');
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (sellerId) headers['X-Seller-ID'] = sellerId;
        
        const response = await fetch(`${API_BASE}/orders?limit=100`, { headers });
        if (!response.ok) throw new Error('Failed to load orders');
        
        const orders = await response.json();
        
        if (orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">Buyurtmalar topilmadi</td></tr>';
            return;
        }
        
        const startDate = document.getElementById('admin-order-start-date')?.value;
        const endDate = document.getElementById('admin-order-end-date')?.value;
        const statusFilter = document.getElementById('admin-order-status-filter')?.value || '';
        
        let filteredOrders = orders;
        if (startDate || endDate || statusFilter) {
            filteredOrders = orders.filter(o => {
                const orderDate = o.created_at ? new Date(o.created_at).toISOString().split('T')[0] : '';
                const dateMatch = (!startDate || orderDate >= startDate) && (!endDate || orderDate <= endDate);
                const statusMatch = !statusFilter || o.status === statusFilter;
                return dateMatch && statusMatch;
            });
        }
        
        if (filteredOrders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">Buyurtmalar topilmadi</td></tr>';
            return;
        }
        
        tbody.innerHTML = filteredOrders.map(o => {
            const statusBadges = {
                pending: '<span class="badge badge-warning">Kutilmoqda</span>',
                processing: '<span class="badge badge-info">Jarayonda</span>',
                completed: '<span class="badge badge-success">Tugallangan</span>',
                cancelled: '<span class="badge badge-danger">Bekor qilingan</span>'
            };
            return `
            <tr>
                <td>${o.id}</td>
                <td>${formatDate(o.created_at)}</td>
                <td>${escapeHtml(o.customer_name || 'Noma\'lum')}</td>
                <td>${escapeHtml(o.seller_name || '-')}</td>
                <td>${formatMoney(o.total_amount || 0)}</td>
                <td>${statusBadges[o.status] || '<span class="badge">' + (o.status || 'pending') + '</span>'}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="viewAdminOrder(${o.id})" title="Ko'rish">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="updateAdminOrderStatus(${o.id})" title="Status o'zgartirish">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            </tr>
        `;
        }).join('');
    } catch (error) {
        console.error('Error loading admin orders:', error);
        const tbody = document.getElementById('admin-orders-tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="color: red;">Xatolik: ' + error.message + '</td></tr>';
        }
    }
}

// Admin Sellers
async function loadAdminSellers() {
    try {
        const tbody = document.getElementById('admin-sellers-tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">Yuklanmoqda...</td></tr>';
        
        const token = currentToken || localStorage.getItem('seller_token');
        const sellerId = localStorage.getItem('seller_id');
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (sellerId) headers['X-Seller-ID'] = sellerId;
        
        const response = await fetch(`${API_BASE}/sellers`, { headers });
        if (!response.ok) throw new Error('Failed to load sellers');
        
        const sellers = await response.json();
        
        if (sellers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center">Sotuvchilar topilmadi</td></tr>';
            return;
        }
        
        tbody.innerHTML = sellers.map(s => `
            <tr>
                <td>${s.id}</td>
                <td>${escapeHtml(s.name || 'Noma\'lum')}</td>
                <td>${escapeHtml(s.username || '-')}</td>
                <td>${escapeHtml(s.phone || '-')}</td>
                <td>${escapeHtml(s.email || '-')}</td>
                <td>${s.role_name || '-'}</td>
                <td><span class="badge ${s.is_active ? 'badge-success' : 'badge-danger'}">${s.is_active ? 'Faol' : 'Nofaol'}</span></td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="viewAdminSellerLogin(${s.id}, '${escapeHtml(s.username || '')}')" title="Login ma'lumotlari">
                        <i class="fas fa-key"></i>
                    </button>
                    <button class="btn btn-sm btn-primary" onclick="editAdminSeller(${s.id})" title="Tahrirlash">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading admin sellers:', error);
        const tbody = document.getElementById('admin-sellers-tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="color: red;">Xatolik: ' + error.message + '</td></tr>';
        }
    }
}

// Admin GPS Map
let adminMap = null;
let adminMapMarkers = [];

function loadAdminGPSMap() {
    const mapContainer = document.getElementById('admin-map');
    if (!mapContainer) return;
    
    if (!adminMap) {
        mapboxgl.accessToken = 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXV4NTFqemZycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw';
        adminMap = new mapboxgl.Map({
            container: 'admin-map',
            style: 'mapbox://styles/mapbox/streets-v11',
            center: [69.2406, 41.2995], // Tashkent
            zoom: 12
        });
    }
}

async function loadAdminSellersMarkers() {
    if (!adminMap) {
        loadAdminGPSMap();
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait for map to initialize
    }
    
    // Clear existing markers
    adminMapMarkers.forEach(marker => marker.remove());
    adminMapMarkers = [];
    
    try {
        const token = currentToken || localStorage.getItem('seller_token');
        const sellerId = localStorage.getItem('seller_id');
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (sellerId) headers['X-Seller-ID'] = sellerId;
        
        const response = await fetch(`${API_BASE}/locations/sellers`, { headers });
        if (!response.ok) throw new Error('Failed to load locations');
        
        const locations = await response.json();
        
        if (locations.length === 0) {
            return;
        }
        
        locations.forEach(location => {
            if (location.latitude && location.longitude) {
                const marker = new mapboxgl.Marker()
                    .setLngLat([location.longitude, location.latitude])
                    .setPopup(new mapboxgl.Popup().setHTML(`<b>${escapeHtml(location.name)}</b>`))
                    .addTo(adminMap);
                adminMapMarkers.push(marker);
            }
        });
        
        // Fit map to show all markers
        if (locations.length > 0) {
            const bounds = new mapboxgl.LngLatBounds();
            locations.forEach(loc => {
                if (loc.latitude && loc.longitude) {
                    bounds.extend([loc.longitude, loc.latitude]);
                }
            });
            adminMap.fitBounds(bounds, { padding: 50 });
        }
    } catch (error) {
        console.error('Error loading admin sellers markers:', error);
    }
}

// Admin Settings
async function loadAdminSettings() {
    try {
        const token = currentToken || localStorage.getItem('seller_token');
        const sellerId = localStorage.getItem('seller_id');
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (sellerId) headers['X-Seller-ID'] = sellerId;
        
        const response = await fetch(`${API_BASE}/settings`, { headers });
        if (!response.ok) throw new Error('Failed to load settings');
        
        const settings = await response.json();
        
        document.getElementById('admin-store-name').value = settings.store_name || '';
        document.getElementById('admin-receipt-footer').value = settings.receipt_footer_text || '';
        document.getElementById('admin-work-start-time').value = settings.work_start_time || '09:00';
        document.getElementById('admin-work-end-time').value = settings.work_end_time || '18:00';
    } catch (error) {
        console.error('Error loading admin settings:', error);
    }
}

async function saveAdminSettings(event) {
    event.preventDefault();
    
    try {
        const token = currentToken || localStorage.getItem('seller_token');
        const sellerId = localStorage.getItem('seller_id');
        const headers = {
            'Content-Type': 'application/json'
        };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (sellerId) headers['X-Seller-ID'] = sellerId;
        
        const settings = {
            store_name: document.getElementById('admin-store-name').value,
            receipt_footer_text: document.getElementById('admin-receipt-footer').value,
            work_start_time: document.getElementById('admin-work-start-time').value,
            work_end_time: document.getElementById('admin-work-end-time').value
        };
        
        const response = await fetch(`${API_BASE}/settings`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(settings)
        });
        
        if (response.ok) {
            alert('Sozlamalar muvaffaqiyatli saqlandi');
        } else {
            throw new Error('Sozlamalarni saqlashda xatolik');
        }
    } catch (error) {
        console.error('Error saving admin settings:', error);
        alert('Xatolik: ' + error.message);
    }
}

// Admin modal functions
function generateAdminBarcode() {
    const randomBarcode = '2' + Math.floor(100000000000 + Math.random() * 900000000000).toString();
    document.getElementById('admin-product-barcode').value = randomBarcode;
}

function showAddAdminProductModal() {
    document.getElementById('admin-product-modal-title').textContent = 'Yangi Mahsulot';
    document.getElementById('admin-product-form').reset();
    document.getElementById('admin-product-id').value = '';
    document.getElementById('admin-product-image-preview').innerHTML = '';
    document.getElementById('admin-product-modal').style.display = 'block';
}

async function editAdminProduct(id) {
    try {
        const token = currentToken || localStorage.getItem('seller_token');
        const sellerId = localStorage.getItem('seller_id');
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (sellerId) headers['X-Seller-ID'] = sellerId;
        
        const product = await fetch(`${API_BASE}/products/${id}`, { headers }).then(r => r.json());
        document.getElementById('admin-product-modal-title').textContent = 'Mahsulotni Tahrirlash';
        document.getElementById('admin-product-id').value = product.id;
        document.getElementById('admin-product-name').value = product.name || '';
        document.getElementById('admin-product-barcode').value = product.barcode || '';
        document.getElementById('admin-product-brand').value = product.brand || '';
        document.getElementById('admin-product-supplier').value = product.supplier || '';
        document.getElementById('admin-product-location').value = product.location || '';
        document.getElementById('admin-product-image-url').value = product.image_url || '';
        updateAdminProductImagePreview(product.image_url || '');
        document.getElementById('admin-product-pieces-per-package').value = product.pieces_per_package || 1;
        document.getElementById('admin-product-cost-price').value = product.cost_price || 0;
        document.getElementById('admin-product-wholesale-price').value = product.wholesale_price || 0;
        document.getElementById('admin-product-retail-price').value = product.retail_price || 0;
        document.getElementById('admin-product-regular-price').value = product.regular_price || 0;
        document.getElementById('admin-product-packages-in-stock').value = product.packages_in_stock || 0;
        document.getElementById('admin-product-pieces-in-stock').value = product.pieces_in_stock || 0;
        document.getElementById('admin-product-modal').style.display = 'block';
    } catch (error) {
        alert('Xatolik: ' + error.message);
    }
}

async function saveAdminProduct(e) {
    e.preventDefault();
    const id = document.getElementById('admin-product-id').value;
    const imageUrl = document.getElementById('admin-product-image-url').value.trim() || null;
    const location = document.getElementById('admin-product-location').value.trim() || null;
    
    const data = {
        name: document.getElementById('admin-product-name').value,
        pieces_per_package: parseInt(document.getElementById('admin-product-pieces-per-package').value),
        cost_price: parseFloat(document.getElementById('admin-product-cost-price').value) || 0,
        wholesale_price: parseFloat(document.getElementById('admin-product-wholesale-price').value),
        retail_price: parseFloat(document.getElementById('admin-product-retail-price').value),
        regular_price: parseFloat(document.getElementById('admin-product-regular-price').value),
        packages_in_stock: parseInt(document.getElementById('admin-product-packages-in-stock').value) || 0,
        pieces_in_stock: parseInt(document.getElementById('admin-product-pieces-in-stock').value) || 0,
    };
    
    const barcodeValue = document.getElementById('admin-product-barcode').value;
    if (barcodeValue) data.barcode = barcodeValue;
    
    const brandValue = document.getElementById('admin-product-brand').value.trim();
    if (brandValue) data.brand = brandValue;
    
    const supplierValue = document.getElementById('admin-product-supplier').value.trim();
    if (supplierValue) data.supplier = supplierValue;
    
    if (location) data.location = location;
    if (imageUrl) data.image_url = imageUrl;
    
    try {
        const token = currentToken || localStorage.getItem('seller_token');
        const sellerId = localStorage.getItem('seller_id');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (sellerId) headers['X-Seller-ID'] = sellerId;
        
        const url = id ? `${API_BASE}/products/${id}` : `${API_BASE}/products`;
        const method = id ? 'PUT' : 'POST';
        
        const response = await fetch(url, { method, headers, body: JSON.stringify(data) });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
            throw new Error(errorData.detail || `HTTP ${response.status}`);
        }
        
        closeModal('admin-product-modal');
        loadAdminProducts();
        alert('Mahsulot muvaffaqiyatli saqlandi!');
    } catch (error) {
        alert('Xatolik: ' + error.message);
    }
}

async function deleteAdminProduct(id) {
    if (!confirm('Mahsulotni o\'chirishni tasdiqlaysizmi?')) return;
    
    try {
        const token = currentToken || localStorage.getItem('seller_token');
        const sellerId = localStorage.getItem('seller_id');
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (sellerId) headers['X-Seller-ID'] = sellerId;
        
        const response = await fetch(`${API_BASE}/products/${id}`, { method: 'DELETE', headers });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'O\'chirishda xatolik');
        }
        
        alert('Mahsulot muvaffaqiyatli o\'chirildi!');
        loadAdminProducts();
    } catch (error) {
        alert('Xatolik: ' + error.message);
    }
}

function updateAdminProductImagePreview(imageUrl) {
    const preview = document.getElementById('admin-product-image-preview');
    if (!preview) return;
    if (imageUrl && imageUrl.trim()) {
        let url = imageUrl;
        if (url.startsWith('/uploads')) {
            url = window.location.origin + url;
        } else if (!url.startsWith('http')) {
            url = window.location.origin + '/' + url;
        }
        const img = document.createElement('img');
        img.src = url;
        img.alt = 'Preview';
        img.style.cssText = 'max-width: 200px; max-height: 200px; border-radius: 4px; margin-top: 0.5rem; border: 1px solid var(--border-color);';
        img.onerror = function() {
            this.onerror = null;
            const span = document.createElement('span');
            span.style.color = 'red';
            span.textContent = 'Rasm yuklanmadi';
            this.parentElement.replaceChild(span, this);
        };
        preview.innerHTML = '';
        preview.appendChild(img);
    } else {
        preview.innerHTML = '';
    }
}

// Admin Customer functions
function showAddAdminCustomerModal() {
    document.getElementById('admin-customer-modal-title').textContent = 'Yangi Mijoz';
    document.getElementById('admin-customer-form').reset();
    document.getElementById('admin-customer-id').value = '';
    document.getElementById('admin-customer-modal').style.display = 'block';
}

async function editAdminCustomer(id) {
    try {
        const token = currentToken || localStorage.getItem('seller_token');
        const sellerId = localStorage.getItem('seller_id');
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (sellerId) headers['X-Seller-ID'] = sellerId;
        
        const customer = await fetch(`${API_BASE}/customers/${id}`, { headers }).then(r => r.json());
        document.getElementById('admin-customer-modal-title').textContent = 'Mijozni Tahrirlash';
        document.getElementById('admin-customer-id').value = customer.id;
        document.getElementById('admin-customer-name').value = customer.name || '';
        document.getElementById('admin-customer-phone').value = customer.phone || '';
        document.getElementById('admin-customer-address').value = customer.address || '';
        document.getElementById('admin-customer-type').value = customer.customer_type || 'regular';
        document.getElementById('admin-customer-notes').value = customer.notes || '';
        document.getElementById('admin-customer-debt-limit').value = customer.debt_limit || '';
        document.getElementById('admin-customer-modal').style.display = 'block';
    } catch (error) {
        alert('Xatolik: ' + error.message);
    }
}

async function saveAdminCustomer(e) {
    e.preventDefault();
    const id = document.getElementById('admin-customer-id').value;
    const debtLimit = document.getElementById('admin-customer-debt-limit').value;
    
    const data = {
        name: document.getElementById('admin-customer-name').value,
        phone: document.getElementById('admin-customer-phone').value,
        address: document.getElementById('admin-customer-address').value,
        customer_type: document.getElementById('admin-customer-type').value,
        notes: document.getElementById('admin-customer-notes').value,
        debt_limit: debtLimit ? parseFloat(debtLimit) : null
    };
    
    try {
        const token = currentToken || localStorage.getItem('seller_token');
        const sellerId = localStorage.getItem('seller_id');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (sellerId) headers['X-Seller-ID'] = sellerId;
        
        const url = id ? `${API_BASE}/customers/${id}` : `${API_BASE}/customers`;
        const method = id ? 'PUT' : 'POST';
        
        const response = await fetch(url, { method, headers, body: JSON.stringify(data) });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
            throw new Error(errorData.detail || `HTTP ${response.status}`);
        }
        
        closeModal('admin-customer-modal');
        loadAdminCustomers();
        alert('Mijoz muvaffaqiyatli saqlandi!');
    } catch (error) {
        alert('Xatolik: ' + error.message);
    }
}

async function deleteAdminCustomer(id) {
    if (!confirm('Mijozni o\'chirishni tasdiqlaysizmi?')) return;
    
    try {
        const token = currentToken || localStorage.getItem('seller_token');
        const sellerId = localStorage.getItem('seller_id');
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (sellerId) headers['X-Seller-ID'] = sellerId;
        
        const response = await fetch(`${API_BASE}/customers/${id}`, { method: 'DELETE', headers });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'O\'chirishda xatolik');
        }
        
        alert('Mijoz muvaffaqiyatli o\'chirildi!');
        loadAdminCustomers();
    } catch (error) {
        alert('Xatolik: ' + error.message);
    }
}

// Admin Seller functions
function showAddAdminSellerModal() {
    document.getElementById('admin-seller-modal-title').textContent = 'Yangi Sotuvchi';
    document.getElementById('admin-seller-form').reset();
    document.getElementById('admin-seller-id').value = '';
    document.getElementById('admin-seller-password-required').style.display = 'inline';
    document.getElementById('admin-seller-password').required = true;
    document.getElementById('admin-seller-modal').style.display = 'block';
}

async function editAdminSeller(id) {
    try {
        const token = currentToken || localStorage.getItem('seller_token');
        const sellerId = localStorage.getItem('seller_id');
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (sellerId) headers['X-Seller-ID'] = sellerId;
        
        const seller = await fetch(`${API_BASE}/sellers/${id}`, { headers }).then(r => r.json());
        document.getElementById('admin-seller-modal-title').textContent = 'Sotuvchini Tahrirlash';
        document.getElementById('admin-seller-id').value = seller.id;
        document.getElementById('admin-seller-name').value = seller.name || '';
        document.getElementById('admin-seller-username').value = seller.username || '';
        document.getElementById('admin-seller-email').value = seller.email || '';
        document.getElementById('admin-seller-phone').value = seller.phone || '';
        document.getElementById('admin-seller-password').value = '';
        document.getElementById('admin-seller-password-required').style.display = 'none';
        document.getElementById('admin-seller-password').required = false;
        document.getElementById('admin-seller-modal').style.display = 'block';
    } catch (error) {
        alert('Xatolik: ' + error.message);
    }
}

async function saveAdminSeller(e) {
    e.preventDefault();
    const id = document.getElementById('admin-seller-id').value;
    const password = document.getElementById('admin-seller-password').value;
    
    const data = {
        name: document.getElementById('admin-seller-name').value,
        username: document.getElementById('admin-seller-username').value,
        email: document.getElementById('admin-seller-email').value,
        phone: document.getElementById('admin-seller-phone').value
    };
    
    if (password) {
        data.password = password;
    }
    
    try {
        const token = currentToken || localStorage.getItem('seller_token');
        const sellerId = localStorage.getItem('seller_id');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (sellerId) headers['X-Seller-ID'] = sellerId;
        
        let url, method;
        if (id) {
            url = `${API_BASE}/sellers/${id}`;
            method = 'PUT';
        } else {
            url = `${API_BASE}/sellers`;
            method = 'POST';
            if (!password) {
                alert('Yangi sotuvchi qo\'shish uchun parol majburiy!');
                return;
            }
        }
        
        const response = await fetch(url, { method, headers, body: JSON.stringify(data) });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
            throw new Error(errorData.detail || `HTTP ${response.status}`);
        }
        
        closeModal('admin-seller-modal');
        loadAdminSellers();
        alert('Sotuvchi muvaffaqiyatli saqlandi!');
    } catch (error) {
        alert('Xatolik: ' + error.message);
    }
}

function viewAdminSale(id) { 
    viewSaleReceipt(id);
}

function viewAdminOrder(id) { 
    alert(`Buyurtma #${id} ko'rish funksiyasi tez orada qo'shiladi`);
}

// Admin sale approval functions
async function approveAdminSale(saleId) {
    if (!confirm('Sotuvni tasdiqlaysizmi?')) return;
    
    try {
        const token = currentToken || localStorage.getItem('seller_token');
        const sellerId = localStorage.getItem('seller_id');
        const headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (sellerId) headers['X-Seller-ID'] = sellerId;
        
        const formData = new URLSearchParams();
        formData.append('approved', 'true');
        formData.append('admin_id', sellerId);
        
        const response = await fetch(`${API_BASE}/sales/${saleId}/approve`, {
            method: 'POST',
            headers,
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Tasdiqlashda xatolik');
        }
        
        alert('Sotuv muvaffaqiyatli tasdiqlandi!');
        loadAdminSales();
    } catch (error) {
        console.error('Error approving sale:', error);
        alert('Xatolik: ' + error.message);
    }
}

async function rejectAdminSale(saleId) {
    if (!confirm('Sotuvni rad etasizmi?')) return;
    
    try {
        const token = currentToken || localStorage.getItem('seller_token');
        const sellerId = localStorage.getItem('seller_id');
        const headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (sellerId) headers['X-Seller-ID'] = sellerId;
        
        const formData = new URLSearchParams();
        formData.append('approved', 'false');
        formData.append('admin_id', sellerId);
        
        const response = await fetch(`${API_BASE}/sales/${saleId}/approve`, {
            method: 'POST',
            headers,
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Rad etishda xatolik');
        }
        
        alert('Sotuv rad etildi!');
        loadAdminSales();
    } catch (error) {
        console.error('Error rejecting sale:', error);
        alert('Xatolik: ' + error.message);
    }
}

async function updateAdminOrderStatus(orderId) {
    const newStatus = prompt('Yangi status kiriting (pending, processing, completed, cancelled):');
    if (!newStatus) return;
    
    if (!['pending', 'processing', 'completed', 'cancelled'].includes(newStatus)) {
        alert('Noto\'g\'ri status! Faqat: pending, processing, completed, cancelled');
        return;
    }
    
    try {
        const token = currentToken || localStorage.getItem('seller_token');
        const sellerId = localStorage.getItem('seller_id');
        const headers = {
            'Content-Type': 'application/json'
        };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (sellerId) headers['X-Seller-ID'] = sellerId;
        
        const response = await fetch(`${API_BASE}/orders/${orderId}/status`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({ status: newStatus })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Status o\'zgartirishda xatolik');
        }
        
        alert('Status muvaffaqiyatli o\'zgartirildi!');
        loadAdminOrders();
    } catch (error) {
        console.error('Error updating order status:', error);
        alert('Xatolik: ' + error.message);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded - Seller Panel'); // Debug log
    
    // Login form event listener
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
        console.log('Login form event listener added');
    } else {
        console.error('Login form not found!');
    }
    
    // new-sale-form submit handler is now in sale-functions.js (completeSale)
    // Form has onsubmit handler in HTML
    setupNavigation();
    
    // Check authentication
    console.log('Calling checkAuth...');
    checkAuth();
    
    // Admin product image URL preview
    const adminImageUrlInput = document.getElementById('admin-product-image-url');
    if (adminImageUrlInput) {
        adminImageUrlInput.addEventListener('input', (e) => {
            updateAdminProductImagePreview(e.target.value);
        });
    }
    
    // Initialize sale page when shown
    document.querySelector('.nav-item[data-page="new-sale"]')?.addEventListener('click', () => {
        if (userPermissions.includes('sales.create')) {
            // Wait for sale-functions.js to load
            setTimeout(() => {
                if (typeof window.initSalePage === 'function') {
                    window.initSalePage();
                } else if (typeof initSalePage === 'function') {
                    initSalePage();
                } else {
                    console.error('initSalePage function not found');
                }
            }, 100);
        }
    });
});
