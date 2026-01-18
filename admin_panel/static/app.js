const API_BASE = '/api';
let map = null;
let salesChart = null;

// loadSellersMarkers will be assigned after function declaration

// Utility function to escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Format date in Uzbekistan timezone (UTC+5)
function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    
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

// Pagination state
let currentProductPage = 1;
let currentCustomerPage = 1;
let currentSalePage = 1;
let productsPerPage = 20;
let customersPerPage = 20;
let salesPerPage = 20;
let totalProducts = 0;
let totalCustomers = 0;
let totalSales = 0;

// Selected products for bulk operations
let selectedProducts = new Set();

// Authentication state
let currentAdminToken = null;
let currentAdminUser = null;

// Check authentication on page load
function checkAuth() {
    const token = localStorage.getItem('admin_token');
    if (token) {
        currentAdminToken = token;
        verifyAdminAuth(); // Async function, but we don't await it here
    } else {
        showLogin();
    }
}

async function verifyAdminAuth() {
    try {
        const response = await fetch(`${API_BASE}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${currentAdminToken}`,
                'X-Seller-ID': localStorage.getItem('admin_seller_id') || ''
            }
        });
        
        if (response.ok) {
            const user = await response.json();
            // Check if user has admin permissions (has admin role or specific permissions)
            const hasAdminAccess = user.role_name?.toLowerCase().includes('admin') || 
                                  user.permissions?.includes('admin.settings') ||
                                  user.permissions?.includes('admin.sellers');
            
            if (hasAdminAccess) {
                currentAdminUser = user;
                showAdminPanel();
            } else {
                alert('Sizda admin panelga kirish uchun ruxsat yo\'q. Faqat admin rolli foydalanuvchilar kirishi mumkin.');
                logout();
            }
        } else {
            logout();
        }
    } catch (error) {
        console.error('Auth verification error:', error);
        logout();
    }
}

function showLogin() {
    document.getElementById('login-page').style.display = 'flex';
    document.getElementById('admin-panel').style.display = 'none';
}

function showAdminPanel() {
    document.getElementById('login-page').style.display = 'none';
    document.getElementById('admin-panel').style.display = 'flex';
}

async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    const errorDiv = document.getElementById('login-error');
    
    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (data.success && data.token) {
            // Check if user has admin access
            const hasAdminAccess = data.role_name?.toLowerCase().includes('admin') || 
                                  data.permissions?.includes('admin.settings') ||
                                  data.permissions?.includes('admin.sellers');
            
            if (hasAdminAccess) {
                currentAdminToken = data.token;
                currentAdminUser = {
                    id: data.seller_id,
                    name: data.seller_name,
                    role_name: data.role_name,
                    permissions: data.permissions || []
                };
                
                localStorage.setItem('admin_token', data.token);
                localStorage.setItem('admin_seller_id', data.seller_id.toString());
                
                showAdminPanel();
                setupNavigation();
                loadDashboard();
                setupWebSocket();
            } else {
                errorDiv.textContent = 'Sizda admin panelga kirish uchun ruxsat yo\'q. Faqat admin rolli foydalanuvchilar kirishi mumkin.';
                errorDiv.style.display = 'block';
            }
        } else {
            errorDiv.textContent = data.message || 'Noto\'g\'ri login yoki parol';
            errorDiv.style.display = 'block';
        }
    } catch (error) {
        errorDiv.textContent = 'Xatolik yuz berdi. Qayta urinib ko\'ring.';
        errorDiv.style.display = 'block';
        console.error('Login error:', error);
    }
}

function showAdminPanel() {
    document.getElementById('login-page').style.display = 'none';
    document.getElementById('admin-panel').style.display = 'flex';
    
    // Update admin name in sidebar
    const adminNameEl = document.getElementById('admin-user-name');
    if (adminNameEl && currentAdminUser) {
        adminNameEl.textContent = currentAdminUser.name || 'Admin';
    }
}

// Helper function to get auth headers
function getAuthHeaders() {
    const headers = {};
    if (currentAdminToken) {
        headers['Authorization'] = `Bearer ${currentAdminToken}`;
    }
    const sellerId = localStorage.getItem('admin_seller_id');
    if (sellerId) {
        headers['X-Seller-ID'] = sellerId;
    }
    return headers;
}

function logout() {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_seller_id');
    currentAdminToken = null;
    currentAdminUser = null;
    showLogin();
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Setup login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Check authentication
    checkAuth();
});

// Navigation
function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            showPage(page);
        });
    });
}

function showPage(pageName) {
    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === pageName) {
            item.classList.add('active');
        }
    });

    // Update pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageName).classList.add('active');

    // Load page data
    switch(pageName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'products':
            loadProducts();
            // Initialize barcode scanner after page loads
            setTimeout(() => {
                initAdminProductBarcodeScanner();
            }, 300);
            break;
        case 'customers':
            loadCustomers();
            break;
        case 'orders':
            loadCustomersForOrderFilter();
            loadOrders();
            break;
        case 'sellers':
            loadSellers();
            break;
        case 'gps':
            // Wait a bit for page to be visible, then load map
            setTimeout(() => {
                loadGPSMap();
            }, 100);
            break;
        case 'sales':
            loadSellersForFilter();
            loadCustomersForSaleFilter();
            loadSales();
            loadPendingSalesCount();
            break;
        case 'roles':
            loadRoles();
            loadAllPermissions();
            break;
        case 'audit-logs':
            loadAuditLogs();
            break;
        case 'settings':
            loadSettings();
            break;
    }
}

// Dashboard
async function loadDashboard() {
    try {
        const [products, orders, sales, customers] = await Promise.all([
            fetch(`${API_BASE}/products?limit=1`).then(r => r.json()).then(async (data) => {
                const count = await fetch(`${API_BASE}/products/count`).then(r => r.json());
                return { length: count.count || 0, data };
            }).catch(e => ({ length: 0, data: [] })),
            fetch(`${API_BASE}/orders?limit=1`).then(r => r.json()).then(data => ({ length: data.length || 0 })).catch(e => ({ length: 0 })),
            fetch(`${API_BASE}/sales?limit=1`).then(r => r.json()).then(data => ({ length: data.length || 0 })).catch(e => ({ length: 0 })),
            fetch(`${API_BASE}/customers?limit=1`).then(r => r.json()).then(async (data) => {
                const count = await fetch(`${API_BASE}/customers/count`).then(r => r.json());
                return { length: count.count || 0, data };
            }).catch(e => ({ length: 0, data: [] }))
        ]);

        if (document.getElementById('total-products')) {
            // products.length contains the count from /api/products/count
            document.getElementById('total-products').textContent = products.length || 0;
        }
        if (document.getElementById('total-orders')) {
            document.getElementById('total-orders').textContent = orders.length || 0;
        }
        // Note: total-sales will be updated from statistics endpoint below
        // Initial value from sales.length is not accurate (only fetches limit=1)
        if (document.getElementById('total-customers')) {
            document.getElementById('total-customers').textContent = customers.length || 0;
        }

        // Load detailed statistics with period filter
        const period = document.getElementById('dashboard-period')?.value || '';
        let url = `${API_BASE}/statistics`;
        if (period) {
            url += `?period=${period}`;
        } else {
            const endDate = new Date().toISOString();
            const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
            url += `?start_date=${startDate}&end_date=${endDate}`;
        }
        const stats = await fetch(url).then(r => r.json()).catch(e => {
            console.error('Error loading statistics:', e);
            return {};
        });
        
        // Load inventory value and statistics
        try {
            const inventoryValue = await fetch(`${API_BASE}/inventory/value`).then(r => r.json());
            if (document.getElementById('inventory-value-by-cost')) {
                document.getElementById('inventory-value-by-cost').textContent = formatMoney(inventoryValue.total_value_by_cost || 0);
            }
            if (document.getElementById('inventory-value-by-wholesale')) {
                document.getElementById('inventory-value-by-wholesale').textContent = formatMoney(inventoryValue.total_value_by_wholesale || 0);
            }
            // Display total packages and pieces
            if (document.getElementById('total-packages')) {
                document.getElementById('total-packages').textContent = inventoryValue.total_packages || 0;
            }
            if (document.getElementById('total-pieces')) {
                document.getElementById('total-pieces').textContent = inventoryValue.total_pieces || 0;
            }
            // Update total products count from inventory stats (more accurate)
            if (document.getElementById('total-products') && inventoryValue.total_products) {
                document.getElementById('total-products').textContent = inventoryValue.total_products;
            }
        } catch (e) {
            console.error('Error loading inventory value:', e);
            if (document.getElementById('inventory-value-by-cost')) {
                document.getElementById('inventory-value-by-cost').textContent = formatMoney(0);
            }
            if (document.getElementById('inventory-value-by-wholesale')) {
                document.getElementById('inventory-value-by-wholesale').textContent = formatMoney(0);
            }
            if (document.getElementById('total-packages')) {
                document.getElementById('total-packages').textContent = '0';
            }
            if (document.getElementById('total-pieces')) {
                document.getElementById('total-pieces').textContent = '0';
            }
        }
        
        // Load total debt
        try {
            const totalDebt = await fetch(`${API_BASE}/debt/total`).then(r => r.json());
            if (document.getElementById('total-debt')) {
                document.getElementById('total-debt').textContent = formatMoney(totalDebt.total_debt || 0);
            }
        } catch (e) {
            console.error('Error loading total debt:', e);
            if (document.getElementById('total-debt')) {
                document.getElementById('total-debt').textContent = formatMoney(0);
            }
        }
        
        // Display profit statistics and total sales count
        console.log('Statistics loaded:', stats);
        if (stats) {
            // Update total sales count from statistics (accurate count)
            if (document.getElementById('total-sales')) {
                const totalSalesCount = stats.total_sales !== undefined ? stats.total_sales : 0;
                document.getElementById('total-sales').textContent = totalSalesCount;
                console.log('Total sales count updated from statistics:', totalSalesCount);
            }
            
            // Update total profit
            if (document.getElementById('total-profit')) {
                const profit = stats.total_profit !== undefined ? stats.total_profit : 0;
                document.getElementById('total-profit').textContent = formatMoney(profit);
                console.log('Profit displayed:', profit);
            }
        } else {
            console.error('Statistics not loaded');
            if (document.getElementById('total-sales')) {
                document.getElementById('total-sales').textContent = 0;
            }
            if (document.getElementById('total-profit')) {
                document.getElementById('total-profit').textContent = formatMoney(0);
            }
        }
        
        // Display payment method statistics
        if (stats.payment_methods) {
            const pm = stats.payment_methods;
            if (document.getElementById('cash-amount')) {
                document.getElementById('cash-amount').textContent = formatMoney(pm.cash?.amount || 0);
            }
            if (document.getElementById('card-amount')) {
                document.getElementById('card-amount').textContent = formatMoney(pm.card?.amount || 0);
            }
            if (document.getElementById('bank-transfer-amount')) {
                document.getElementById('bank-transfer-amount').textContent = formatMoney(pm.bank_transfer?.amount || 0);
            }
        }
        
        // Load all sales for chart
        try {
            const allSales = await fetch(`${API_BASE}/sales?limit=1000`).then(r => r.json()).catch(e => []);
            updateSalesChart(allSales || []);
        } catch (e) {
            console.error('Error loading sales for chart:', e);
        }
        
        // Update top products and customers
        if (stats.top_products && stats.top_products.length > 0) {
            if (document.getElementById('top-products-count')) {
                document.getElementById('top-products-count').textContent = stats.top_products.length;
            }
            const tbody = document.getElementById('top-products-tbody');
            if (tbody) {
                tbody.innerHTML = '';
                stats.top_products.slice(0, 10).forEach(p => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${p.name}</td>
                        <td>${p.quantity} dona</td>
                        <td>${formatMoney(p.amount)}</td>
                    `;
                    tbody.appendChild(row);
                });
            }
        }
        
        if (stats.top_customers && stats.top_customers.length > 0) {
            if (document.getElementById('top-customers-count')) {
                document.getElementById('top-customers-count').textContent = stats.top_customers.length;
            }
            const tbody = document.getElementById('top-customers-tbody');
            if (tbody) {
                tbody.innerHTML = '';
                stats.top_customers.slice(0, 10).forEach(c => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${c.name}</td>
                        <td>${c.count} ta</td>
                        <td>${formatMoney(c.amount)}</td>
                    `;
                    tbody.appendChild(row);
                });
            }
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
        alert('Dashboard ma\'lumotlarini yuklashda xatolik yuz berdi: ' + error.message);
    }
}

function updateSalesChart(sales) {
    const ctx = document.getElementById('salesChart');
    if (!ctx) return;

    if (salesChart) {
        salesChart.destroy();
    }

    // Group sales by date
    const salesByDate = {};
    sales.forEach(sale => {
        const date = new Date(sale.created_at).toLocaleString('uz-UZ', {
            timeZone: 'Asia/Tashkent',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
        salesByDate[date] = (salesByDate[date] || 0) + sale.total_amount;
    });

    salesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Object.keys(salesByDate),
            datasets: [{
                label: 'Sotuvlar (so\'m)',
                data: Object.values(salesByDate),
                borderColor: '#4f46e5',
                backgroundColor: 'rgba(79, 70, 229, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: true
                }
            }
        }
    });
}

// Products
let productFilterTimeout;
let adminProductBarcodeScanner = null;

function handleProductFilterChange() {
    clearTimeout(productFilterTimeout);
    productFilterTimeout = setTimeout(() => {
        currentProductPage = 1; // Reset to first page when filter changes
        loadProducts();
    }, 500); // Debounce 500ms
}

// Initialize barcode scanner for admin products page
function initAdminProductBarcodeScanner() {
    const searchInput = document.getElementById('product-search');
    if (!searchInput || !window.BarcodeScanner) {
        console.warn('Barcode scanner not available or input not found');
        return;
    }
    
    // Detach previous scanner if exists
    if (adminProductBarcodeScanner) {
        adminProductBarcodeScanner.detach();
    }
    
    // Create new scanner instance
    adminProductBarcodeScanner = new window.BarcodeScanner({
        minLength: 3,
        maxLength: 50,
        timeout: 100,
        onScan: (barcode) => {
            console.log('Admin: Barcode scanned:', barcode);
            // Set search input value and trigger search
            searchInput.value = barcode;
            handleProductSearch();
        }
    });
    
    // Attach to search input
    adminProductBarcodeScanner.attach(searchInput);
    console.log('Admin product barcode scanner initialized');
}

function clearProductFilters() {
    document.getElementById('product-search').value = '';
    document.getElementById('product-brand-filter').value = '';
    document.getElementById('product-supplier-filter').value = '';
    document.getElementById('product-location-filter').value = '';
    document.getElementById('stock-filter').value = 'all';
    currentProductPage = 1;
    loadProducts();
}

async function loadProducts() {
    try {
        const search = document.getElementById('product-search')?.value || '';
        const brand = document.getElementById('product-brand-filter')?.value || '';
        const supplier = document.getElementById('product-supplier-filter')?.value || '';
        const location = document.getElementById('product-location-filter')?.value || '';
        const stockFilter = document.getElementById('stock-filter')?.value || 'all';
        const sortValue = document.getElementById('product-sort')?.value || '';
        const skip = (currentProductPage - 1) * productsPerPage;
        
        // Parse sort value (format: "field_order" e.g., "name_asc", "stock_desc")
        // Default: omborda borlar birinchi (stock desc), keyin yo'qlari
        let sortBy = null;
        let sortOrder = 'desc';
        if (sortValue) {
            const [field, order] = sortValue.split('_');
            sortBy = field;
            sortOrder = order || 'desc';
        } else {
            // Default sorting: omborda borlar birinchi (stock desc)
            sortBy = 'stock';
            sortOrder = 'desc';
        }
        
        // Build URL with all filters
        const params = new URLSearchParams();
        params.append('skip', skip);
        params.append('limit', productsPerPage);
        
        if (search) params.append('search', search);
        if (brand) params.append('brand', brand);
        if (supplier) params.append('supplier', supplier);
        if (location) params.append('location', location);
        if (sortBy) {
            params.append('sort_by', sortBy);
            params.append('sort_order', sortOrder);
        }
        
        let lowStockOnly = false;
        let minStock = 0;
        if (stockFilter === 'low') {
            lowStockOnly = true;
            minStock = 10;
            params.append('low_stock_only', 'true');
            params.append('min_stock', '10');
        } else if (stockFilter === 'very-low') {
            lowStockOnly = true;
            minStock = 5;
            params.append('low_stock_only', 'true');
            params.append('min_stock', '5');
        } else if (stockFilter === 'out') {
            lowStockOnly = true;
            minStock = 0;
            params.append('low_stock_only', 'true');
            params.append('min_stock', '0');
        }
        
        // Build count URL with same filters
        const countParams = new URLSearchParams();
        if (search) countParams.append('search', search);
        if (brand) countParams.append('brand', brand);
        if (supplier) countParams.append('supplier', supplier);
        if (location) countParams.append('location', location);
        if (lowStockOnly) {
            countParams.append('low_stock_only', 'true');
            countParams.append('min_stock', minStock.toString());
        }
        
        const [productsResponse, countData] = await Promise.all([
            fetch(`${API_BASE}/products?${params.toString()}`).then(r => {
                if (!r.ok) {
                    throw new Error(`HTTP error! status: ${r.status}`);
                }
                return r.json();
            }).catch(e => {
                console.error('Error fetching products:', e);
                return [];
            }),
            fetch(`${API_BASE}/products/count?${countParams.toString()}`).then(r => r.json()).catch(e => {
                console.error('Error fetching products count:', e);
                return { count: 0 };
            })
        ]);
        
        const products = Array.isArray(productsResponse) ? productsResponse : [];
        totalProducts = countData.count || 0;
        const tbody = document.getElementById('products-tbody');
        if (!tbody) {
            console.error('products-tbody element not found');
            return;
        }
        tbody.innerHTML = '';
        selectedProducts.clear();
        updateBulkDeleteButton();

        if (products.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `<td colspan="15" style="text-align: center; padding: 2rem; color: var(--text-light);">Mahsulotlar topilmadi</td>`;
            tbody.appendChild(row);
            return;
        }

        products.forEach(product => {
            const row = document.createElement('tr');
            // Calculate total_pieces correctly (same as backend)
            const packagesInStock = product.packages_in_stock || 0;
            const piecesInStock = product.pieces_in_stock || 0;
            const piecesPerPackage = product.pieces_per_package && product.pieces_per_package > 0 ? product.pieces_per_package : 1;
            const calculatedTotalPieces = (packagesInStock * piecesPerPackage) + piecesInStock;
            // Use calculated value if product.total_pieces is not available or seems incorrect
            const totalPieces = (product.total_pieces !== undefined && product.total_pieces !== null && product.total_pieces > 0) 
                ? product.total_pieces 
                : calculatedTotalPieces;
            // Only show warning/error badge if stock is actually low (<= 10) or out (0)
            const stockClass = totalPieces === 0 ? 'badge-danger' : totalPieces <= 10 ? 'badge-warning' : '';
            
            // Check if product is slow moving (not sold for 30+ days)
            const isSlowMoving = product.is_slow_moving || (product.days_since_last_sale && product.days_since_last_sale >= 30);
            if (isSlowMoving) {
                row.style.backgroundColor = '#fff9e6'; // Sariq rang (light yellow)
                row.style.borderLeft = '4px solid #ffc107'; // Sariq chekka
            }
            
            // Fix image URL to use absolute path
            let imageUrl = product.image_url;
            // Fix: Remove 'undefined' or 'null' strings and empty values
            if (!imageUrl || imageUrl === 'undefined' || imageUrl === 'null' || imageUrl.trim() === '') {
                imageUrl = null;
            } else {
                if (imageUrl.startsWith('/uploads')) {
                    // Already correct path - add protocol and host for absolute URL
                    imageUrl = window.location.origin + imageUrl;
                } else if (imageUrl.startsWith('http')) {
                    // External URL - keep as is
                } else if (imageUrl.startsWith('/')) {
                    // Absolute path - add origin
                    imageUrl = window.location.origin + imageUrl;
                } else {
                    // Relative path - make absolute
                    imageUrl = window.location.origin + '/uploads/products/' + imageUrl;
                }
            }
            // Create image cell separately to avoid quote escaping issues
            row.innerHTML = `
                <td><input type="checkbox" class="product-checkbox" value="${product.id}" onchange="toggleProductSelection(${product.id})"></td>
                <td>${product.id}</td>
                <td class="product-image-cell"></td>
                <td>${escapeHtml(product.name)}</td>
                <td>${escapeHtml(product.barcode || '-')}</td>
                <td>${product.pieces_per_package}</td>
                <td>${formatMoney(product.wholesale_price)}</td>
                <td>${formatMoney(product.retail_price)}</td>
                <td>${formatMoney(product.regular_price)}</td>
                <td>${product.packages_in_stock || 0}</td>
                <td>${product.pieces_in_stock || 0}</td>
                <td class="total-pieces-cell" data-product-id="${product.id}" data-pieces-per-package="${product.pieces_per_package}" style="cursor: pointer; position: relative;">
                    <span class="badge ${stockClass} total-pieces-display">${totalPieces}</span>
                    <input type="number" class="total-pieces-input" value="${totalPieces}" min="0" 
                           style="display: none; width: 80px; padding: 2px 4px; border: 2px solid #4f46e5; border-radius: 4px; font-size: 0.875rem;"
                           onblur="saveTotalPiecesInline(${product.id}, this)" 
                           onkeypress="if(event.key==='Enter') { this.blur(); }">
                </td>
                <td class="product-location-cell"></td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn action-btn-edit" onclick="editProduct(${product.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn action-btn-delete" onclick="deleteProduct(${product.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                        <button class="action-btn action-btn-view" onclick="viewProductBarcode(${product.id})">
                            <i class="fas fa-barcode"></i>
                        </button>
                        <button class="action-btn action-btn-view" onclick="viewProductHistory(${product.id})" title="Sotuv tarixi">
                            <i class="fas fa-history"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
            
            // Setup inline editing for total pieces
            const totalPiecesCell = row.querySelector('.total-pieces-cell');
            const totalPiecesDisplay = row.querySelector('.total-pieces-display');
            const totalPiecesInput = row.querySelector('.total-pieces-input');
            
            if (totalPiecesCell && totalPiecesDisplay && totalPiecesInput) {
                totalPiecesCell.addEventListener('click', function(e) {
                    // Don't trigger if clicking on the input itself
                    if (e.target === totalPiecesInput) return;
                    
                    // Show input, hide display
                    totalPiecesDisplay.style.display = 'none';
                    totalPiecesInput.style.display = 'inline-block';
                    totalPiecesInput.focus();
                    totalPiecesInput.select();
                });
                
                // Restore display if clicking outside (handled by onblur)
            }
            
            // Add location to location cell separately - use product.location directly to avoid closure issues
            const locationCell = row.querySelector('.product-location-cell');
            if (locationCell) {
                // Get location value directly from product object for this iteration
                const currentProductLocation = product.location;
                if (currentProductLocation && currentProductLocation.trim() !== '') {
                    locationCell.textContent = currentProductLocation;
                    if (isSlowMoving) {
                        const warningSpan = document.createElement('span');
                        warningSpan.style.cssText = 'color: #ff9800; font-weight: bold; margin-left: 5px;';
                        warningSpan.title = `Uzoq vaqt sotilmagan (${product.days_since_last_sale || 0} kun)`;
                        warningSpan.textContent = '⚠';
                        locationCell.appendChild(warningSpan);
                    }
                } else {
                    locationCell.textContent = '-';
                }
            }
            
            // Add image to the image cell separately to avoid quote escaping issues
            const imageCell = row.querySelector('.product-image-cell');
            // Fix: Show image if imageUrl exists, even if product.image_url is null (for newly uploaded images)
            if (imageUrl) {
                const img = document.createElement('img');
                img.src = imageUrl;
                img.alt = product.name || '';
                img.style.cssText = 'width: 60px; height: 60px; object-fit: cover; border-radius: 4px; border: 1px solid var(--border-color); cursor: pointer;';
                img.title = 'Kattalashtirish uchun bosing';
                img.onclick = function() {
                    // Show larger image in modal
                    const modal = document.createElement('div');
                    modal.className = 'modal';
                    modal.style.display = 'flex';
                    modal.style.alignItems = 'center';
                    modal.style.justifyContent = 'center';
                    modal.onclick = function(e) {
                        if (e.target === modal) {
                            modal.remove();
                        }
                    };
                    const imgLarge = document.createElement('img');
                    imgLarge.src = imageUrl;
                    imgLarge.style.cssText = 'max-width: 80%; max-height: 80%; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);';
                    modal.appendChild(imgLarge);
                    document.body.appendChild(modal);
                };
                img.onerror = function() {
                    this.onerror = null;
                    this.style.display = 'none';
                    const span = document.createElement('span');
                    span.style.cssText = 'color: var(--text-light); font-size: 0.8em;';
                    span.textContent = 'Rasm yo\'q';
                    this.parentNode.replaceChild(span, this);
                };
                img.onload = function() {
                    console.log('Image loaded:', imageUrl);
                };
                imageCell.appendChild(img);
            } else {
                const span = document.createElement('span');
                span.style.color = 'var(--text-light)';
                span.textContent = '-';
                imageCell.appendChild(span);
            }
        });
        
        renderPagination('products-pagination', currentProductPage, productsPerPage, totalProducts, (page) => {
            currentProductPage = page;
            loadProducts();
        });
        
        // Show low stock warning (calculate total_pieces correctly)
        const lowStockProducts = products.filter(p => {
            const packagesInStock = p.packages_in_stock || 0;
            const piecesInStock = p.pieces_in_stock || 0;
            const piecesPerPackage = p.pieces_per_package && p.pieces_per_package > 0 ? p.pieces_per_package : 1;
            const calculatedTotalPieces = (packagesInStock * piecesPerPackage) + piecesInStock;
            const totalPieces = (p.total_pieces !== undefined && p.total_pieces !== null && p.total_pieces > 0) 
                ? p.total_pieces 
                : calculatedTotalPieces;
            return totalPieces <= 10;
        });
        if (lowStockProducts.length > 0 && stockFilter === 'all') {
            showLowStockWarning(lowStockProducts.length);
        } else {
            hideLowStockWarning();
        }
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

let searchTimeout;
function handleProductSearch() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        currentProductPage = 1;
        loadProducts();
    }, 500);
}

function toggleProductSelection(productId) {
    if (selectedProducts.has(productId)) {
        selectedProducts.delete(productId);
    } else {
        selectedProducts.add(productId);
    }
    updateBulkDeleteButton();
}

function toggleSelectAllProducts() {
    const checkbox = document.getElementById('select-all-products');
    const checkboxes = document.querySelectorAll('.product-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = checkbox.checked;
        if (checkbox.checked) {
            selectedProducts.add(parseInt(cb.value));
        } else {
            selectedProducts.delete(parseInt(cb.value));
        }
    });
    updateBulkDeleteButton();
}

function updateBulkDeleteButton() {
    const btn = document.getElementById('bulk-delete-btn');
    const count = document.getElementById('selected-count');
    if (btn && count) {
        if (selectedProducts.size > 0) {
            btn.style.display = 'inline-flex';
            count.textContent = selectedProducts.size;
        } else {
            btn.style.display = 'none';
        }
    }
}

async function bulkDeleteProducts() {
    if (selectedProducts.size === 0) return;
    if (!confirm(`${selectedProducts.size} ta mahsulotni o'chirishni xohlaysizmi?`)) return;
    
    try {
        const response = await fetch(`${API_BASE}/products/bulk-delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(Array.from(selectedProducts))
        });
        const result = await response.json();
        alert(result.message);
        selectedProducts.clear();
        loadProducts();
    } catch (error) {
        alert('Xatolik: ' + error.message);
    }
}

function showLowStockWarning(count) {
    let warning = document.getElementById('low-stock-warning');
    if (!warning) {
        warning = document.createElement('div');
        warning.id = 'low-stock-warning';
        warning.className = 'alert alert-warning';
        const productsPage = document.getElementById('products');
        productsPage.insertBefore(warning, productsPage.querySelector('.table-container'));
    }
    warning.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${count} ta mahsulot omborda kam qolgan (≤10 dona). <a href="#" onclick="document.getElementById('stock-filter').value='low'; loadProducts(); return false;">Ko'rish</a>`;
}

function hideLowStockWarning() {
    const warning = document.getElementById('low-stock-warning');
    if (warning) warning.remove();
}

function printProductsTable() {
    window.print();
}

async function viewProductHistory(productId) {
    try {
        const history = await fetch(`${API_BASE}/products/${productId}/sales-history`).then(r => r.json());
        let historyHtml = '<h2>Sotuv tarixi</h2><table><thead><tr><th>Sana</th><th>Mijoz</th><th>Miqdor</th><th>Summa</th></tr></thead><tbody>';
        history.forEach(h => {
            const historyDate = new Date(h.date).toLocaleString('uz-UZ', {
                timeZone: 'Asia/Tashkent',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
            historyHtml += `<tr><td>${historyDate}</td><td>${h.customer_name}</td><td>${h.requested_quantity}</td><td>${formatMoney(h.subtotal)}</td></tr>`;
        });
        historyHtml += '</tbody></table>';
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 800px;">
                <span class="close" onclick="this.parentElement.parentElement.remove()">&times;</span>
                ${historyHtml}
            </div>
        `;
        document.body.appendChild(modal);
    } catch (error) {
        alert('Xatolik: ' + error.message);
    }
}

// Stock calculation functions
function calculatePackagesFromTotal() {
    const totalPiecesInput = document.getElementById('product-total-pieces-input');
    const piecesPerPackageInput = document.getElementById('product-pieces-per-package');
    const packagesInput = document.getElementById('product-packages-in-stock');
    const piecesInput = document.getElementById('product-pieces-in-stock');
    
    if (!totalPiecesInput || !piecesPerPackageInput || !packagesInput || !piecesInput) return;
    
    const totalPieces = parseInt(totalPiecesInput.value) || 0;
    const piecesPerPackage = parseInt(piecesPerPackageInput.value) || 1;
    
    if (piecesPerPackage <= 0) {
        alert('1 qopdagi dona soni 0 dan katta bo\'lishi kerak!');
        return;
    }
    
    // Calculate packages and remaining pieces
    const packages = Math.floor(totalPieces / piecesPerPackage);
    const pieces = totalPieces % piecesPerPackage;
    
    packagesInput.value = packages;
    piecesInput.value = pieces;
}

function recalculateStock() {
    // When packages or pieces are changed manually, clear total input
    const totalPiecesInput = document.getElementById('product-total-pieces-input');
    if (totalPiecesInput) {
        // Don't clear, but update total
        updateTotalFromPackagesAndPieces();
    }
}

function updateTotalFromPackagesAndPieces() {
    const packagesInput = document.getElementById('product-packages-in-stock');
    const piecesInput = document.getElementById('product-pieces-in-stock');
    const piecesPerPackageInput = document.getElementById('product-pieces-per-package');
    const totalPiecesInput = document.getElementById('product-total-pieces-input');
    
    if (!packagesInput || !piecesInput || !piecesPerPackageInput || !totalPiecesInput) return;
    
    const packages = parseInt(packagesInput.value) || 0;
    const pieces = parseInt(piecesInput.value) || 0;
    const piecesPerPackage = parseInt(piecesPerPackageInput.value) || 1;
    
    const total = (packages * piecesPerPackage) + pieces;
    totalPiecesInput.value = total;
}

function updateStockFromTotal() {
    // When pieces_per_package changes, recalculate if total is set
    const totalPiecesInput = document.getElementById('product-total-pieces-input');
    if (totalPiecesInput && totalPiecesInput.value && parseInt(totalPiecesInput.value) > 0) {
        calculatePackagesFromTotal();
    }
}

function generateBarcode() {
    // Generate a random barcode (EAN-13 format: 13 digits)
    const randomBarcode = '2' + Math.floor(100000000000 + Math.random() * 900000000000).toString();
    document.getElementById('product-barcode').value = randomBarcode;
}

function showAddProductModal() {
    document.getElementById('product-modal-title').textContent = 'Yangi Mahsulot';
    document.getElementById('product-form').reset();
    document.getElementById('product-id').value = '';
    document.getElementById('product-barcode').value = '';
    document.getElementById('product-image-url').value = '';
    document.getElementById('product-total-pieces-input').value = '0';
    updateProductImagePreview('');
    document.getElementById('product-modal').style.display = 'block';
}

async function editProduct(id) {
    try {
        const product = await fetch(`${API_BASE}/products/${id}`).then(r => r.json());
        document.getElementById('product-modal-title').textContent = 'Mahsulotni Tahrirlash';
        document.getElementById('product-id').value = product.id;
        document.getElementById('product-name').value = product.name;
        document.getElementById('product-barcode').value = product.barcode || '';
        document.getElementById('product-brand').value = product.brand || '';
        document.getElementById('product-supplier').value = product.supplier || '';
        document.getElementById('product-location').value = product.location || '';
        // Fix image URL if needed
        let imageUrl = product.image_url || '';
        if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('/')) {
            imageUrl = '/' + imageUrl;
        }
        document.getElementById('product-image-url').value = imageUrl;
        updateProductImagePreview(imageUrl);
        if (product.received_date) {
            const date = new Date(product.received_date);
            document.getElementById('product-received-date').value = date.toISOString().split('T')[0];
        } else {
            document.getElementById('product-received-date').value = '';
        }
        document.getElementById('product-pieces-per-package').value = product.pieces_per_package;
        document.getElementById('product-cost-price').value = product.cost_price || 0;
        document.getElementById('product-wholesale-price').value = product.wholesale_price || 0;
        document.getElementById('product-retail-price').value = product.retail_price || 0;
        document.getElementById('product-regular-price').value = product.regular_price || 0;
        document.getElementById('product-packages-in-stock').value = product.packages_in_stock;
        document.getElementById('product-pieces-in-stock').value = product.pieces_in_stock;
        document.getElementById('product-modal').style.display = 'block';
    } catch (error) {
        alert('Xatolik: ' + error.message);
    }
}

async function handleProductImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        // Get auth headers including X-Seller-ID
        const headers = getAuthHeaders();
        // Don't set Content-Type for FormData - browser will set it with boundary
        const response = await fetch(`${API_BASE}/products/upload-image`, {
            method: 'POST',
            headers: headers,
            body: formData
        });
        
        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            throw new Error(`Server error: ${response.status} ${errorText}`);
        }
        
        const result = await response.json();
        
        if (result.url) {
            document.getElementById('product-image-url').value = result.url;
            updateProductImagePreview(result.url);
        } else {
            throw new Error('Server response missing URL');
        }
    } catch (error) {
        console.error('Image upload error:', error);
        alert('Rasm yuklashda xatolik: ' + error.message);
    }
}

function updateProductImagePreview(imageUrl) {
    const preview = document.getElementById('product-image-preview');
    if (!preview) return;
    if (imageUrl && imageUrl.trim()) {
        // Fix URL if needed - ensure it's absolute path
        let url = imageUrl;
        if (url.startsWith('/uploads')) {
            // Add origin for absolute URL
            url = window.location.origin + url;
        } else if (url.startsWith('http')) {
            // External URL - keep as is
        } else if (url.startsWith('/')) {
            // Absolute path - add origin
            url = window.location.origin + url;
        } else {
            // Relative path - make absolute
            url = window.location.origin + '/' + url;
        }
        const img = document.createElement('img');
        img.src = url;
        img.alt = 'Preview';
        img.style.cssText = 'max-width: 200px; max-height: 200px; border-radius: 4px; margin-top: 0.5rem; border: 1px solid var(--border-color);';
        img.onerror = function() {
            this.onerror = null;
            const parent = this.parentElement;
            if (parent) {
                const span = document.createElement('span');
                span.style.color = 'red';
                span.textContent = 'Rasm yuklanmadi';
                try {
                    parent.replaceChild(span, this);
                } catch (e) {
                    // If replaceChild fails, just clear and show error
                    parent.innerHTML = '<span style="color: red;">Rasm yuklanmadi</span>';
                }
            }
        };
        preview.innerHTML = '';
        preview.appendChild(img);
    } else {
        preview.innerHTML = '';
    }
}

// Image URL change handler
document.addEventListener('DOMContentLoaded', () => {
    const imageUrlInput = document.getElementById('product-image-url');
    if (imageUrlInput) {
        imageUrlInput.addEventListener('input', (e) => {
            updateProductImagePreview(e.target.value);
        });
    }
});

async function saveProduct(e) {
    e.preventDefault();
    const id = document.getElementById('product-id').value;
    const receivedDate = document.getElementById('product-received-date').value;
    let imageUrl = document.getElementById('product-image-url').value.trim();
    
    // Fix: Convert "undefined" string to null, and empty strings to null
    if (!imageUrl || imageUrl === '' || imageUrl === 'undefined' || imageUrl === 'null') {
        imageUrl = null;
    }
    
    // Get location and trim it, set to null if empty
    const locationInput = document.getElementById('product-location');
    const locationValue = locationInput ? locationInput.value.trim() : '';
    const location = locationValue === '' ? null : locationValue;
    
    // Get stock values with proper parsing
    const packagesInStockInput = document.getElementById('product-packages-in-stock');
    const piecesInStockInput = document.getElementById('product-pieces-in-stock');
    const packagesInStockValue = packagesInStockInput ? packagesInStockInput.value : '0';
    const piecesInStockValue = piecesInStockInput ? piecesInStockInput.value : '0';
    const packagesInStock = packagesInStockValue === '' ? 0 : parseInt(packagesInStockValue) || 0;
    const piecesInStock = piecesInStockValue === '' ? 0 : parseInt(piecesInStockValue) || 0;
    
    // Prepare data object - only include fields that should be updated
    const data = {};
    
    // Always include these required fields
    data.name = document.getElementById('product-name').value;
    
    // Validate pieces_per_package - must be at least 1
    const piecesPerPackageInput = document.getElementById('product-pieces-per-package').value;
    const piecesPerPackage = parseInt(piecesPerPackageInput);
    if (!piecesPerPackage || piecesPerPackage <= 0 || isNaN(piecesPerPackage)) {
        alert('Xatolik: "Paketdagi donalar soni" kamida 1 bo\'lishi kerak');
        return;
    }
    data.pieces_per_package = piecesPerPackage;
    
    data.cost_price = parseFloat(document.getElementById('product-cost-price').value) || 0;
    data.wholesale_price = parseFloat(document.getElementById('product-wholesale-price').value) || 0;
    data.retail_price = parseFloat(document.getElementById('product-retail-price').value) || 0;
    data.regular_price = parseFloat(document.getElementById('product-regular-price').value) || 0;
    data.packages_in_stock = packagesInStock;
    data.pieces_in_stock = piecesInStock;
    
    // Optional fields - include even if null/empty for update
    if (id) {
        // For update, include all fields explicitly
        data.barcode = document.getElementById('product-barcode').value || null;
        data.brand = document.getElementById('product-brand').value.trim() || null;
        data.supplier = document.getElementById('product-supplier').value.trim() || null;
        data.location = location;
        data.image_url = imageUrl;
        data.received_date = receivedDate ? new Date(receivedDate).toISOString() : null;
    } else {
        // For create, only include if not empty
        const barcodeValue = document.getElementById('product-barcode').value;
        if (barcodeValue) data.barcode = barcodeValue;
        
        const brandValue = document.getElementById('product-brand').value.trim();
        if (brandValue) data.brand = brandValue;
        
        const supplierValue = document.getElementById('product-supplier').value.trim();
        if (supplierValue) data.supplier = supplierValue;
        
        if (location) data.location = location;
        if (imageUrl) data.image_url = imageUrl;
        if (receivedDate) data.received_date = new Date(receivedDate).toISOString();
    }

    try {
        const url = id ? `${API_BASE}/products/${id}` : `${API_BASE}/products`;
        const method = id ? 'PUT' : 'POST';
        
        console.log('Sending product data:', JSON.stringify(data, null, 2));
        
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        console.log('Response status:', response.status, response.statusText);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));
        
        // Get response text first (before checking ok)
        let responseText = '';
        try {
            responseText = await response.text();
            console.log('Response text length:', responseText ? responseText.length : 0);
            console.log('Response text (first 500 chars):', responseText ? responseText.substring(0, 500) : '(empty)');
        } catch (textError) {
            console.error('Error reading response text:', textError);
            responseText = '';
        }
        
        if (!response.ok) {
            let errorData = {};
            let errorMessage = `HTTP ${response.status}: ${response.statusText || 'Unknown error'}`;
            
            if (responseText && responseText.trim()) {
                try {
                    errorData = JSON.parse(responseText);
                    console.error('Parsed error data:', errorData);
                } catch (parseError) {
                    console.error('Failed to parse error response as JSON:', parseError);
                    console.error('Response was:', responseText);
                    // Try to extract error from HTML if it's HTML
                    if (responseText.includes('<title>') || responseText.includes('<html>')) {
                        errorData = { detail: `Server xatolik: HTTP ${response.status} - HTML javob qaytdi` };
                    } else if (responseText.trim()) {
                        // Use response text as error message if it's not JSON
                        errorData = { detail: responseText.trim() };
                    }
                }
            }
            
            // Try multiple error message fields
            errorMessage = errorData.detail || 
                          errorData.message || 
                          errorData.error || 
                          errorData.msg ||
                          (responseText && responseText.trim() ? responseText.trim() : null) ||
                          `HTTP ${response.status}: ${response.statusText || 'Unknown error'}`;
            
            console.error('Final error message:', errorMessage);
            console.error('Full error data:', errorData);
            throw new Error(errorMessage);
        }
        
        // Parse success response
        let result;
        try {
            result = JSON.parse(responseText);
        } catch (parseError) {
            console.error('Failed to parse success response:', parseError);
            throw new Error('Server javobini o\'qib bo\'lmadi');
        }
        
        console.log('Product saved:', result);
        
        closeModal('product-modal');
        loadProducts();
        alert('Mahsulot muvaffaqiyatli saqlandi!');
    } catch (error) {
        console.error('Save product error:', error);
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        alert('Xatolik: ' + (error.message || 'Noma\'lum xatolik'));
    }
}

// Inline editing function for total pieces
async function saveTotalPiecesInline(productId, inputElement) {
    const newTotalPieces = parseInt(inputElement.value) || 0;
    if (newTotalPieces < 0) {
        alert('Jami dona manfiy bo\'lishi mumkin emas!');
        loadProducts(); // Reload to restore original value
        return;
    }
    
    try {
        // Get product details first
        const product = await fetch(`${API_BASE}/products/${productId}`).then(r => r.json());
        const piecesPerPackage = product.pieces_per_package || 1;
        
        // Calculate packages_in_stock and pieces_in_stock from total_pieces
        const packagesInStock = Math.floor(newTotalPieces / piecesPerPackage);
        const piecesInStock = newTotalPieces % piecesPerPackage;
        
        // Update product
        const updateData = {
            packages_in_stock: packagesInStock,
            pieces_in_stock: piecesInStock
        };
        
        const response = await fetch(`${API_BASE}/products/${productId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
            throw new Error(errorData.detail || `HTTP ${response.status}`);
        }
        
        // Update display
        const row = inputElement.closest('tr');
        const displaySpan = row.querySelector('.total-pieces-display');
        if (displaySpan) {
            displaySpan.textContent = newTotalPieces;
            
            // Update badge class based on stock level
            displaySpan.className = 'badge total-pieces-display';
            if (newTotalPieces <= 10) {
                displaySpan.classList.add('badge-danger');
            } else if (newTotalPieces <= 20) {
                displaySpan.classList.add('badge-warning');
            }
        }
        
        // Update packages and pieces cells too
        const packagesCell = row.cells[9]; // Ombordagi qop
        const piecesCell = row.cells[10];  // Ombordagi dona
        if (packagesCell) packagesCell.textContent = packagesInStock;
        if (piecesCell) piecesCell.textContent = piecesInStock;
        
        console.log(`Mahsulot ${productId} jami donasi yangilandi: ${newTotalPieces}`);
    } catch (error) {
        console.error('Inline edit error:', error);
        alert('Xatolik: ' + error.message);
        loadProducts(); // Reload to restore original value
    }
}

async function deleteProduct(id) {
    if (!confirm('Bu mahsulotni o\'chirishni xohlaysizmi?')) return;
    
    try {
        await fetch(`${API_BASE}/products/${id}`, { method: 'DELETE' });
        loadProducts();
    } catch (error) {
        alert('Xatolik: ' + error.message);
    }
}

async function viewProductBarcode(id) {
    try {
        const barcode = await fetch(`${API_BASE}/products/${id}/barcode`).then(r => r.json());
        const img = document.createElement('img');
        img.src = barcode.qr_code;
        img.style.width = '300px';
        img.style.height = '300px';
        alert('QR kod yaratildi!');
        // You can show this in a modal or download it
    } catch (error) {
        alert('Xatolik: ' + error.message);
    }
}

async function exportProducts() {
    try {
        // Show loading
        const loadingAlert = alert('Export bajarilmoqda...');
        
        const sellerId = localStorage.getItem('admin_seller_id');
        const headers = {};
        if (sellerId) {
            headers['X-Seller-ID'] = sellerId;
        }
        
        const response = await fetch(`${API_BASE}/products/export`, {
            headers: headers
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Export xatolik (${response.status}): ${errorText}`);
        }
        
        // Check content type
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/vnd.openxmlformats')) {
            const text = await response.text();
            throw new Error('Noto\'g\'ri javob formati: ' + text);
        }
        
        const blob = await response.blob();
        
        if (blob.size === 0) {
            throw new Error('Export fayli bo\'sh');
        }
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `products_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        alert('Mahsulotlar Excel fayliga export qilindi!');
    } catch (error) {
        console.error('Export error:', error);
        alert('Export xatolik: ' + error.message);
    }
}

function importProducts() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls';
    input.onchange = async function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        if (!file.name.match(/\.(xlsx|xls)$/i)) {
            alert('Faqat Excel fayllari qabul qilinadi (.xlsx, .xls)');
            return;
        }
        
        if (!confirm(`"${file.name}" faylini import qilishni xohlaysizmi?`)) {
            return;
        }
        
        const formData = new FormData();
        formData.append('file', file);
        
        try {
            const response = await fetch(`${API_BASE}/products/import`, {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (response.ok) {
                let message = result.message || `Muvaffaqiyatli import qilindi: ${result.imported} ta mahsulot`;
                if (result.errors_count > 0) {
                    message += `\nXatolar: ${result.errors_count} ta`;
                }
                alert(message);
                loadProducts(); // Reload products list
            } else {
                throw new Error(result.detail || 'Import xatolik');
            }
        } catch (error) {
            alert('Import xatolik: ' + error.message);
        }
    };
    input.click();
}

async function exportSales() {
    try {
        const startDate = prompt('Boshlanish sanasi (YYYY-MM-DD) yoki bo\'sh qoldiring:');
        const endDate = prompt('Tugash sanasi (YYYY-MM-DD) yoki bo\'sh qoldiring:');
        
        let url = `${API_BASE}/sales/export`;
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        if (params.toString()) url += '?' + params.toString();
        
        const sellerId = localStorage.getItem('admin_seller_id');
        const headers = {};
        if (sellerId) {
            headers['X-Seller-ID'] = sellerId;
        }
        
        const response = await fetch(url, {
            headers: headers
        });
        if (!response.ok) {
            throw new Error('Export xatolik');
        }
        const blob = await response.blob();
        const url_obj = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url_obj;
        a.download = `sales_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url_obj);
        document.body.removeChild(a);
        alert('Sotuvlar Excel fayliga export qilindi!');
    } catch (error) {
        alert('Export xatolik: ' + error.message);
    }
}

async function exportStatistics(format = 'excel') {
    try {
        const period = document.getElementById('dashboard-period')?.value || '';
        const startDate = prompt('Boshlanish sanasi (YYYY-MM-DD) yoki bo\'sh qoldiring:');
        const endDate = prompt('Tugash sanasi (YYYY-MM-DD) yoki bo\'sh qoldiring:');
        
        let url = `${API_BASE}/statistics/export`;
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        params.append('format', format);
        if (params.toString()) url += '?' + params.toString();
        
        const sellerId = localStorage.getItem('admin_seller_id');
        const headers = {};
        if (sellerId) {
            headers['X-Seller-ID'] = sellerId;
        }
        
        const response = await fetch(url, {
            headers: headers
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Export xatolik (${response.status}): ${errorText}`);
        }
        
        const blob = await response.blob();
        const url_obj = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url_obj;
        const fileExtension = format === 'pdf' ? 'pdf' : 'xlsx';
        a.download = `statistics_${new Date().toISOString().split('T')[0]}.${fileExtension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url_obj);
        
        const formatName = format === 'pdf' ? 'PDF' : 'Excel';
        alert(`Statistik hisobot ${formatName} fayliga export qilindi!`);
    } catch (error) {
        console.error('Statistics export error:', error);
        alert('Statistics export xatolik: ' + error.message);
    }
}

// Customers
async function loadCustomers() {
    try {
        const type = document.getElementById('customer-type-filter')?.value || '';
        const search = document.getElementById('customer-search')?.value || '';
        const skip = (currentCustomerPage - 1) * customersPerPage;
        
        let url = `${API_BASE}/customers?skip=${skip}&limit=${customersPerPage}`;
        if (type) url += `&customer_type=${type}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        
        const [customers, countData] = await Promise.all([
            fetch(url).then(r => r.json()),
            fetch(`${API_BASE}/customers/count?${type ? `customer_type=${type}&` : ''}${search ? `search=${encodeURIComponent(search)}` : ''}`).then(r => r.json())
        ]);
        
        totalCustomers = countData.count;
        const tbody = document.getElementById('customers-tbody');
        tbody.innerHTML = '';

        customers.forEach(customer => {
            const row = document.createElement('tr');
            const debtBalance = customer.debt_balance || 0;
            const debtClass = debtBalance > 0 ? 'badge-danger' : 'badge-success';
            row.innerHTML = `
                <td>${customer.id}</td>
                <td>${customer.name}</td>
                <td>${customer.phone || '-'}</td>
                <td>${customer.address || '-'}</td>
                <td><span class="badge ${customer.customer_type === 'wholesale' ? 'badge-success' : customer.customer_type === 'retail' ? 'badge-info' : 'badge-warning'}">${customer.customer_type === 'wholesale' ? 'Ulgurji' : customer.customer_type === 'retail' ? 'Dona' : 'Oddiy'}</span></td>
                <td><span class="badge ${debtClass}">${debtBalance.toLocaleString('uz-UZ')} so'm</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn action-btn-view" onclick="viewCustomerHistory(${customer.id}, '${escapeHtml(customer.name)}')" title="Sotuv tarixi">
                            <i class="fas fa-history"></i>
                        </button>
                        <button class="action-btn action-btn-edit" onclick="editCustomer(${customer.id})" title="Tahrirlash">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn action-btn-delete" onclick="deleteCustomer(${customer.id})" title="O'chirish">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
        
        renderPagination('customers-pagination', currentCustomerPage, customersPerPage, totalCustomers, (page) => {
            currentCustomerPage = page;
            loadCustomers();
        });
    } catch (error) {
        console.error('Error loading customers:', error);
    }
}

async function viewCustomerHistory(customerId, customerName) {
    try {
        console.log('Loading customer history for:', customerId);
        const [salesRes, debtRes] = await Promise.all([
            fetch(`${API_BASE}/customers/${customerId}/sales-history?limit=100`),
            fetch(`${API_BASE}/customers/${customerId}/debt-history?limit=100`)
        ]);
        
        if (!salesRes.ok) {
            throw new Error(`HTTP ${salesRes.status}: ${salesRes.statusText}`);
        }
        
        const sales = await salesRes.json();
        const debtHistory = debtRes.ok ? await debtRes.json() : [];
        
        const totalSalesAmount = sales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
        const totalDebt = debtHistory.filter(d => d.amount < 0).reduce((sum, d) => sum + Math.abs(d.amount), 0);
        const totalPaid = debtHistory.filter(d => d.amount > 0).reduce((sum, d) => sum + d.amount, 0);
        
        let historyHtml = `
            <h2 style="margin-bottom: 1rem;"><i class="fas fa-history"></i> ${escapeHtml(customerName)} - Tarix</h2>
            <div style="margin-bottom: 1rem; padding: 1rem; background: #f1f5f9; border-radius: 8px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                <div>
                    <strong>Jami sotuvlar:</strong> ${sales.length} ta<br>
                    <strong>Jami summa:</strong> ${formatMoney(totalSalesAmount)}
                </div>
                <div>
                    <strong>Jami qarz:</strong> ${formatMoney(totalDebt)}<br>
                    <strong>To'langan:</strong> ${formatMoney(totalPaid)}
                </div>
            </div>
            
            <div style="margin-bottom: 1rem; display: flex; gap: 0.5rem;">
                <button id="btn-sales-history" class="btn btn-primary" onclick="
                    document.getElementById('sales-history-section').style.display='block';
                    document.getElementById('debt-history-section').style.display='none';
                    document.getElementById('btn-sales-history').classList.add('btn-primary');
                    document.getElementById('btn-sales-history').classList.remove('btn-secondary');
                    document.getElementById('btn-debt-history').classList.add('btn-secondary');
                    document.getElementById('btn-debt-history').classList.remove('btn-warning');
                ">
                    <i class="fas fa-shopping-cart"></i> Sotuvlar tarixi
                </button>
                <button id="btn-debt-history" class="btn btn-secondary" onclick="
                    document.getElementById('sales-history-section').style.display='none';
                    document.getElementById('debt-history-section').style.display='block';
                    document.getElementById('btn-debt-history').classList.add('btn-warning');
                    document.getElementById('btn-debt-history').classList.remove('btn-secondary');
                    document.getElementById('btn-sales-history').classList.add('btn-secondary');
                    document.getElementById('btn-sales-history').classList.remove('btn-primary');
                ">
                    <i class="fas fa-file-invoice-dollar"></i> Qarz tarixi
                </button>
            </div>
            
            <!-- Sales History -->
            <div id="sales-history-section" style="display: block; max-height: 600px; overflow-y: auto;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: var(--primary-color); color: white;">
                            <th style="padding: 0.75rem; text-align: left; border: 1px solid #ddd;">ID</th>
                            <th style="padding: 0.75rem; text-align: left; border: 1px solid #ddd;">Sana</th>
                            <th style="padding: 0.75rem; text-align: left; border: 1px solid #ddd;">Mahsulotlar</th>
                            <th style="padding: 0.75rem; text-align: right; border: 1px solid #ddd;">Jami</th>
                            <th style="padding: 0.75rem; text-align: right; border: 1px solid #ddd;">To'landi</th>
                            <th style="padding: 0.75rem; text-align: right; border: 1px solid #ddd;">Ortiqcha/Qarz</th>
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
                const saleDate = formatDate(sale.created_at);
                
                const paymentAmount = sale.payment_amount || 0;
                const difference = paymentAmount - sale.total_amount;
                let debtOrReturnText = '';
                let debtOrReturnClass = '';
                if (difference > 0) {
                    debtOrReturnText = `Ortiqcha: ${formatMoney(difference)}`;
                    debtOrReturnClass = 'color: #10b981;';
                } else if (difference < 0) {
                    debtOrReturnText = `Qarz: ${formatMoney(Math.abs(difference))}`;
                    debtOrReturnClass = 'color: #dc2626;';
                } else {
                    debtOrReturnText = 'To\'liq';
                    debtOrReturnClass = 'color: #64748b;';
                }
                
                historyHtml += `
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 0.75rem; border: 1px solid #ddd;">${sale.id}</td>
                        <td style="padding: 0.75rem; border: 1px solid #ddd;">${saleDate}</td>
                        <td style="padding: 0.75rem; border: 1px solid #ddd;">${escapeHtml(productsList)}</td>
                        <td style="padding: 0.75rem; text-align: right; border: 1px solid #ddd; font-weight: 600;">${formatMoney(sale.total_amount || 0)}</td>
                        <td style="padding: 0.75rem; text-align: right; border: 1px solid #ddd;">${formatMoney(paymentAmount)}</td>
                        <td style="padding: 0.75rem; text-align: right; border: 1px solid #ddd; font-weight: 600; ${debtOrReturnClass}">${debtOrReturnText}</td>
                        <td style="padding: 0.75rem; text-align: center; border: 1px solid #ddd;">
                            <button class="btn btn-sm btn-primary" onclick="window.open('${API_BASE}/sales/${sale.id}/receipt', '_blank')" style="padding: 0.25rem 0.5rem; font-size: 0.875rem;">
                                <i class="fas fa-receipt"></i> Chek
                            </button>
                        </td>
                    </tr>
                `;
            });
        }
        
        historyHtml += `
                    </tbody>
                </table>
            </div>
            
            <!-- Debt History -->
            <div id="debt-history-section" style="display: none; max-height: 600px; overflow-y: auto;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f59e0b; color: white;">
                            <th style="padding: 0.75rem; text-align: left; border: 1px solid #ddd;">ID</th>
                            <th style="padding: 0.75rem; text-align: left; border: 1px solid #ddd;">Sana</th>
                            <th style="padding: 0.75rem; text-align: left; border: 1px solid #ddd;">Turi</th>
                            <th style="padding: 0.75rem; text-align: right; border: 1px solid #ddd;">Summa</th>
                            <th style="padding: 0.75rem; text-align: right; border: 1px solid #ddd;">Avval</th>
                            <th style="padding: 0.75rem; text-align: right; border: 1px solid #ddd;">Keyin</th>
                            <th style="padding: 0.75rem; text-align: left; border: 1px solid #ddd;">Izoh</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        if (debtHistory.length === 0) {
            historyHtml += '<tr><td colspan="7" style="padding: 2rem; text-align: center;">Qarz tarixi topilmadi</td></tr>';
        } else {
            debtHistory.forEach(debt => {
                const debtDate = formatDate(debt.created_at);
                const transactionTypeMap = {
                    'debt_added': 'Qarz qo\'shildi',
                    'debt_paid': 'Qarz to\'landi',
                    'payment': 'To\'lov',
                    'order_payment': 'Buyurtma to\'lovi'
                };
                const transactionType = transactionTypeMap[debt.transaction_type] || debt.transaction_type;
                const amountColor = debt.amount < 0 ? '#dc2626' : '#10b981';
                
                historyHtml += `
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 0.75rem; border: 1px solid #ddd;">${debt.id}</td>
                        <td style="padding: 0.75rem; border: 1px solid #ddd;">${debtDate}</td>
                        <td style="padding: 0.75rem; border: 1px solid #ddd;">${transactionType}</td>
                        <td style="padding: 0.75rem; text-align: right; border: 1px solid #ddd; font-weight: 600; color: ${amountColor}">
                            ${debt.amount > 0 ? '+' : ''}${formatMoney(Math.abs(debt.amount))}
                        </td>
                        <td style="padding: 0.75rem; text-align: right; border: 1px solid #ddd;">${formatMoney(debt.balance_before)}</td>
                        <td style="padding: 0.75rem; text-align: right; border: 1px solid #ddd; font-weight: 600;">${formatMoney(debt.balance_after)}</td>
                        <td style="padding: 0.75rem; border: 1px solid #ddd;">${escapeHtml(debt.notes || '-')}</td>
                    </tr>
                `;
            });
        }
        
        historyHtml += `
                    </tbody>
                </table>
            </div>
        `;
        
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

let customerSearchTimeout;
function handleCustomerSearch() {
    clearTimeout(customerSearchTimeout);
    customerSearchTimeout = setTimeout(() => {
        currentCustomerPage = 1;
        loadCustomers();
    }, 500);
}

function showAddCustomerModal() {
    document.getElementById('customer-modal-title').textContent = 'Yangi Mijoz';
    document.getElementById('customer-form').reset();
    document.getElementById('customer-id').value = '';
    document.getElementById('customer-modal').style.display = 'block';
}

async function editCustomer(id) {
    try {
        const customer = await fetch(`${API_BASE}/customers/${id}`).then(r => r.json());
        document.getElementById('customer-modal-title').textContent = 'Mijozni Tahrirlash';
        document.getElementById('customer-id').value = customer.id;
        document.getElementById('customer-name').value = customer.name;
        document.getElementById('customer-phone').value = customer.phone || '';
        document.getElementById('customer-address').value = customer.address || '';
        document.getElementById('customer-type').value = customer.customer_type;
        document.getElementById('customer-notes').value = customer.notes || '';
        document.getElementById('customer-debt-limit').value = customer.debt_limit || '';
        if (customer.debt_due_date) {
            const date = new Date(customer.debt_due_date);
            document.getElementById('customer-debt-due-date').value = date.toISOString().split('T')[0];
        } else {
            document.getElementById('customer-debt-due-date').value = '';
        }
        document.getElementById('customer-modal').style.display = 'block';
    } catch (error) {
        alert('Xatolik: ' + error.message);
    }
}

async function saveCustomer(e) {
    e.preventDefault();
    const id = document.getElementById('customer-id').value;
    const debtLimit = document.getElementById('customer-debt-limit').value;
    const debtDueDate = document.getElementById('customer-debt-due-date').value;
    const data = {
        name: document.getElementById('customer-name').value,
        phone: document.getElementById('customer-phone').value,
        address: document.getElementById('customer-address').value,
        customer_type: document.getElementById('customer-type').value,
        notes: document.getElementById('customer-notes').value,
        debt_limit: debtLimit ? parseFloat(debtLimit) : null,
        debt_due_date: debtDueDate || null
    };

    try {
        const url = id ? `${API_BASE}/customers/${id}` : `${API_BASE}/customers`;
        const method = id ? 'PUT' : 'POST';
        
        await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        closeModal('customer-modal');
        loadCustomers();
    } catch (error) {
        alert('Xatolik: ' + error.message);
    }
}

async function deleteCustomer(id) {
    if (!confirm('Bu mijozni o\'chirishni xohlaysizmi?')) return;
    
    try {
        await fetch(`${API_BASE}/customers/${id}`, { method: 'DELETE' });
        loadCustomers();
    } catch (error) {
        alert('Xatolik: ' + error.message);
    }
}

// Orders
let allCustomersForOrderFilter = [];
let selectedCustomerIdForOrderFilter = null;

async function loadOrders() {
    try {
        const tbody = document.getElementById('orders-tbody');
        if (!tbody) {
            console.error('orders-tbody element not found');
            return;
        }
        
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">Yuklanmoqda...</td></tr>';
        
        const status = document.getElementById('order-status-filter')?.value || '';
        const startDate = document.getElementById('order-start-date')?.value;
        const endDate = document.getElementById('order-end-date')?.value;
        const customerId = selectedCustomerIdForOrderFilter;
        
        let url = `${API_BASE}/orders`;
        const params = [];
        if (status) params.push(`status=${status}`);
        if (startDate) params.push(`start_date=${startDate}`);
        if (endDate) params.push(`end_date=${endDate}`);
        if (customerId) params.push(`customer_id=${customerId}`);
        if (params.length > 0) url += '?' + params.join('&');
        
        console.log('Loading orders from:', url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const orders = await response.json();
        
        console.log('Orders loaded:', orders ? orders.length : 0);
        
        if (!orders || orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center">Buyurtmalar topilmadi</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        orders.forEach(order => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${order.id}</td>
                <td>${formatDate(order.created_at)}</td>
                <td>${escapeHtml(order.customer_name || 'Noma\'lum')}</td>
                <td>${escapeHtml(order.seller_name || 'Noma\'lum')}</td>
                <td>${formatMoney(order.total_amount || 0)}</td>
                <td><span class="badge badge-${getStatusBadgeClass(order.status)}">${getStatusText(order.status)}</span></td>
                <td>${order.is_offline ? '<span class="badge badge-warning">Offline</span>' : '<span class="badge badge-success">Online</span>'}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn action-btn-view" onclick="viewOrder(${order.id})" title="Ko'rish">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${order.status === 'pending' ? `<button class="action-btn action-btn-edit" onclick="updateOrderStatus(${order.id}, 'processing')" title="Qabul qilish">Qabul qilish</button>` : ''}
                        ${order.status === 'pending' ? `<button class="action-btn action-btn-success" onclick="showOrderPaymentModal(${order.id}, ${order.total_amount || 0})" title="To'lov">To'lov</button>` : ''}
                        ${order.status === 'processing' ? `<button class="action-btn action-btn-success" onclick="updateOrderStatus(${order.id}, 'completed')" title="Tugallash">Tugallash</button>` : ''}
                        ${['pending', 'processing'].includes(order.status) ? `<button class="action-btn action-btn-delete" onclick="cancelOrder(${order.id})" title="Bekor qilish">Bekor</button>` : ''}
                        ${order.status === 'completed' ? `<button class="action-btn action-btn-delete" onclick="returnOrder(${order.id})" title="Qaytarish">Qaytarish</button>` : ''}
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
        
        console.log('Successfully rendered', orders.length, 'orders');
    } catch (error) {
        console.error('Error loading orders:', error);
        const tbody = document.getElementById('orders-tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center" style="color: red;">Xatolik yuz berdi: ' + (error.message || 'Noma\'lum xatolik') + '</td></tr>';
        }
    }
}

// Load customers for order filter search
async function loadCustomersForOrderFilter() {
    try {
        const customers = await fetch(`${API_BASE}/customers?limit=1000`).then(r => r.json());
        allCustomersForOrderFilter = customers;
    } catch (error) {
        console.error('Error loading customers for order filter:', error);
    }
}

// Handle customer search for order filter
function handleOrderCustomerSearch() {
    const searchInput = document.getElementById('order-customer-search');
    const query = searchInput?.value?.toLowerCase() || '';
    
    if (!query) {
        selectedCustomerIdForOrderFilter = null;
        loadOrders();
        return;
    }
    
    // Find matching customer
    const match = allCustomersForOrderFilter.find(c => 
        (c.name && c.name.toLowerCase().includes(query)) ||
        (c.phone && c.phone.includes(query))
    );
    
    if (match) {
        selectedCustomerIdForOrderFilter = match.id;
        loadOrders();
    } else {
        // If no match, clear selection
        if (selectedCustomerIdForOrderFilter) {
            selectedCustomerIdForOrderFilter = null;
            loadOrders();
        }
    }
}

// Clear order filters
function clearOrderFilters() {
    document.getElementById('order-start-date').value = '';
    document.getElementById('order-end-date').value = '';
    document.getElementById('order-customer-search').value = '';
    document.getElementById('order-status-filter').value = '';
    selectedCustomerIdForOrderFilter = null;
    loadOrders();
}

async function updateOrderStatus(id, status) {
    try {
        await fetch(`${API_BASE}/orders/${id}/status?status=${status}`, { method: 'PUT' });
        loadOrders();
    } catch (error) {
        alert('Xatolik: ' + error.message);
    }
}

async function cancelOrder(orderId) {
    if (!confirm('Buyurtmani bekor qilishni xohlaysizmi? Mahsulotlar omborga qaytadi.')) return;
    await updateOrderStatus(orderId, 'cancelled');
}

async function returnOrder(orderId) {
    if (!confirm('Buyurtmani qaytarishni xohlaysizmi? Mahsulotlar omborga qaytadi.')) return;
    await updateOrderStatus(orderId, 'returned');
}

function showOrderPaymentModal(orderId, orderAmount) {
    document.getElementById('payment-order-id').value = orderId;
    document.getElementById('payment-order-amount').value = formatMoney(orderAmount);
    document.getElementById('payment-amount').value = orderAmount.toFixed(2);
    document.getElementById('payment-allow-debt').checked = false;
    document.getElementById('order-payment-modal').style.display = 'block';
}

async function processOrderPayment(e) {
    e.preventDefault();
    const orderId = parseInt(document.getElementById('payment-order-id').value);
    const paymentAmount = parseFloat(document.getElementById('payment-amount').value);
    const allowDebt = document.getElementById('payment-allow-debt').checked;
    
    try {
        const formData = new FormData();
        formData.append('payment_amount', paymentAmount);
        formData.append('allow_debt', allowDebt);
        
        const response = await fetch(`${API_BASE}/orders/${orderId}/payment`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'To\'lovda xatolik');
        }
        
        const result = await response.json();
        alert(result.message || 'To\'lov muvaffaqiyatli amalga oshirildi');
        closeModal('order-payment-modal');
        loadOrders();
        loadDashboard();
    } catch (error) {
        alert('Xatolik: ' + error.message);
    }
}

function getStatusText(status) {
    const statusMap = {
        'pending': 'Kutilmoqda',
        'processing': 'Jarayonda',
        'completed': 'Tugallangan',
        'cancelled': 'Bekor qilingan',
        'returned': 'Qaytarilgan'
    };
    return statusMap[status] || status;
}

function getStatusBadgeClass(status) {
    const classMap = {
        'pending': 'warning',
        'processing': 'info',
        'completed': 'success',
        'cancelled': 'danger',
        'returned': 'danger'
    };
    return classMap[status] || 'info';
}

// Sellers
async function loadSellers() {
    try {
        const sellers = await fetch(`${API_BASE}/sellers`).then(r => r.json());
        const tbody = document.getElementById('sellers-tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        sellers.forEach(seller => {
            const row = document.createElement('tr');
            row.setAttribute('data-seller-id', seller.id);
            row.innerHTML = `
                <td>${seller.id}</td>
                <td>${seller.name}</td>
                <td><strong>${seller.username || '<span style="color: var(--text-light);">-</span>'}</strong></td>
                <td>${seller.phone || '-'}</td>
                <td>${seller.email || '-'}</td>
                <td><span class="badge ${seller.is_active ? 'badge-success' : 'badge-danger'}">${seller.is_active ? 'Faol' : 'Nofaol'}</span></td>
                <td><span class="badge badge-info">${seller.role_name || 'Role yo\'q'}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn action-btn-view" onclick="viewSellerHistory(${seller.id}, '${escapeHtml(seller.name)}')" title="Sotuv tarixi">
                            <i class="fas fa-history"></i>
                        </button>
                        <button class="action-btn action-btn-edit" onclick="editSeller(${seller.id})" title="Tahrirlash">
                            <i class="fas fa-edit"></i>
                        </button>
                        ${seller.username ? `<button class="action-btn action-btn-view" onclick="toggleSellerLoginInfo(${seller.id}, '${escapeHtml(seller.username)}')" title="Login ma'lumotlarini ko'rsatish/yashirish"><i class="fas fa-user-circle"></i></button>` : ''}
                        ${seller.role_id ? `<button class="action-btn action-btn-view" onclick="viewSellerPermissions(${seller.id})" title="Ruxsatlarni ko'rish"><i class="fas fa-key"></i></button>` : ''}
                        <button class="action-btn action-btn-delete" onclick="deleteSeller(${seller.id}, '${escapeHtml(seller.name || seller.username || 'Sotuvchi')}')" title="O'chirish">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading sellers:', error);
        alert('Xatolik: ' + error.message);
    }
}

async function deleteSeller(id, sellerName) {
    // Check permission
    if (!currentAdminUser) {
        alert('Xatolik: Admin ma\'lumotlari topilmadi');
        return;
    }
    
    const hasPermission = currentAdminUser.permissions?.includes('sellers.delete') || 
                         currentAdminUser.permissions?.includes('admin') ||
                         currentAdminUser.role_name?.toLowerCase() === 'admin' ||
                         currentAdminUser.role_name?.toLowerCase() === 'super admin' ||
                         currentAdminUser.role_name?.toLowerCase() === 'direktor';
    
    if (!hasPermission) {
        alert('Ruxsat yo\'q: Sotuvchilarni o\'chirish uchun ruxsatingiz yo\'q');
        return;
    }
    
    // Prevent deleting yourself
    if (currentAdminUser.id === id) {
        alert('Xatolik: O\'zingizni o\'chira olmaysiz');
        return;
    }
    
    // Confirmation dialog
    if (!confirm(`"${sellerName}" sotuvchisini o'chirishni tasdiqlaysizmi?\n\n⚠️ Eslatma: Bu amalni qaytarib bo'lmaydi.`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/sellers/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${currentAdminToken}`,
                'X-Seller-ID': currentAdminUser.id
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: response.statusText }));
            throw new Error(errorData.detail || 'Sotuvchini o\'chirishda xatolik');
        }
        
        const result = await response.json();
        alert('Muvaffaqiyatli: Sotuvchi o\'chirildi');
        
        // Reload sellers list
        loadSellers();
    } catch (error) {
        console.error('Error deleting seller:', error);
        alert('Xatolik: ' + (error.message || 'Sotuvchini o\'chirishda xatolik'));
    }
}

async function showAddSellerModal() {
    document.getElementById('seller-modal-title').textContent = 'Yangi Sotuvchi';
    document.getElementById('seller-form').reset();
    document.getElementById('seller-id').value = '';
    
    // Clear all fields
    document.getElementById('seller-username').value = '';
    document.getElementById('seller-password').value = '';
    document.getElementById('seller-password-confirm').value = '';
    
    // Update password requirement label (required for new sellers)
    const passwordLabel = document.getElementById('password-required-label');
    const passwordHint = document.getElementById('password-hint');
    if (passwordLabel) {
        passwordLabel.style.display = 'inline';
    }
    if (passwordHint) {
        passwordHint.textContent = 'Yangi sotuvchi yaratishda parol majburiy';
    }
    
    // Load roles for dropdown
    await loadRolesForDropdown();
    
    document.getElementById('seller-modal').style.display = 'block';
}

async function loadRolesForDropdown() {
    try {
        const roles = await fetch(`${API_BASE}/roles`).then(r => r.json());
        const select = document.getElementById('seller-role-id');
        if (!select) return;
        select.innerHTML = '<option value="">Role tanlash</option>';
        roles.forEach(role => {
            const option = document.createElement('option');
            option.value = role.id;
            option.textContent = role.name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading roles:', error);
    }
}

// Toggle sidebar
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.querySelector('.main-content');
    const toggleBtn = document.getElementById('sidebar-toggle');
    const body = document.body;
    
    if (!sidebar) {
        console.error('Sidebar element not found');
        return;
    }
    
    // Check if mobile (screen width <= 768px)
    const isMobile = window.innerWidth <= 768;
    
    if (sidebar.classList.contains('collapsed')) {
        // Show sidebar
        sidebar.classList.remove('collapsed');
        if (mainContent && !isMobile) {
            mainContent.style.marginLeft = '260px';
        } else if (mainContent && isMobile) {
            mainContent.style.marginLeft = '0';
            body.classList.add('sidebar-open');
        }
        if (toggleBtn) {
            const icon = toggleBtn.querySelector('i');
            if (icon) {
                icon.className = isMobile ? 'fas fa-times' : 'fas fa-chevron-left';
            }
        }
    } else {
        // Hide sidebar
        sidebar.classList.add('collapsed');
        if (mainContent) {
            mainContent.style.marginLeft = '0';
        }
        if (isMobile) {
            body.classList.remove('sidebar-open');
        }
        if (toggleBtn) {
            const icon = toggleBtn.querySelector('i');
            if (icon) {
                icon.className = 'fas fa-bars';
            }
        }
    }
}

// Make toggleSidebar globally accessible
window.toggleSidebar = toggleSidebar;

// Close sidebar when clicking outside on mobile
if (typeof window !== 'undefined') {
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768) {
            const sidebar = document.getElementById('sidebar');
            const toggleBtn = document.getElementById('sidebar-toggle');
            if (sidebar && !sidebar.classList.contains('collapsed')) {
                // If click is outside sidebar and toggle button
                if (!sidebar.contains(e.target) && !toggleBtn?.contains(e.target)) {
                    sidebar.classList.add('collapsed');
                    const icon = toggleBtn?.querySelector('i');
                    if (icon) {
                        icon.className = 'fas fa-bars';
                    }
                }
            }
        }
    });
}

// Toggle seller login info visibility
const sellerLoginInfoVisible = {};

function toggleSellerLoginInfo(sellerId, username) {
    const row = document.querySelector(`tr[data-seller-id="${sellerId}"]`);
    if (!row) return;
    
    let loginInfoCell = row.querySelector('.login-info-cell');
    
    if (!sellerLoginInfoVisible[sellerId]) {
        // Show login info
        if (!loginInfoCell) {
            loginInfoCell = document.createElement('td');
            loginInfoCell.className = 'login-info-cell';
            loginInfoCell.colSpan = 1;
            loginInfoCell.style.cssText = 'background: #f0f9ff; padding: 0.5rem; font-size: 0.85rem;';
            
            // Find the last cell before actions
            const cells = row.querySelectorAll('td');
            const lastCell = cells[cells.length - 1];
            row.insertBefore(loginInfoCell, lastCell);
        }
        
        loginInfoCell.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <strong>Login:</strong> <code style="background: white; padding: 0.25rem 0.5rem; border-radius: 4px;">${escapeHtml(username)}</code>
                <small style="color: #64748b;">(Parolni faqat tahrirlashda ko'rish mumkin)</small>
            </div>
        `;
        sellerLoginInfoVisible[sellerId] = true;
    } else {
        // Hide login info
        if (loginInfoCell) {
            loginInfoCell.remove();
        }
        sellerLoginInfoVisible[sellerId] = false;
    }
}

function showSellerLoginInfo(username) {
    alert(`📱 Login ma'lumotlari:\n\nUsername: ${username}\n\n` +
          `⚠️ Eslatma: Parolni faqat seller yaratish yoki parolni o'zgartirish paytida ko'rish mumkin.\n\n` +
          `Parolni o'zgartirish uchun "Tahrirlash" tugmasini bosing va yangi parol kiriting.`);
}

async function editSeller(id) {
    try {
        const seller = await fetch(`${API_BASE}/sellers/${id}`).then(r => r.json());
        document.getElementById('seller-modal-title').textContent = 'Sotuvchini Tahrirlash';
        document.getElementById('seller-id').value = seller.id;
        document.getElementById('seller-name').value = seller.name;
        document.getElementById('seller-phone').value = seller.phone || '';
        document.getElementById('seller-email').value = seller.email || '';
        document.getElementById('seller-username').value = seller.username || '';
        
        // Clear password fields for editing (user can leave empty to keep current password)
        document.getElementById('seller-password').value = '';
        document.getElementById('seller-password-confirm').value = '';
        
        // Update password requirement label (not required for updates)
        const passwordLabel = document.getElementById('password-required-label');
        const passwordHint = document.getElementById('password-hint');
        if (passwordLabel) {
            passwordLabel.style.display = 'none';
        }
        if (passwordHint) {
            passwordHint.textContent = 'Parolni o\'zgartirish uchun kiriting (bo\'sh qoldirsangiz, parol o\'zgarmaydi)';
        }
        
        // Load roles and set current role
        await loadRolesForDropdown();
        if (seller.role_id) {
            document.getElementById('seller-role-id').value = seller.role_id;
        }
        
        document.getElementById('seller-modal').style.display = 'block';
    } catch (error) {
        alert('Xatolik: ' + error.message);
    }
}

async function saveSeller(e) {
    e.preventDefault();
    const id = document.getElementById('seller-id').value;
    const roleId = document.getElementById('seller-role-id').value;
    const username = document.getElementById('seller-username').value.trim();
    const password = document.getElementById('seller-password').value;
    const passwordConfirm = document.getElementById('seller-password-confirm').value;
    
    // Validate username
    if (!username) {
        alert('Username majburiy!');
        return;
    }
    
    // Validate password for new sellers
    if (!id && !password) {
        alert('Yangi sotuvchi yaratishda parol majburiy!');
        return;
    }
    
    // Validate password length if provided
    if (password && password.length < 6) {
        alert('Parol kamida 6 belgi bo\'lishi kerak!');
        return;
    }
    
    // Validate password confirmation if password is provided
    if (password && password !== passwordConfirm) {
        alert('Parollar mos kelmayapti!');
        return;
    }
    
    const data = {
        name: document.getElementById('seller-name').value,
        phone: document.getElementById('seller-phone').value,
        email: document.getElementById('seller-email').value,
        username: username
    };
    
    // Only include password if it's provided (for new sellers or password updates)
    if (password) {
        data.password = password;
    }
    
    if (roleId) {
        data.role_id = parseInt(roleId);
    }

    try {
        const url = id ? `${API_BASE}/sellers/${id}` : `${API_BASE}/sellers`;
        const method = id ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
            throw new Error(errorData.detail || `HTTP ${response.status}`);
        }

        const result = await response.json();
        closeModal('seller-modal');
        loadSellers();
        
        // Show login credentials for new sellers
        if (!id && password) {
            const loginInfo = `Sotuvchi muvaffaqiyatli yaratildi!\n\n` +
                `📱 Mobile app va Seller panel uchun login ma'lumotlari:\n` +
                `Username: ${username}\n` +
                `Password: ${password}\n\n` +
                `⚠️ Bu ma'lumotlarni yozib oling va xavfsiz joyda saqlang!`;
            alert(loginInfo);
        } else {
            alert('Sotuvchi muvaffaqiyatli saqlandi!');
        }
    } catch (error) {
        alert('Xatolik: ' + error.message);
    }
}

// GPS Map
let mapMarkers = []; // Store markers to remove them later

async function loadGPSMap() {
    console.log('loadGPSMap called');
    
    // Check if map container exists and is visible
    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
        console.error('Map container not found');
        return;
    }
    
    // Check if mapboxgl is loaded
    if (typeof mapboxgl === 'undefined') {
        console.error('Mapbox GL JS is not loaded. Please check if the script is included.');
        mapContainer.innerHTML = '<div style="padding: 2rem; text-align: center; color: #dc2626;"><p>Mapbox xarita kutubxonasi yuklanmadi. Qayta yuklashni urinib ko\'ring.</p></div>';
        return;
    }
    
    try {
        // Initialize map if not exists
        if (!map) {
            console.log('Initializing map...');
            mapboxgl.accessToken = 'pk.eyJ1IjoiYmFob2RpcnNob2g5MCIsImEiOiJjbWoxd2E1ODEwbmNsM2RzYjFpd3kzcW5oIn0.-sMWxZGVsVs1ngMlMAPR4A';
            map = new mapboxgl.Map({
                container: 'map',
                style: 'mapbox://styles/mapbox/streets-v11',
                center: [69.2401, 41.2995], // Tashkent
                zoom: 10
            });
            
            // Wait for map to load
            map.on('load', () => {
                console.log('Map loaded successfully');
                // Load markers after map is ready
                setTimeout(() => {
                    loadSellersMarkers();
                }, 500);
            });
            
            // Also try to load markers if map is already loaded
            map.on('idle', () => {
                if (mapMarkers.length === 0) {
                    console.log('Map is idle, loading markers...');
                    loadSellersMarkers();
                }
            });
        } else {
            // Map already exists, just load markers
            console.log('Map already exists, loading markers...');
            // Ensure map is visible and resized
            if (map.getContainer()) {
                map.resize();
            }
            loadSellersMarkers();
        }
    } catch (error) {
        console.error('Error initializing map:', error);
        mapContainer.innerHTML = `<div style="padding: 2rem; text-align: center; color: #dc2626;"><p>Xarita yuklashda xatolik: ${error.message}</p></div>`;
    }
}

async function loadSellersMarkers() {
    try {
        console.log('Loading sellers locations from API...');
        console.log('API_BASE:', API_BASE);
        
        // Check if filter by work hours is enabled
        const filterWorkHours = document.getElementById('filter-work-hours')?.checked || false;
        const apiUrl = `${API_BASE}/locations/sellers${filterWorkHours ? '?only_work_hours=true' : ''}`;
        console.log('Fetching from:', apiUrl);
        console.log('Filter by work hours:', filterWorkHours);
        
        const response = await fetch(apiUrl);
        
        console.log('Response status:', response.status, response.statusText);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error response:', errorText);
            throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
        }
        
        const locations = await response.json();
        console.log('Sellers locations received:', locations);
        console.log('Locations count:', locations?.length || 0);
        
        if (!Array.isArray(locations)) {
            console.warn('Locations is not an array:', locations);
            console.warn('Type:', typeof locations);
            return;
        }
        
        // Remove existing markers
        mapMarkers.forEach(marker => marker.remove());
        mapMarkers = [];
        
        if (locations.length === 0) {
            console.log('No sellers with locations found');
            console.warn('⚠️ Hech qanday sotuvchi joylashuvi topilmadi. Sotuvchilar GPS orqali joylashuvni yuborishlari kerak.');
            // Show message on map if no locations
            if (map) {
                // Add a text overlay or notification
                const mapContainer = map.getContainer();
                let infoDiv = mapContainer.querySelector('.no-locations-info');
                if (!infoDiv) {
                    infoDiv = document.createElement('div');
                    infoDiv.className = 'no-locations-info';
                    infoDiv.style.cssText = 'position: absolute; top: 10px; left: 10px; background: rgba(255,255,255,0.9); padding: 1rem; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.2); z-index: 1000; max-width: 300px;';
                    infoDiv.innerHTML = '<p style="margin: 0; color: #dc2626; font-weight: 600;">⚠️ Sotuvchilar joylashuvi topilmadi</p><p style="margin: 0.5rem 0 0 0; font-size: 0.875rem; color: #6b7280;">Sotuvchilar GPS orqali joylashuvni yuborishlari kerak.</p>';
                    mapContainer.appendChild(infoDiv);
                }
            }
            return;
        }
        
        // Remove no-locations info if exists
        const mapContainer = map.getContainer();
        const infoDiv = mapContainer.querySelector('.no-locations-info');
        if (infoDiv) {
            infoDiv.remove();
        }
        
        // Add markers for each location
        let validLocationsCount = 0;
        locations.forEach((location, index) => {
            console.log(`Processing location ${index + 1}:`, location);
            
            if (!location.latitude || !location.longitude) {
                console.warn('Location missing coordinates:', location);
                return;
            }
            
            // Validate coordinates are numbers
            const lat = parseFloat(location.latitude);
            const lng = parseFloat(location.longitude);
            
            if (isNaN(lat) || isNaN(lng)) {
                console.warn('Invalid coordinates (not numbers):', location);
                return;
            }
            
            // Validate coordinate ranges
            if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
                console.warn('Coordinates out of range:', location);
                return;
            }
            
            try {
                console.log(`Creating marker for ${location.name} at [${lng}, ${lat}]`);
                // Create popup with proper accessibility
                const popup = new mapboxgl.Popup({
                    closeButton: true,
                    closeOnClick: false,
                    className: 'seller-location-popup'
                }).setHTML(
                    `<div style="padding: 0.5rem;">
                        <b>${escapeHtml(location.name || 'Noma\'lum')}</b><br>
                        <small>Oxirgi yangilanish: ${formatDate(location.last_update)}</small><br>
                        <small>Koordinatalar: ${lat.toFixed(6)}, ${lng.toFixed(6)}</small><br>
                        <button onclick="clearSellerLocation(${location.id}, '${escapeHtml(location.name || '')}')" 
                                style="margin-top: 0.5rem; padding: 0.25rem 0.5rem; background: #ef4444; color: white; border: none; border-radius: 0.25rem; cursor: pointer; font-size: 0.75rem;">
                            Joylashuvni tozalash
                        </button>
                    </div>`
                );
                
                // Fix accessibility issue with popup close button
                popup.on('open', () => {
                    const closeButton = popup._container?.querySelector('.mapboxgl-popup-close-button');
                    if (closeButton) {
                        closeButton.removeAttribute('aria-hidden');
                        closeButton.setAttribute('aria-label', 'Pop-upni yopish');
                    }
                });
                
                const marker = new mapboxgl.Marker({
                    color: '#4f46e5'
                })
                    .setLngLat([lng, lat])
                    .setPopup(popup)
                    .addTo(map);
                
                mapMarkers.push(marker);
                validLocationsCount++;
                console.log(`✓ Marker ${validLocationsCount} added successfully`);
            } catch (markerError) {
                console.error('Error creating marker for location:', location, markerError);
            }
        });
        
        console.log(`Successfully added ${validLocationsCount} markers to map (out of ${locations.length} locations)`);
        
        // Fit map to show all markers
        if (mapMarkers.length > 0 && map) {
            console.log('Fitting map bounds to show all markers...');
            const bounds = new mapboxgl.LngLatBounds();
            
            // Use mapMarkers instead of locations to ensure we only fit to valid markers
            mapMarkers.forEach(marker => {
                const lngLat = marker.getLngLat();
                if (lngLat) {
                    bounds.extend([lngLat.lng, lngLat.lat]);
                }
            });
            
            if (!bounds.isEmpty()) {
                console.log('Map bounds:', bounds.toArray());
                // Wait a bit for map to be fully rendered
                setTimeout(() => {
                    map.fitBounds(bounds, {
                        padding: { top: 50, bottom: 50, left: 50, right: 50 },
                        maxZoom: 15,
                        duration: 1000
                    });
                    console.log('Map fitted to bounds');
                }, 300);
            } else {
                console.warn('Bounds is empty, using default center');
                // If no valid bounds, center on first marker
                if (mapMarkers.length > 0) {
                    const firstMarker = mapMarkers[0];
                    const lngLat = firstMarker.getLngLat();
                    if (lngLat) {
                        map.setCenter([lngLat.lng, lngLat.lat]);
                        map.setZoom(12);
                    }
                }
            }
        } else if (mapMarkers.length === 0 && locations.length > 0) {
            console.warn('⚠️ No valid markers were created despite having locations data');
            console.warn('Locations data:', locations);
        } else if (mapMarkers.length === 0 && locations.length === 0) {
            console.log('No locations available to display');
        }
    } catch (error) {
        console.error('Error loading GPS locations:', error);
        const mapContainer = document.getElementById('map');
        if (mapContainer && map) {
            // Show error message overlay
            let errorDiv = mapContainer.querySelector('.location-error');
            if (!errorDiv) {
                errorDiv = document.createElement('div');
                errorDiv.className = 'location-error';
                errorDiv.style.cssText = 'position: absolute; top: 10px; left: 10px; background: rgba(220,38,38,0.9); color: white; padding: 1rem; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.2); z-index: 1000; max-width: 400px;';
                mapContainer.appendChild(errorDiv);
            }
            errorDiv.innerHTML = `<p style="margin: 0; font-weight: 600;">❌ Xatolik</p><p style="margin: 0.5rem 0 0 0; font-size: 0.875rem;">Sotuvchilar joylashuvini yuklashda xatolik: ${escapeHtml(error.message)}</p>`;
        }
    }
}

// Make loadSellersMarkers globally accessible for refresh button
window.loadSellersMarkers = loadSellersMarkers;

// Function to clear seller location (called from popup button)
async function clearSellerLocation(sellerId, sellerName) {
    if (!confirm(`"${sellerName}" sotuvchisining joylashuvini tozalashni tasdiqlaysizmi?`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/sellers/${sellerId}/location`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`HTTP ${response.status}: ${errorData.detail || response.statusText}`);
        }
        
        const data = await response.json();
        alert('Joylashuv muvaffaqiyatli tozalandi');
        
        // Reload markers
        if (map) {
            loadSellersMarkers();
        }
    } catch (error) {
        console.error('Error clearing location:', error);
        alert('Joylashuvni tozalashda xatolik: ' + error.message);
    }
}

// Sales
// Store customer list for filtering
let allCustomersForSaleFilter = [];
let allSellersForSaleFilter = [];
let selectedCustomerIdForSaleFilter = null;

async function loadSales() {
    try {
        // Reset to first page when filters change - we'll check if filters changed
        const tbody = document.getElementById('sales-tbody');
        if (!tbody) {
            console.error('sales-tbody element not found');
            return;
        }
        
        tbody.innerHTML = '<tr><td colspan="9" class="text-center">Yuklanmoqda...</td></tr>';
        
        // Build filter params
        const params = new URLSearchParams();
        const startDate = document.getElementById('sale-start-date')?.value;
        const endDate = document.getElementById('sale-end-date')?.value;
        const sellerId = document.getElementById('sale-seller-filter')?.value;
        const customerId = selectedCustomerIdForSaleFilter;
        const statusFilter = document.getElementById('sale-status-filter')?.value;
        
        // If filters are active, load all matching sales first, then paginate on client side
        const hasFilters = startDate || endDate || sellerId || customerId || statusFilter;
        
        if (hasFilters) {
            // When filtering, load more data and paginate on client side
            params.append('limit', '1000'); // Load more to filter properly
        } else {
            const skip = (currentSalePage - 1) * salesPerPage;
            params.append('skip', skip);
            params.append('limit', salesPerPage);
        }
        
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        if (sellerId) params.append('seller_id', sellerId);
        if (customerId) params.append('customer_id', customerId);
        
        let sales = await fetch(`${API_BASE}/sales?${params.toString()}`).then(r => r.json());
        
        // Apply status filter on client side if needed (since backend doesn't have status filter)
        if (statusFilter) {
            sales = sales.filter(sale => {
                if (statusFilter === 'approved') {
                    return !sale.requires_admin_approval || sale.admin_approved === true;
                } else if (statusFilter === 'pending') {
                    return sale.requires_admin_approval && sale.admin_approved === null;
                } else if (statusFilter === 'rejected') {
                    return sale.requires_admin_approval && sale.admin_approved === false;
                }
                return true;
            });
        }
        
        // Apply client-side pagination if filters are active
        let paginatedSales = sales;
        if (hasFilters) {
            const skip = (currentSalePage - 1) * salesPerPage;
            paginatedSales = sales.slice(skip, skip + salesPerPage);
        }
        
        tbody.innerHTML = '';

        // Optimize: Load all products at once instead of per sale
        const productIds = new Set();
        paginatedSales.forEach(sale => {
            (sale.items || []).forEach(item => {
                if (item.product_id) productIds.add(item.product_id);
            });
        });
        
        // Fetch all products in parallel
        const productsMap = new Map();
        if (productIds.size > 0) {
            const productPromises = Array.from(productIds).map(async (productId) => {
                try {
                    const productRes = await fetch(`${API_BASE}/products/${productId}`).catch(() => null);
                    if (productRes && productRes.ok) {
                        const product = await productRes.json();
                        return [productId, product];
                    }
                } catch (e) {
                    console.error(`Error loading product ${productId}:`, e);
                }
                return [productId, null];
            });
            
            const productResults = await Promise.all(productPromises);
            productResults.forEach(([id, product]) => {
                if (product) productsMap.set(id, product);
            });
        }
        
        for (const sale of paginatedSales) {
            const paymentMethodText = {
                'cash': 'Naqd',
                'card': 'Plastik',
                'bank_transfer': 'Hisob raqam'
            }[sale.payment_method || 'cash'] || sale.payment_method || 'Naqd';
            
            // Calculate profit for this sale using cached products
            let saleProfit = 0;
            try {
                for (const item of sale.items || []) {
                    const product = productsMap.get(item.product_id);
                    if (product) {
                        // Use cost_price (actual purchase price), if not available, skip cost calculation
                        const costPrice = product.cost_price;
                        const itemSubtotal = item.subtotal || 0;
                        const itemQuantity = item.requested_quantity || 0;
                        
                        if (costPrice && costPrice > 0 && itemQuantity > 0) {
                            // Safety check: if cost_price is unreasonably high (more than 2x the sale price), ignore it
                            const itemPricePerPiece = itemSubtotal / itemQuantity;
                            if (costPrice <= itemPricePerPiece * 2) {
                                const cost = costPrice * itemQuantity;
                                saleProfit += itemSubtotal - cost;
                            } else {
                                // Cost price seems incorrect (too high), skip cost calculation
                                saleProfit += itemSubtotal;
                            }
                        } else {
                            // If no cost_price, profit = revenue (can't calculate actual profit)
                            saleProfit += itemSubtotal;
                        }
                    }
                }
            } catch (e) {
                console.error('Error calculating profit:', e);
            }
            
            const row = document.createElement('tr');
            
            // Status badge
            let statusBadge = '';
            if (sale.requires_admin_approval) {
                if (sale.admin_approved === null) {
                    statusBadge = '<span class="badge badge-warning">Kutilmoqda</span>';
                } else if (sale.admin_approved === true) {
                    statusBadge = '<span class="badge badge-success">Tasdiqlandi</span>';
                } else {
                    statusBadge = '<span class="badge badge-danger">Rad etildi</span>';
                }
            } else {
                statusBadge = '<span class="badge badge-info">Tasdiqlangan</span>';
            }
            
            row.innerHTML = `
                <td>${sale.id}</td>
                <td>${formatDate(sale.created_at)}</td>
                <td>${sale.customer_name}</td>
                <td>${sale.seller_name}</td>
                <td>${formatMoney(sale.total_amount)}</td>
                <td style="color: ${saleProfit >= 0 ? '#10b981' : '#ef4444'}; font-weight: 600;">${formatMoney(saleProfit)}</td>
                <td><span class="badge badge-info">${paymentMethodText}</span></td>
                <td>${statusBadge}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn action-btn-view" onclick="viewSaleDetails(${sale.id})" title="Batafsil">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${sale.requires_admin_approval && sale.admin_approved === null ? `
                            <button class="action-btn action-btn-success" onclick="approveSale(${sale.id})" title="Tasdiqlash">
                                <i class="fas fa-check"></i>
                            </button>
                            <button class="action-btn action-btn-danger" onclick="rejectSale(${sale.id})" title="Rad etish">
                                <i class="fas fa-times"></i>
                            </button>
                        ` : `
                            <button class="action-btn action-btn-edit" onclick="editSaleInAdmin(${sale.id})" title="Tahrirlash">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn action-btn-view" onclick="viewSaleReceipt(${sale.id})" title="Ko'rish">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="action-btn action-btn-print" onclick="printSaleReceipt(${sale.id})" title="Chop etish">
                                <i class="fas fa-print"></i>
                            </button>
                            <button class="action-btn action-btn-delete" onclick="deleteSale(${sale.id})" title="Bekor qilish">
                                <i class="fas fa-times"></i>
                            </button>
                        `}
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        }
        
        // Get total sales count - use filtered length if filters are active
        const totalSalesCount = hasFilters ? sales.length : (() => {
            try {
                // Try to get from stats API for unfiltered view
                const stats = fetch(`${API_BASE}/statistics`).then(r => r.json()).catch(() => ({}));
                return stats.total_sales || sales.length || 0;
            } catch (e) {
                return sales.length < salesPerPage 
                    ? (currentSalePage - 1) * salesPerPage + sales.length 
                    : (currentSalePage * salesPerPage) + sales.length;
            }
        })();
        
        // Use filtered count if filters active, otherwise use API estimate
        const displayTotal = hasFilters ? sales.length : (async () => {
            try {
                const stats = await fetch(`${API_BASE}/statistics`).then(r => r.json()).catch(() => ({}));
                return stats.total_sales || sales.length || 0;
            } catch (error) {
                console.error('Error getting sales count:', error);
                return sales.length < salesPerPage 
                    ? (currentSalePage - 1) * salesPerPage + sales.length 
                    : (currentSalePage * salesPerPage) + sales.length;
            }
        })();
        
        const finalTotal = await (typeof displayTotal === 'number' ? Promise.resolve(displayTotal) : displayTotal);
        
        renderPagination('sales-pagination', currentSalePage, salesPerPage, finalTotal, (page) => {
            currentSalePage = page;
            loadSales();
        });
    } catch (error) {
        console.error('Error loading sales:', error);
    }
}

// Load sellers for filter dropdown
async function loadSellersForFilter() {
    try {
        const sellers = await fetch(`${API_BASE}/sellers`).then(r => r.json());
        allSellersForSaleFilter = sellers;
        const select = document.getElementById('sale-seller-filter');
        if (!select) return;
        
        // Keep current selection
        const currentValue = select.value;
        select.innerHTML = '<option value="">Barcha sotuvchilar</option>';
        sellers.forEach(seller => {
            const option = document.createElement('option');
            option.value = seller.id;
            option.textContent = seller.name;
            select.appendChild(option);
        });
        if (currentValue) {
            select.value = currentValue;
        }
    } catch (error) {
        console.error('Error loading sellers for filter:', error);
    }
}

// Load customers for sale filter search
async function loadCustomersForSaleFilter() {
    try {
        const customers = await fetch(`${API_BASE}/customers?limit=1000`).then(r => r.json());
        allCustomersForSaleFilter = customers;
    } catch (error) {
        console.error('Error loading customers for filter:', error);
    }
}

// Handle customer search for sale filter
function handleSaleCustomerSearch() {
    const searchInput = document.getElementById('sale-customer-search');
    const query = searchInput?.value?.toLowerCase() || '';
    
    if (!query) {
        selectedCustomerIdForSaleFilter = null;
        loadSales();
        return;
    }
    
    // Find matching customer
    const match = allCustomersForSaleFilter.find(c => 
        (c.name && c.name.toLowerCase().includes(query)) ||
        (c.phone && c.phone.includes(query))
    );
    
    if (match) {
        selectedCustomerIdForSaleFilter = match.id;
        loadSales();
    } else {
        // If no match, clear selection
        if (selectedCustomerIdForSaleFilter) {
            selectedCustomerIdForSaleFilter = null;
            loadSales();
        }
    }
}

// Clear sale filters
function clearSaleFilters() {
    document.getElementById('sale-start-date').value = '';
    document.getElementById('sale-end-date').value = '';
    document.getElementById('sale-customer-search').value = '';
    document.getElementById('sale-seller-filter').value = '';
    document.getElementById('sale-status-filter').value = '';
    selectedCustomerIdForSaleFilter = null;
    currentSalePage = 1; // Reset to first page
    loadSales();
}

// Reset page when filters change
document.addEventListener('DOMContentLoaded', () => {
    // Add event listeners for filter changes to reset page
    const saleFilters = ['sale-start-date', 'sale-end-date', 'sale-seller-filter', 'sale-status-filter'];
    saleFilters.forEach(filterId => {
        const element = document.getElementById(filterId);
        if (element) {
            element.addEventListener('change', () => {
                currentSalePage = 1;
            });
        }
    });
});

// Edit sale in admin panel (opens modal for editing)
async function editSaleInAdmin(saleId) {
    try {
        // Fetch sale data
        const sale = await fetch(`${API_BASE}/sales/${saleId}`).then(r => r.json());
        
        // Populate modal
        document.getElementById('edit-sale-id').value = sale.id;
        document.getElementById('edit-sale-customer-id').value = sale.customer_id;
        document.getElementById('edit-sale-payment-method').value = sale.payment_method || 'cash';
        
        // Load customers for dropdown
        const customersRes = await fetch(`${API_BASE}/customers?limit=1000`).then(r => r.json());
        const customerSelect = document.getElementById('edit-sale-customer-select');
        customerSelect.innerHTML = '<option value="">Mijozni tanlang</option>';
        customersRes.forEach(customer => {
            const option = document.createElement('option');
            option.value = customer.id;
            option.textContent = `${customer.name} (${customer.phone || 'Tel. yo\'q'})`;
            if (customer.id === sale.customer_id) {
                option.selected = true;
            }
            customerSelect.appendChild(option);
        });
        
        // Update product prices when customer changes
        customerSelect.addEventListener('change', function() {
            updateProductPricesForCustomer();
        });
        
        // Load sale items
        const saleItemsContainer = document.getElementById('edit-sale-items');
        saleItemsContainer.innerHTML = '';
        
        // Load all products
        const productsRes = await fetch(`${API_BASE}/products?limit=1000`).then(r => r.json());
        
        // Get customer to determine price type
        const customer = customersRes.find(c => c.id === sale.customer_id);
        const customerType = customer ? customer.customer_type : 'regular';
        
        sale.items.forEach((item, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'edit-sale-item';
            itemDiv.dataset.itemIndex = index;
            
            // Calculate price per unit from item data
            const unitPrice = item.unit_price || (item.subtotal / (item.requested_quantity || 1));
            
            itemDiv.innerHTML = `
                <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr auto; gap: 0.5rem; align-items: center;">
                    <select class="edit-sale-item-product" required>
                        <option value="">Mahsulot tanlang</option>
                        ${productsRes.map(p => {
                            // Get price based on customer type
                            let price = p.regular_price || 0;
                            if (customerType === 'wholesale') {
                                price = p.wholesale_price || 0;
                            } else if (customerType === 'retail') {
                                price = p.retail_price || 0;
                            }
                            
                            return `<option value="${p.id}" ${p.id === item.product_id ? 'selected' : ''} data-price="${price}" data-wholesale="${p.wholesale_price || 0}" data-retail="${p.retail_price || 0}" data-regular="${p.regular_price || 0}">${escapeHtml(p.name)}</option>`;
                        }).join('')}
                    </select>
                    <input type="number" class="edit-sale-item-quantity" value="${item.requested_quantity || 1}" min="1" required placeholder="Miqdor">
                    <input type="number" class="edit-sale-item-price" value="${unitPrice.toFixed(2)}" step="0.01" min="0" required placeholder="Narx" readonly>
                    <input type="number" class="edit-sale-item-subtotal" value="${item.subtotal || 0}" step="0.01" min="0" readonly placeholder="Jami">
                    <button type="button" class="btn btn-danger btn-sm" onclick="removeEditSaleItem(this)" title="O'chirish">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
            saleItemsContainer.appendChild(itemDiv);
            
            // Add event listeners for calculation
            const quantityInput = itemDiv.querySelector('.edit-sale-item-quantity');
            const priceInput = itemDiv.querySelector('.edit-sale-item-price');
            const productSelectEl = itemDiv.querySelector('.edit-sale-item-product');
            
            // Store customer type in select element for price updates
            productSelectEl.dataset.customerType = customerType;
            
            productSelectEl.addEventListener('change', function() {
                const selectedOption = this.options[this.selectedIndex];
                if (selectedOption) {
                    const customerType = this.dataset.customerType || 'regular';
                    let price = 0;
                    if (customerType === 'wholesale') {
                        price = parseFloat(selectedOption.dataset.wholesale) || 0;
                    } else if (customerType === 'retail') {
                        price = parseFloat(selectedOption.dataset.retail) || 0;
                    } else {
                        price = parseFloat(selectedOption.dataset.regular) || 0;
                    }
                    priceInput.value = price.toFixed(2);
                    updateEditSaleItemSubtotal(itemDiv);
                }
            });
            
            quantityInput.addEventListener('input', () => updateEditSaleItemSubtotal(itemDiv));
            priceInput.addEventListener('input', () => updateEditSaleItemSubtotal(itemDiv));
        });
        
        // Update total
        updateEditSaleTotal();
        
        // Show modal
        document.getElementById('edit-sale-modal').style.display = 'block';
    } catch (error) {
        console.error('Error loading sale for editing:', error);
        alert('Xatolik: ' + (error.message || 'Noma\'lum xatolik'));
    }
}

function updateEditSaleItemSubtotal(itemDiv) {
    const quantity = parseFloat(itemDiv.querySelector('.edit-sale-item-quantity').value) || 0;
    const price = parseFloat(itemDiv.querySelector('.edit-sale-item-price').value) || 0;
    const subtotal = quantity * price;
    itemDiv.querySelector('.edit-sale-item-subtotal').value = subtotal.toFixed(2);
    updateEditSaleTotal();
}

function addEditSaleItem() {
    const container = document.getElementById('edit-sale-items');
    
    // Get customer type from current selection
    const customerSelect = document.getElementById('edit-sale-customer-select');
    const selectedCustomerId = customerSelect.value;
    
    // Get customer type - fetch if needed or use cached data
    fetch(`${API_BASE}/customers?limit=1000`)
        .then(r => r.json())
        .then(customers => {
            const customer = customers.find(c => c.id == selectedCustomerId);
            const customerType = customer ? customer.customer_type : 'regular';
            
            // Load products
            return fetch(`${API_BASE}/products?limit=1000`)
                .then(r => r.json())
                .then(products => {
                    const itemDiv = document.createElement('div');
                    itemDiv.className = 'edit-sale-item';
                    
                    itemDiv.innerHTML = `
                        <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr auto; gap: 0.5rem; align-items: center;">
                            <select class="edit-sale-item-product" required>
                                <option value="">Mahsulot tanlang</option>
                                ${products.map(p => {
                                    let price = p.regular_price || 0;
                                    if (customerType === 'wholesale') {
                                        price = p.wholesale_price || 0;
                                    } else if (customerType === 'retail') {
                                        price = p.retail_price || 0;
                                    }
                                    return `<option value="${p.id}" data-price="${price}" data-wholesale="${p.wholesale_price || 0}" data-retail="${p.retail_price || 0}" data-regular="${p.regular_price || 0}">${escapeHtml(p.name)}</option>`;
                                }).join('')}
                            </select>
                            <input type="number" class="edit-sale-item-quantity" value="1" min="1" required placeholder="Miqdor">
                            <input type="number" class="edit-sale-item-price" value="0" step="0.01" min="0" required placeholder="Narx" readonly>
                            <input type="number" class="edit-sale-item-subtotal" value="0" step="0.01" min="0" readonly placeholder="Jami">
                            <button type="button" class="btn btn-danger btn-sm" onclick="removeEditSaleItem(this)" title="O'chirish">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    `;
                    container.appendChild(itemDiv);
                    
                    // Add event listeners
                    const quantityInput = itemDiv.querySelector('.edit-sale-item-quantity');
                    const priceInput = itemDiv.querySelector('.edit-sale-item-price');
                    const productSelect = itemDiv.querySelector('.edit-sale-item-product');
                    
                    // Store customer type
                    productSelect.dataset.customerType = customerType;
                    
                    productSelect.addEventListener('change', function() {
                        const selectedOption = this.options[this.selectedIndex];
                        if (selectedOption) {
                            const customerType = this.dataset.customerType || 'regular';
                            let price = 0;
                            if (customerType === 'wholesale') {
                                price = parseFloat(selectedOption.dataset.wholesale) || 0;
                            } else if (customerType === 'retail') {
                                price = parseFloat(selectedOption.dataset.retail) || 0;
                            } else {
                                price = parseFloat(selectedOption.dataset.regular) || 0;
                            }
                            priceInput.value = price.toFixed(2);
                            updateEditSaleItemSubtotal(itemDiv);
                        }
                    });
                    
                    quantityInput.addEventListener('input', () => updateEditSaleItemSubtotal(itemDiv));
                    priceInput.addEventListener('input', () => updateEditSaleItemSubtotal(itemDiv));
                    
                    // Also update prices when customer changes
                    customerSelect.addEventListener('change', function() {
                        updateProductPricesForCustomer();
                    });
                });
        })
        .catch(error => {
            console.error('Error loading products:', error);
            alert('Mahsulotlarni yuklashda xatolik yuz berdi');
        });
}

function updateProductPricesForCustomer() {
    const customerSelect = document.getElementById('edit-sale-customer-select');
    const selectedCustomerId = customerSelect.value;
    
    if (!selectedCustomerId) return;
    
    fetch(`${API_BASE}/customers?limit=1000`)
        .then(r => r.json())
        .then(customers => {
            const customer = customers.find(c => c.id == selectedCustomerId);
            const customerType = customer ? customer.customer_type : 'regular';
            
            // Update all product selects
            document.querySelectorAll('.edit-sale-item-product').forEach(select => {
                select.dataset.customerType = customerType;
                const currentValue = select.value;
                if (currentValue) {
                    const selectedOption = select.options[select.selectedIndex];
                    if (selectedOption) {
                        let price = 0;
                        if (customerType === 'wholesale') {
                            price = parseFloat(selectedOption.dataset.wholesale) || 0;
                        } else if (customerType === 'retail') {
                            price = parseFloat(selectedOption.dataset.retail) || 0;
                        } else {
                            price = parseFloat(selectedOption.dataset.regular) || 0;
                        }
                        
                        const itemDiv = select.closest('.edit-sale-item');
                        const priceInput = itemDiv.querySelector('.edit-sale-item-price');
                        priceInput.value = price.toFixed(2);
                        updateEditSaleItemSubtotal(itemDiv);
                    }
                }
            });
        });
}

function removeEditSaleItem(button) {
    button.closest('.edit-sale-item').remove();
    updateEditSaleTotal();
}

function updateEditSaleTotal() {
    const items = document.querySelectorAll('.edit-sale-item');
    let total = 0;
    items.forEach(item => {
        const subtotal = parseFloat(item.querySelector('.edit-sale-item-subtotal').value) || 0;
        total += subtotal;
    });
    document.getElementById('edit-sale-total').textContent = formatMoney(total);
}

async function saveEditedSale(event) {
    event.preventDefault();
    
    const saleId = document.getElementById('edit-sale-id').value;
    const customerId = document.getElementById('edit-sale-customer-select').value;
    const paymentMethod = document.getElementById('edit-sale-payment-method').value;
    
    if (!customerId) {
        alert('Mijozni tanlang');
        return;
    }
    
    // Collect items
    const items = [];
    const itemDivs = document.querySelectorAll('.edit-sale-item');
    
    if (itemDivs.length === 0) {
        alert('Kamida bitta mahsulot qo\'shing');
        return;
    }
    
    itemDivs.forEach(itemDiv => {
        const productId = itemDiv.querySelector('.edit-sale-item-product').value;
        const quantity = parseInt(itemDiv.querySelector('.edit-sale-item-quantity').value);
        
        if (productId && quantity > 0) {
            items.push({
                product_id: parseInt(productId),
                requested_quantity: quantity
            });
        }
    });
    
    if (items.length === 0) {
        alert('Kamida bitta mahsulot qo\'shing');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/sales/${saleId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                customer_id: parseInt(customerId),
                items: items,
                payment_method: paymentMethod
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Xatolik yuz berdi');
        }
        
        alert('Sotuv muvaffaqiyatli yangilandi');
        closeModal('edit-sale-modal');
        loadSales();
    } catch (error) {
        console.error('Error updating sale:', error);
        alert('Xatolik: ' + (error.message || 'Noma\'lum xatolik'));
    }
}

// Delete/Cancel sale
async function deleteSale(saleId) {
    if (!confirm(`Sotuv #${saleId} ni bekor qilmoqchimisiz? Bu amalni qaytarib bo'lmaydi.`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/sales/${saleId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            alert('Sotuv muvaffaqiyatli bekor qilindi');
            loadSales();
        } else {
            const error = await response.json();
            alert('Xatolik: ' + (error.detail || 'Noma\'lum xatolik'));
        }
    } catch (error) {
        console.error('Error deleting sale:', error);
        alert('Xatolik yuz berdi');
    }
}

// Load pending sales count
async function loadPendingSalesCount() {
    try {
        const response = await fetch(`${API_BASE}/sales/pending`);
        if (response.ok) {
            const sales = await response.json();
            const countEl = document.getElementById('pending-sales-count');
            if (countEl) {
                countEl.textContent = sales.length;
            }
        }
    } catch (error) {
        console.error('Error loading pending sales count:', error);
    }
}

// Load pending sales
async function loadPendingSales() {
    try {
        const tbody = document.getElementById('pending-sales-tbody');
        const section = document.getElementById('pending-sales-section');
        if (!tbody) return;
        
        tbody.innerHTML = '<tr><td colspan="10" class="text-center">Yuklanmoqda...</td></tr>';

        const response = await fetch(`${API_BASE}/sales/pending`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const sales = await response.json();

        if (sales.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" class="text-center">Ruxsat kutayotgan sotuvlar topilmadi</td></tr>';
            if (section) section.style.display = 'none';
            return;
        }

        if (section) section.style.display = 'block';

        tbody.innerHTML = sales.map(sale => {
            const saleDate = formatDate(sale.created_at);
            const paymentMethodMap = { 'cash': 'Naqd', 'card': 'Karta', 'bank_transfer': 'Hisob raqam' };
            const paymentMethod = paymentMethodMap[sale.payment_method] || sale.payment_method || 'Naqd';
            
            const paymentAmount = sale.payment_amount || 0;
            const debtOrReturn = paymentAmount - sale.total_amount;
            let debtOrReturnText = '';
            let debtOrReturnClass = '';
            let excessActionInfo = '';
            
            if (debtOrReturn > 0) {
                // Customer paid more
                const excessAction = sale.excess_action || 'return';
                if (excessAction === 'debt') {
                    debtOrReturnText = `Qaytma: ${formatMoney(debtOrReturn)} (qarzga qo'shiladi)`;
                    excessActionInfo = `<small style="display: block; color: #0369a1; margin-top: 0.25rem;"><i class="fas fa-info-circle"></i> Qarzga qo'shish tanlangan</small>`;
                } else {
                    debtOrReturnText = `Qaytma: ${formatMoney(debtOrReturn)}`;
                }
                debtOrReturnClass = 'text-success';
            } else if (debtOrReturn < 0) {
                // Customer paid less
                debtOrReturnText = `Qarz: ${formatMoney(Math.abs(debtOrReturn))}`;
                debtOrReturnClass = 'text-danger';
                excessActionInfo = `<small style="display: block; color: #dc2626; margin-top: 0.25rem;"><i class="fas fa-exclamation-triangle"></i> Qarzga yoziladi</small>`;
            } else {
                // Exact payment
                debtOrReturnText = 'To\'liq to\'langan';
                debtOrReturnClass = 'text-info';
            }

            return `
                <tr>
                    <td>${sale.id}</td>
                    <td>${saleDate}</td>
                    <td>${escapeHtml(sale.customer_name)}</td>
                    <td>${escapeHtml(sale.seller_name)}</td>
                    <td><strong>${formatMoney(sale.total_amount)}</strong></td>
                    <td><strong>${formatMoney(paymentAmount)}</strong></td>
                    <td class="${debtOrReturnClass}">
                        <strong>${debtOrReturnText}</strong>
                        ${excessActionInfo}
                    </td>
                    <td><span class="badge badge-info">${paymentMethod}</span></td>
                    <td><span class="badge badge-warning">Kutilmoqda</span></td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn action-btn-success" onclick="approveSale(${sale.id})" title="Tasdiqlash">
                                <i class="fas fa-check"></i>
                            </button>
                            <button class="action-btn action-btn-danger" onclick="rejectSale(${sale.id})" title="Rad etish">
                                <i class="fas fa-times"></i>
                            </button>
                            <button class="action-btn action-btn-view" onclick="viewSaleDetails(${sale.id})" title="Batafsil">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
        
        loadPendingSalesCount();
    } catch (error) {
        console.error('Error loading pending sales:', error);
        const tbody = document.getElementById('pending-sales-tbody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="10" class="text-center" style="color: red;">Xatolik: ${error.message}</td></tr>`;
        }
    }
}

// Approve sale
async function approveSale(saleId) {
    try {
        // First fetch sale details to show payment info
        const saleResponse = await fetch(`${API_BASE}/sales/${saleId}`);
        if (!saleResponse.ok) {
            throw new Error('Sotuv topilmadi');
        }
        const sale = await saleResponse.json();
        
        // Fetch customer details to get debt balance
        let customer = null;
        let customerDebtInfo = '';
        try {
            const customerResponse = await fetch(`${API_BASE}/customers/${sale.customer_id}`);
            if (customerResponse.ok) {
                customer = await customerResponse.json();
                const currentDebt = customer.debt_balance || 0;
                const debtLimit = customer.debt_limit;
                
                customerDebtInfo = `\n\n📊 Mijoz qarzi:\n   Joriy qarz: ${formatMoney(currentDebt)}`;
                if (debtLimit !== null && debtLimit !== undefined) {
                    customerDebtInfo += `\n   Qarz limiti: ${formatMoney(debtLimit)}`;
                    const remainingLimit = debtLimit - currentDebt;
                    customerDebtInfo += `\n   Qolgan limit: ${formatMoney(remainingLimit)}`;
                } else {
                    customerDebtInfo += `\n   Qarz limiti: Cheksiz`;
                }
            }
        } catch (e) {
            console.error('Error fetching customer:', e);
        }
        
        // Calculate payment details
        const paymentAmount = sale.payment_amount || sale.total_amount;
        const totalAmount = sale.total_amount;
        const difference = paymentAmount - totalAmount;
        
        let paymentInfo = '';
        let newDebtInfo = '';
        if (difference > 0) {
            const excessAction = sale.excess_action || 'return';
            if (excessAction === 'debt') {
                paymentInfo = `\n\n💰 To'langan: ${formatMoney(paymentAmount)}\n📊 Qaytma: ${formatMoney(difference)} (qarzga qo'shiladi)`;
                if (customer) {
                    const currentDebt = customer.debt_balance || 0;
                    const newDebt = Math.max(0, currentDebt - difference); // Qarz kamayadi
                    newDebtInfo = `\n   Yangi qarz: ${formatMoney(newDebt)}`;
                }
            } else {
                paymentInfo = `\n\n💰 To'langan: ${formatMoney(paymentAmount)}\n📊 Qaytma: ${formatMoney(difference)} (qaytariladi)`;
            }
        } else if (difference < 0) {
            paymentInfo = `\n\n💰 To'langan: ${formatMoney(paymentAmount)}\n⚠️ Qarz: ${formatMoney(Math.abs(difference))} (qarzga yoziladi)`;
            if (customer) {
                const currentDebt = customer.debt_balance || 0;
                const newDebt = currentDebt + Math.abs(difference);
                newDebtInfo = `\n   Yangi qarz: ${formatMoney(newDebt)}`;
            }
        } else {
            paymentInfo = `\n\n💰 To'langan: ${formatMoney(paymentAmount)}\n✅ To'liq to'landi`;
        }
        
        const confirmMessage = `Sotuvni tasdiqlashga ishonchingiz komilmi?\n\n📋 Sotuv № ${saleId}\n👤 Mijoz: ${sale.customer_name}${customerDebtInfo}${paymentInfo}${newDebtInfo}\n\n💵 Jami summa: ${formatMoney(totalAmount)}\n\nTasdiqlanganda ombordan mahsulotlar ayiriladi.`;
        
        if (!confirm(confirmMessage)) return;
        
        // Get admin ID from localStorage or API
        let adminId = localStorage.getItem('admin_id') || localStorage.getItem('seller_id');
        if (!adminId) {
            // Try to get from API
            try {
                const meResponse = await fetch(`${API_BASE}/auth/me`);
                if (meResponse.ok) {
                    const userData = await meResponse.json();
                    adminId = userData.id;
                }
            } catch (e) {
                console.error('Error fetching user data:', e);
            }
        }
        
        if (!adminId) {
            alert('Admin ID topilmadi. Iltimos, qayta kiring.');
            return;
        }
        
        adminId = parseInt(adminId);
        
        const formData = new FormData();
        formData.append('approved', 'true'); // String 'true', FastAPI will convert to bool
        formData.append('admin_id', adminId.toString()); // Ensure it's a string

        const response = await fetch(`${API_BASE}/sales/${saleId}/approve`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            let errorMessage = 'Sotuvni tasdiqlashda xatolik';
            try {
                const error = await response.json();
                errorMessage = error.detail || error.message || errorMessage;
            } catch (e) {
                // If response is not JSON, use status text
                errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            }
            throw new Error(errorMessage);
        }
        
        const result = await response.json();
        
        // Show success message with details
        let successMessage = 'Sotuv muvaffaqiyatli tasdiqlandi!';
        if (difference < 0) {
            successMessage += `\n\n⚠️ Qarz qo'shildi: ${formatMoney(Math.abs(difference))}`;
        } else if (difference > 0 && sale.excess_action === 'debt') {
            successMessage += `\n\n✅ Qaytma qarzga qo'shildi: ${formatMoney(difference)}`;
        }
        
        alert(successMessage);
        loadPendingSales();
        loadPendingSalesCount();
        loadSales(); // Refresh main sales list
        loadDashboard(); // Refresh dashboard stats
    } catch (error) {
        console.error('Error approving sale:', error);
        alert('Xatolik: ' + error.message);
    }
}

// Reject sale
async function rejectSale(saleId) {
    if (!confirm('Sotuvni rad etishga ishonchingiz komilmi? Bu qaytarib bo\'lmaydi.')) return;
    try {
        // Get admin ID from localStorage or API
        let adminId = localStorage.getItem('admin_id') || localStorage.getItem('seller_id');
        if (!adminId) {
            // Try to get from API
            try {
                const meResponse = await fetch(`${API_BASE}/auth/me`);
                if (meResponse.ok) {
                    const userData = await meResponse.json();
                    adminId = userData.id;
                }
            } catch (e) {
                console.error('Error fetching user data:', e);
            }
        }
        
        if (!adminId) {
            alert('Admin ID topilmadi. Iltimos, qayta kiring.');
            return;
        }
        
        adminId = parseInt(adminId);
        
        const formData = new FormData();
        formData.append('approved', 'false'); // String 'false', FastAPI will convert to bool
        formData.append('admin_id', adminId.toString()); // Ensure it's a string

        const response = await fetch(`${API_BASE}/sales/${saleId}/approve`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            let errorMessage = 'Sotuvni rad etishda xatolik';
            try {
                const error = await response.json();
                errorMessage = error.detail || error.message || errorMessage;
            } catch (e) {
                // If response is not JSON, use status text
                errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            }
            throw new Error(errorMessage);
        }
        
        const result = await response.json();
        alert(result.message || 'Sotuv muvaffaqiyatli rad etildi!');
        loadPendingSales();
        loadPendingSalesCount();
        loadSales(); // Refresh main sales list
        loadDashboard(); // Refresh dashboard stats
    } catch (error) {
        console.error('Error rejecting sale:', error);
        alert('Xatolik: ' + error.message);
    }
}

async function viewSaleDetails(saleId) {
    try {
        const sale = await fetch(`${API_BASE}/sales/${saleId}`).then(r => r.json());
        
        // Calculate profit for each item
        let totalProfit = 0;
        let totalCost = 0;
        
        const itemsWithProfit = await Promise.all(sale.items.map(async (item) => {
            const product = await fetch(`${API_BASE}/products/${item.product_id}`).then(r => r.json()).catch(() => null);
            if (product) {
                const costPrice = product.cost_price;
                const itemSubtotal = item.subtotal || 0;
                const itemQuantity = item.requested_quantity || 0;
                let cost = 0;
                let profit = itemSubtotal;
                
                if (costPrice && costPrice > 0 && itemQuantity > 0) {
                    // Safety check: if cost_price is unreasonably high (more than 2x the sale price), ignore it
                    const itemPricePerPiece = itemSubtotal / itemQuantity;
                    if (costPrice <= itemPricePerPiece * 2) {
                        cost = costPrice * itemQuantity;
                        profit = itemSubtotal - cost;
                    } else {
                        // Cost price seems incorrect (too high), skip cost calculation
                        cost = 0;
                        profit = itemSubtotal;
                    }
                } else {
                    // If no cost_price, can't calculate actual profit
                    cost = 0;
                    profit = itemSubtotal;
                }
                
                totalCost += cost;
                totalProfit += profit;
                return { ...item, cost, profit, product };
            }
            return { ...item, cost: 0, profit: item.subtotal, product: null };
        }));
        
        // Payment details
        const paymentAmount = sale.payment_amount || sale.total_amount;
        const totalAmount = sale.total_amount;
        const difference = paymentAmount - totalAmount;
        let paymentDetailsHtml = '';
        
        if (difference > 0) {
            const excessAction = sale.excess_action || 'return';
            if (excessAction === 'debt') {
                paymentDetailsHtml = `
                    <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 1rem; margin: 1rem 0;">
                        <strong style="color: #92400e;">💵 To'langan:</strong> ${formatMoney(paymentAmount)}<br>
                        <strong style="color: #0369a1;">💰 Qaytma (qarzga qo'shiladi):</strong> ${formatMoney(difference)}
                    </div>
                `;
            } else {
                paymentDetailsHtml = `
                    <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 1rem; margin: 1rem 0;">
                        <strong style="color: #166534;">💵 To'langan:</strong> ${formatMoney(paymentAmount)}<br>
                        <strong style="color: #10b981;">💰 Qaytma:</strong> ${formatMoney(difference)}
                    </div>
                `;
            }
        } else if (difference < 0) {
            paymentDetailsHtml = `
                <div style="background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; padding: 1rem; margin: 1rem 0;">
                    <strong style="color: #991b1b;">💵 To'langan:</strong> ${formatMoney(paymentAmount)}<br>
                    <strong style="color: #dc2626;">⚠️ Qarz (qarzga yoziladi):</strong> ${formatMoney(Math.abs(difference))}
                </div>
            `;
        } else {
            paymentDetailsHtml = `
                <div style="background: #f0f9ff; border: 1px solid #93c5fd; border-radius: 8px; padding: 1rem; margin: 1rem 0;">
                    <strong style="color: #1e40af;">💵 To'langan:</strong> ${formatMoney(paymentAmount)}<br>
                    <strong style="color: #10b981;">✅ To'liq to'landi</strong>
                </div>
            `;
        }
        
        let detailsHtml = `
            <h2>Sotuv detallari #${sale.id}</h2>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin: 1rem 0;">
                <div><strong>Sana:</strong> ${formatDate(sale.created_at)}</div>
                <div><strong>Mijoz:</strong> ${sale.customer_name}</div>
                <div><strong>Sotuvchi:</strong> ${sale.seller_name}</div>
                <div><strong>To'lov usuli:</strong> ${sale.payment_method === 'cash' ? 'Naqd' : sale.payment_method === 'card' ? 'Plastik' : 'Hisob raqam'}</div>
            </div>
            <div style="margin: 1rem 0;">
                <strong>📊 Jami summa:</strong> ${formatMoney(totalAmount)}
            </div>
            ${paymentDetailsHtml}
            <h3>Mahsulotlar:</h3>
            <table style="width: 100%; margin-top: 1rem; border-collapse: collapse;">
                <thead>
                    <tr style="background: #f3f4f6; border-bottom: 2px solid #e5e7eb;">
                        <th style="padding: 0.75rem; text-align: left;">Mahsulot</th>
                        <th style="padding: 0.75rem; text-align: center;">Miqdor</th>
                        <th style="padding: 0.75rem; text-align: center;">Qop</th>
                        <th style="padding: 0.75rem; text-align: center;">Dona</th>
                        <th style="padding: 0.75rem; text-align: right;">Narx</th>
                        <th style="padding: 0.75rem; text-align: right;">Qiymat</th>
                        <th style="padding: 0.75rem; text-align: right;">Foyda</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        itemsWithProfit.forEach(item => {
            const profitColor = item.profit >= 0 ? '#10b981' : '#ef4444';
            detailsHtml += `
                <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 0.75rem;">${item.product_name}</td>
                    <td style="padding: 0.75rem; text-align: center;">${item.requested_quantity} dona</td>
                    <td style="padding: 0.75rem; text-align: center;">${item.packages_sold || 0}</td>
                    <td style="padding: 0.75rem; text-align: center;">${item.pieces_sold || 0}</td>
                    <td style="padding: 0.75rem; text-align: right;">${formatMoney(item.unit_price || item.piece_price || (item.subtotal / (item.requested_quantity || 1)))}</td>
                    <td style="padding: 0.75rem; text-align: right;">${formatMoney(item.subtotal)}</td>
                    <td style="padding: 0.75rem; text-align: right; color: ${profitColor}; font-weight: 600;">${formatMoney(item.profit)}</td>
                </tr>
            `;
        });
        
        const totalProfitColor = totalProfit >= 0 ? '#10b981' : '#ef4444';
        detailsHtml += `
                </tbody>
                <tfoot style="background: #f9fafb; border-top: 2px solid #e5e7eb;">
                    <tr>
                        <td colspan="5" style="padding: 1rem; text-align: right; font-weight: 600;">Jami:</td>
                        <td style="padding: 1rem; text-align: right; font-weight: 600;">${formatMoney(sale.total_amount)}</td>
                        <td style="padding: 1rem; text-align: right; font-weight: 700; color: ${totalProfitColor}; font-size: 1.1rem;">${formatMoney(totalProfit)}</td>
                    </tr>
                    <tr>
                        <td colspan="6" style="padding: 0.5rem 1rem; text-align: right; color: #6b7280;">Qiymat (xarajat):</td>
                        <td style="padding: 0.5rem 1rem; text-align: right; color: #6b7280;">${formatMoney(totalCost)}</td>
                    </tr>
                </tfoot>
            </table>
        `;
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 900px; max-height: 90vh; overflow-y: auto;">
                <span class="close" onclick="this.parentElement.parentElement.remove()" style="position: absolute; top: 1rem; right: 1rem; cursor: pointer; font-size: 2rem; color: #6b7280;">&times;</span>
                ${detailsHtml}
            </div>
        `;
        modal.onclick = function(e) {
            if (e.target === modal) {
                modal.remove();
            }
        };
        document.body.appendChild(modal);
    } catch (error) {
        console.error('Error:', error);
        alert('Xatolik: ' + (error.message || 'Noma\'lum xatolik'));
    }
}

function printSalesTable() {
    // Faqat jadval qismini chop etish uchun yangi oyna ochamiz
    const tableContainer = document.querySelector('#sales .table-container');
    if (!tableContainer) {
        alert('Jadval topilmadi');
        return;
    }
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Sotuvlar jadvali</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f5f5f5; }
                .action-btn { display: none !important; }
                @media print { body { padding: 0; } }
            </style>
        </head>
        <body>
            <h1>Sotuvlar hisoboti - ${new Date().toLocaleDateString('uz-UZ')}</h1>
            ${tableContainer.innerHTML}
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.onload = function() {
        printWindow.print();
        printWindow.close();
    };
}

async function viewSaleReceipt(id) {
    window.open(`${API_BASE}/sales/${id}/receipt`, '_blank');
}

// Chekni to'g'ridan-to'g'ri chop etish
async function printSaleReceipt(id) {
    try {
        const printWindow = window.open(`${API_BASE}/sales/${id}/receipt`, '_blank');
        printWindow.onload = function() {
            printWindow.print();
        };
    } catch (error) {
        console.error('Chek chop etishda xatolik:', error);
        alert('Chek chop etishda xatolik: ' + error.message);
    }
}

async function exportSales() {
    try {
        const sellerId = localStorage.getItem('admin_seller_id');
        const headers = {};
        if (sellerId) {
            headers['X-Seller-ID'] = sellerId;
        }
        
        const response = await fetch(`${API_BASE}/sales/export`, {
            headers: headers
        });
        
        if (!response.ok) {
            throw new Error('Hisobotni yuklashda xatolik');
        }
        
        // Get filename from Content-Disposition header or use default
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = 'sales_export.xlsx';
        if (contentDisposition) {
            const match = contentDisposition.match(/filename="?(.+)"?/);
            if (match) filename = match[1];
        }
        
        // Download file
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        showToast('Hisobot muvaffaqiyatli yuklandi', 'success');
    } catch (error) {
        console.error('Export error:', error);
        showToast('Hisobotni yuklashda xatolik: ' + error.message, 'error');
    }
}

// WebSocket
function setupWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'new_order' || data.type === 'new_sale') {
            // Refresh current page if on orders or sales
            const activePage = document.querySelector('.page.active').id;
            if (activePage === 'orders') loadOrders();
            if (activePage === 'sales') loadSales();
            if (activePage === 'dashboard') loadDashboard();
        }
        if (data.type === 'new_product' || data.type === 'product_updated') {
            // Refresh products page if active
            const activePage = document.querySelector('.page.active')?.id;
            if (activePage === 'products') {
                loadProducts();
            }
            if (activePage === 'dashboard') {
                loadDashboard();
            }
        }
        // Tasdiqlash yoki rad etish
        if (data.type === 'sale_approved' || data.type === 'sale_rejected') {
            const activePage = document.querySelector('.page.active').id;
            if (activePage === 'sales') loadSales();
            if (activePage === 'dashboard') loadDashboard();
            
            // Toast notification
            const message = data.type === 'sale_approved' 
                ? `✅ Sotuv #${data.sale_id} tasdiqlandi` 
                : `❌ Sotuv #${data.sale_id} rad etildi`;
            showToast(message);
        }
    };
    
    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
    
    ws.onclose = () => {
        console.log('WebSocket closed, reconnecting...');
        setTimeout(setupWebSocket, 3000);
    };
}

// Toast notification
function showToast(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Utility
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function formatMoney(amount) {
    return new Intl.NumberFormat('uz-UZ', {
        style: 'currency',
        currency: 'UZS',
        minimumFractionDigits: 0
    }).format(amount);
}

// Pagination helper
function renderPagination(containerId, currentPage, itemsPerPage, totalItems, onPageChange) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let html = '';
    if (currentPage > 1) {
        html += `<button onclick="(${onPageChange.toString()})(${currentPage - 1})">« Oldingi</button>`;
    }
    
    html += `<span class="page-info">Sahifa ${currentPage} / ${totalPages} (Jami: ${totalItems})</span>`;
    
    if (currentPage < totalPages) {
        html += `<button onclick="(${onPageChange.toString()})(${currentPage + 1})">Keyingi »</button>`;
    }
    
    container.innerHTML = html;
}

// Roles & Permissions
async function loadRoles() {
    try {
        const roles = await fetch(`${API_BASE}/roles`).then(r => r.json());
        const tbody = document.getElementById('roles-tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        // Get all sellers to count per role
        const sellers = await fetch(`${API_BASE}/sellers?limit=1000`).then(r => r.json());

        for (const role of roles) {
            const sellersCount = sellers.filter(s => s.role_id === role.id).length;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${role.id}</td>
                <td><strong>${role.name}</strong></td>
                <td>${role.description || '-'}</td>
                <td><span class="badge ${role.is_system ? 'badge-warning' : 'badge-info'}">${role.is_system ? 'Tizim' : 'Foydalanuvchi'}</span></td>
                <td>${role.permissions ? role.permissions.length : 0} ta</td>
                <td>${sellersCount} ta</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn action-btn-view" onclick="viewRolePermissions(${role.id})" title="Ruxsatlarni ko'rish">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn action-btn-edit" onclick="editRole(${role.id})" title="Tahrirlash" ${role.is_system ? 'disabled' : ''}>
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn action-btn-delete" onclick="deleteRole(${role.id})" title="O'chirish" ${role.is_system ? 'disabled' : ''}>
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        }
    } catch (error) {
        console.error('Error loading roles:', error);
        alert('Xatolik: ' + error.message);
    }
}

async function loadAllPermissions() {
    try {
        const permissions = await fetch(`${API_BASE}/permissions`).then(r => r.json());
        const tbody = document.getElementById('permissions-tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        // Group by category
        const grouped = {};
        permissions.forEach(perm => {
            if (!grouped[perm.category]) {
                grouped[perm.category] = [];
            }
            grouped[perm.category].push(perm);
        });

        Object.keys(grouped).sort().forEach(category => {
            grouped[category].forEach(perm => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><code>${perm.code}</code></td>
                    <td>${perm.name}</td>
                    <td><span class="badge badge-info">${perm.category}</span></td>
                    <td>${perm.description || '-'}</td>
                `;
                tbody.appendChild(row);
            });
        });
    } catch (error) {
        console.error('Error loading permissions:', error);
        alert('Xatolik: ' + error.message);
    }
}

async function showAddRoleModal() {
    document.getElementById('role-modal-title').textContent = 'Yangi Role';
    document.getElementById('role-form').reset();
    document.getElementById('role-id').value = '';
    
    // Enable name input for new role
    const nameInput = document.getElementById('role-name');
    nameInput.disabled = false;
    nameInput.style.backgroundColor = '';
    
    // Enable permissions for new role
    const permissionsContainer = document.getElementById('permissions-checkboxes').parentElement;
    if (permissionsContainer) {
        permissionsContainer.style.opacity = '1';
        permissionsContainer.style.pointerEvents = 'auto';
    }
    
    // Load permissions checkboxes
    await loadPermissionsCheckboxes();
    
    document.getElementById('role-modal').style.display = 'block';
}

async function loadPermissionsCheckboxes(selectedPermissionIds = []) {
    try {
        const permissions = await fetch(`${API_BASE}/permissions`).then(r => r.json());
        const container = document.getElementById('permissions-checkboxes');
        if (!container) return;
        container.innerHTML = '';

        // Group by category
        const grouped = {};
        permissions.forEach(perm => {
            if (!grouped[perm.category]) {
                grouped[perm.category] = [];
            }
            grouped[perm.category].push(perm);
        });

        Object.keys(grouped).sort().forEach(category => {
            const categoryDiv = document.createElement('div');
            categoryDiv.style.marginBottom = '1.5rem';
            categoryDiv.innerHTML = `<h4 style="margin-bottom: 0.5rem; color: var(--primary-color);">${category.toUpperCase()}</h4>`;
            
            grouped[category].forEach(perm => {
                const checkboxDiv = document.createElement('div');
                checkboxDiv.style.marginBottom = '0.5rem';
                const isChecked = selectedPermissionIds.includes(perm.id);
                checkboxDiv.innerHTML = `
                    <label style="display: flex; align-items: center; cursor: pointer;">
                        <input type="checkbox" name="permission" value="${perm.id}" ${isChecked ? 'checked' : ''} style="margin-right: 0.5rem;">
                        <span><strong>${perm.name}</strong> <code style="font-size: 0.75rem; color: var(--text-light);">${perm.code}</code></span>
                    </label>
                `;
                categoryDiv.appendChild(checkboxDiv);
            });
            
            container.appendChild(categoryDiv);
        });
    } catch (error) {
        console.error('Error loading permissions:', error);
    }
}

async function editRole(roleId) {
    try {
        const role = await fetch(`${API_BASE}/roles/${roleId}`).then(r => r.json());
        document.getElementById('role-modal-title').textContent = `Role Tahrirlash: ${role.name}`;
        document.getElementById('role-id').value = role.id;
        document.getElementById('role-name').value = role.name;
        document.getElementById('role-description').value = role.description || '';
        
        // Disable name and permissions for system roles
        const nameInput = document.getElementById('role-name');
        const permissionsContainer = document.getElementById('permissions-checkboxes').parentElement;
        if (role.is_system) {
            nameInput.disabled = true;
            nameInput.style.backgroundColor = '#f5f5f5';
            if (permissionsContainer) {
                permissionsContainer.style.opacity = '0.6';
                permissionsContainer.style.pointerEvents = 'none';
            }
        } else {
            nameInput.disabled = false;
            nameInput.style.backgroundColor = '';
            if (permissionsContainer) {
                permissionsContainer.style.opacity = '1';
                permissionsContainer.style.pointerEvents = 'auto';
            }
        }
        
        // Load permissions with selected ones checked
        const selectedIds = role.permissions ? role.permissions.map(p => p.id) : [];
        await loadPermissionsCheckboxes(selectedIds);
        
        document.getElementById('role-modal').style.display = 'block';
    } catch (error) {
        alert('Xatolik: ' + error.message);
    }
}

async function saveRole(e) {
    e.preventDefault();
    const id = document.getElementById('role-id').value;
    const selectedCheckboxes = document.querySelectorAll('#permissions-checkboxes input[type="checkbox"]:checked');
    const permissionIds = Array.from(selectedCheckboxes).map(cb => parseInt(cb.value));
    
    // Build data object - for system roles, only send description
    const data = {};
    if (id) {
        // Check if this is a system role - if so, only update description
        try {
            const existingRole = await fetch(`${API_BASE}/roles/${id}`).then(r => r.json());
            if (existingRole.is_system) {
                data.description = document.getElementById('role-description').value;
            } else {
                data.name = document.getElementById('role-name').value;
                data.description = document.getElementById('role-description').value;
                data.permission_ids = permissionIds;
            }
        } catch (error) {
            console.error('Error fetching role:', error);
            // If we can't fetch, try full update
            data.name = document.getElementById('role-name').value;
            data.description = document.getElementById('role-description').value;
            data.permission_ids = permissionIds;
        }
    } else {
        // New role
        data.name = document.getElementById('role-name').value;
        data.description = document.getElementById('role-description').value;
        data.permission_ids = permissionIds;
    }

    try {
        const url = id ? `${API_BASE}/roles/${id}` : `${API_BASE}/roles`;
        const method = id ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Xatolik yuz berdi');
        }

        closeModal('role-modal');
        loadRoles();
    } catch (error) {
        alert('Xatolik: ' + error.message);
    }
}

async function deleteRole(roleId) {
    if (!confirm('Bu roleni o\'chirishni xohlaysizmi? Sotuvchilarga tayinlangan bo\'lsa o\'chirib bo\'lmaydi.')) return;
    
    try {
        const response = await fetch(`${API_BASE}/roles/${roleId}`, { method: 'DELETE' });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Xatolik');
        }
        loadRoles();
    } catch (error) {
        alert('Xatolik: ' + error.message);
    }
}

async function viewRolePermissions(roleId) {
    try {
        const role = await fetch(`${API_BASE}/roles/${roleId}`).then(r => r.json());
        const modal = document.getElementById('role-permissions-modal');
        const title = document.getElementById('role-permissions-title');
        const list = document.getElementById('role-permissions-list');
        
        if (!modal || !title || !list) return;
        
        title.textContent = `${role.name} - Ruxsatlar`;
        
        if (!role.permissions || role.permissions.length === 0) {
            list.innerHTML = '<p>Bu roleda ruxsatlar yo\'q.</p>';
        } else {
            // Group by category
            const grouped = {};
            role.permissions.forEach(perm => {
                if (!grouped[perm.category]) {
                    grouped[perm.category] = [];
                }
                grouped[perm.category].push(perm);
            });
            
            let html = '';
            Object.keys(grouped).sort().forEach(category => {
                html += `<h4 style="margin-top: 1rem; color: var(--primary-color);">${category.toUpperCase()}</h4><ul>`;
                grouped[category].forEach(perm => {
                    html += `<li><strong>${perm.name}</strong> <code>${perm.code}</code></li>`;
                });
                html += '</ul>';
            });
            list.innerHTML = html;
        }
        
        modal.style.display = 'block';
    } catch (error) {
        alert('Xatolik: ' + error.message);
    }
}

async function viewSellerHistory(sellerId, sellerName) {
    try {
        console.log('Loading seller history for:', sellerId);
        const response = await fetch(`${API_BASE}/sellers/${sellerId}/sales-history?limit=100`);
        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            console.error('Seller history API error:', response.status, errorText);
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const sales = await response.json();
        console.log('Seller sales history loaded:', sales.length, 'sales');
        
        let historyHtml = `
            <h2 style="margin-bottom: 1rem;"><i class="fas fa-history"></i> ${escapeHtml(sellerName)} - Sotuv Tarixi</h2>
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
                            <th style="padding: 0.75rem; text-align: left; border: 1px solid #ddd;">Mijoz</th>
                            <th style="padding: 0.75rem; text-align: left; border: 1px solid #ddd;">Mahsulotlar</th>
                            <th style="padding: 0.75rem; text-align: right; border: 1px solid #ddd;">Summa</th>
                            <th style="padding: 0.75rem; text-align: left; border: 1px solid #ddd;">To'lov</th>
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
                
                historyHtml += `
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 0.75rem; border: 1px solid #ddd;">${sale.id}</td>
                        <td style="padding: 0.75rem; border: 1px solid #ddd;">${saleDate}</td>
                        <td style="padding: 0.75rem; border: 1px solid #ddd;">${escapeHtml(sale.customer_name || 'Noma\'lum')}</td>
                        <td style="padding: 0.75rem; border: 1px solid #ddd;">${escapeHtml(productsList)}</td>
                        <td style="padding: 0.75rem; text-align: right; border: 1px solid #ddd; font-weight: 600;">${formatMoney(sale.total_amount || 0)}</td>
                        <td style="padding: 0.75rem; border: 1px solid #ddd;">${paymentMethod}</td>
                        <td style="padding: 0.75rem; text-align: center; border: 1px solid #ddd;">
                            <button class="btn btn-sm btn-primary" onclick="window.open('${API_BASE}/sales/${sale.id}/receipt', '_blank')" style="padding: 0.25rem 0.5rem; font-size: 0.875rem;">
                                <i class="fas fa-receipt"></i> Chek
                            </button>
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
        console.error('Error loading seller history:', error);
        alert('Xatolik: ' + error.message);
    }
}

async function viewSellerPermissions(sellerId) {
    try {
        const permissions = await fetch(`${API_BASE}/sellers/${sellerId}/permissions`).then(r => r.json());
        const seller = await fetch(`${API_BASE}/sellers/${sellerId}`).then(r => r.json());
        
        const modal = document.getElementById('role-permissions-modal');
        const title = document.getElementById('role-permissions-title');
        const list = document.getElementById('role-permissions-list');
        
        if (!modal || !title || !list) return;
        
        title.textContent = `${seller.name} - Ruxsatlar`;
        
        if (permissions.length === 0) {
            list.innerHTML = '<p>Bu sotuvchiga ruxsatlar berilmagan.</p>';
        } else {
            // Group by category
            const grouped = {};
            permissions.forEach(perm => {
                if (!grouped[perm.category]) {
                    grouped[perm.category] = [];
                }
                grouped[perm.category].push(perm);
            });
            
            let html = '';
            Object.keys(grouped).sort().forEach(category => {
                html += `<h4 style="margin-top: 1rem; color: var(--primary-color);">${category.toUpperCase()}</h4><ul>`;
                grouped[category].forEach(perm => {
                    html += `<li><strong>${perm.name}</strong> <code>${perm.code}</code></li>`;
                });
                html += '</ul>';
            });
            list.innerHTML = html;
        }
        
        modal.style.display = 'block';
    } catch (error) {
        alert('Xatolik: ' + error.message);
    }
}

// Audit Logs
let currentAuditPage = 1;
let auditLogsPerPage = 50;

async function loadAuditLogs() {
    try {
        const productSearch = document.getElementById('audit-product-search')?.value || '';
        const actionFilter = document.getElementById('audit-action-filter')?.value || '';
        const startDate = document.getElementById('audit-start-date')?.value || '';
        const endDate = document.getElementById('audit-end-date')?.value || '';
        const skip = (currentAuditPage - 1) * auditLogsPerPage;
        
        let url = `${API_BASE}/audit-logs?skip=${skip}&limit=${auditLogsPerPage}`;
        if (actionFilter) url += `&action=${actionFilter}`;
        if (startDate) url += `&start_date=${startDate}T00:00:00`;
        if (endDate) url += `&end_date=${endDate}T23:59:59`;
        
        const [logs, countData] = await Promise.all([
            fetch(url).then(r => r.json()),
            fetch(`${API_BASE}/audit-logs/count?${actionFilter ? `action=${actionFilter}&` : ''}${startDate ? `start_date=${startDate}T00:00:00&` : ''}${endDate ? `end_date=${endDate}T23:59:59` : ''}`).then(r => r.json())
        ]);
        
        const tbody = document.getElementById('audit-logs-tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        
        // Filter by product name if search provided
        let filteredLogs = logs;
        if (productSearch) {
            filteredLogs = logs.filter(log => 
                log.product_name && log.product_name.toLowerCase().includes(productSearch.toLowerCase())
            );
        }
        
        filteredLogs.forEach(log => {
            const row = document.createElement('tr');
            const actionText = {
                'sale_created': 'Sotuv yaratilgan',
                'order_created': 'Buyurtma yaratilgan',
                'order_cancelled': 'Buyurtma bekor qilingan',
                'order_returned': 'Buyurtma qaytarilgan',
                'inventory_adjusted': 'Ombor tuzatilgan',
                'inventory_added': 'Ombor qo\'shilgan',
                'inventory_deducted': 'Ombor kamaytirilgan'
            }[log.action] || log.action;
            
            const changeClass = log.quantity_change > 0 ? 'badge-success' : log.quantity_change < 0 ? 'badge-danger' : 'badge-info';
            const changeText = log.quantity_change > 0 ? `+${log.quantity_change}` : `${log.quantity_change}`;
            
            row.innerHTML = `
                <td>${log.id}</td>
                <td>${formatDate(log.created_at)}</td>
                <td><strong>${log.user_name}</strong><br><small style="color: var(--text-light);">${log.user_type}</small></td>
                <td><span class="badge badge-info">${actionText}</span></td>
                <td>${log.product_name || '-'}</td>
                <td>${log.quantity_before !== null ? log.quantity_before : '-'}</td>
                <td>${log.quantity_after !== null ? log.quantity_after : '-'}</td>
                <td><span class="badge ${changeClass}">${changeText} dona</span></td>
                <td>${log.reason || '-'}</td>
                <td>${log.reference_type ? `${log.reference_type} #${log.reference_id}` : '-'}</td>
            `;
            tbody.appendChild(row);
        });
        
        renderPagination('audit-logs-pagination', currentAuditPage, auditLogsPerPage, countData.count, (page) => {
            currentAuditPage = page;
            loadAuditLogs();
        });
    } catch (error) {
        console.error('Error loading audit logs:', error);
        alert('Xatolik: ' + error.message);
    }
}

function clearAuditFilters() {
    document.getElementById('audit-product-search').value = '';
    document.getElementById('audit-action-filter').value = '';
    document.getElementById('audit-start-date').value = '';
    document.getElementById('audit-end-date').value = '';
    currentAuditPage = 1;
    loadAuditLogs();
}

async function deleteAuditLogs() {
    const productSearch = document.getElementById('audit-product-search')?.value || '';
    const actionFilter = document.getElementById('audit-action-filter')?.value || '';
    const startDate = document.getElementById('audit-start-date')?.value || '';
    const endDate = document.getElementById('audit-end-date')?.value || '';
    
    // Determine what will be deleted
    let deleteMessage = '';
    if (productSearch || actionFilter || startDate || endDate) {
        deleteMessage = 'Filtrlar bo\'yicha tanlangan audit loglarni o\'chirishni tasdiqlaysizmi?';
    } else {
        deleteMessage = '⚠️ EHTIYOT! Barcha audit loglarni o\'chirishni tasdiqlaysizmi?\n\nBu amalni qaytarib bo\'lmaydi!';
    }
    
    if (!confirm(deleteMessage)) {
        return;
    }
    
    try {
        // Build query parameters
        const params = new URLSearchParams();
        if (actionFilter) params.append('action', actionFilter);
        if (startDate) params.append('start_date', startDate + 'T00:00:00');
        if (endDate) params.append('end_date', endDate + 'T23:59:59');
        
        // If no filters, delete all
        if (!actionFilter && !startDate && !endDate) {
            params.append('delete_all', 'true');
        }
        
        const response = await fetch(`${API_BASE}/audit-logs?${params.toString()}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Xatolik yuz berdi');
        }
        
        const result = await response.json();
        alert(`✅ ${result.message || `${result.deleted_count} ta audit log o'chirildi`}`);
        
        // Reload audit logs
        currentAuditPage = 1;
        loadAuditLogs();
    } catch (error) {
        console.error('Error deleting audit logs:', error);
        alert('Xatolik: ' + error.message);
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}

// ==================== SETTINGS ====================

async function loadSettings() {
    try {
        const response = await fetch('/api/settings');
        if (!response.ok) throw new Error('Sozlamalarni yuklashda xatolik');
        const settings = await response.json();
        document.getElementById('store-name').value = settings.store_name || '';
        document.getElementById('store-address').value = settings.store_address || '';
        document.getElementById('store-phone').value = settings.store_phone || '';
        document.getElementById('store-email').value = settings.store_email || '';
        document.getElementById('store-inn').value = settings.store_inn || '';
        document.getElementById('store-tin').value = settings.store_tin || '';
        document.getElementById('receipt-footer-text').value = settings.receipt_footer_text || '';
        document.getElementById('receipt-show-logo').checked = settings.receipt_show_logo !== false;
        
        // Load work schedule settings
        if (settings.work_start_time) {
            document.getElementById('work-start-time').value = settings.work_start_time;
        }
        if (settings.work_end_time) {
            document.getElementById('work-end-time').value = settings.work_end_time;
        }
        if (settings.work_days) {
            const workDays = settings.work_days.split(',').map(d => d.trim());
            document.querySelectorAll('.work-day-checkbox').forEach(checkbox => {
                checkbox.checked = workDays.includes(checkbox.value);
            });
        }
        
        // Load notification settings
        document.getElementById('notify-new-sale').checked = settings.notify_new_sale !== false;
        document.getElementById('notify-low-stock').checked = settings.notify_low_stock !== false;
        document.getElementById('notify-debt-limit').checked = settings.notify_debt_limit !== false;
        document.getElementById('notify-daily-report').checked = settings.notify_daily_report !== false;
        
        if (settings.logo_url) {
            const logoPreview = document.getElementById('logo-preview');
            const noLogo = document.getElementById('no-logo');
            if (logoPreview && noLogo) {
                logoPreview.src = settings.logo_url;
                logoPreview.style.display = 'block';
                noLogo.style.display = 'none';
            }
        }
        setupSettingsListeners();
    } catch (error) {
        console.error('Error loading settings:', error);
        alert('Sozlamalarni yuklashda xatolik yuz berdi');
    }
}

function setupSettingsListeners() {
    // Logo file preview
    const logoFile = document.getElementById('logo-file');
    if (logoFile) {
        logoFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const logoPreview = document.getElementById('logo-preview');
                    const noLogo = document.getElementById('no-logo');
                    if (logoPreview && noLogo) {
                        logoPreview.src = event.target.result;
                        logoPreview.style.display = 'block';
                        noLogo.style.display = 'none';
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }
    
    // Upload logo
    const uploadBtn = document.getElementById('upload-logo-btn');
    if (uploadBtn) {
        uploadBtn.addEventListener('click', async () => {
            const logoFileInput = document.getElementById('logo-file');
            const file = logoFileInput.files[0];
            if (!file) {
                alert('Iltimos, logo faylini tanlang');
                return;
            }
            
            try {
                const formData = new FormData();
                formData.append('file', file);
                
                uploadBtn.disabled = true;
                uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Yuklanmoqda...';
                
                const response = await fetch('/api/settings/upload-logo', {
                    method: 'POST',
                    body: formData
                });
                
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.detail || 'Logo yuklashda xatolik');
                }
                
                const result = await response.json();
                
                // Update logo preview
                const logoPreview = document.getElementById('logo-preview');
                const noLogo = document.getElementById('no-logo');
                if (logoPreview) {
                    logoPreview.src = result.url;
                    logoPreview.style.display = 'block';
                }
                if (noLogo) {
                    noLogo.style.display = 'none';
                }
                
                // Save settings with new logo URL
                await saveSettings({ logo_url: result.url });
                
                alert('Logo muvaffaqiyatli yuklandi va saqlandi!');
                logoFileInput.value = '';
            } catch (error) {
                console.error('Error uploading logo:', error);
                alert('Logo yuklashda xatolik: ' + error.message);
            } finally {
                uploadBtn.disabled = false;
                uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Logo Yuklash';
            }
        });
    }
    
    // Save settings
    const saveBtn = document.getElementById('save-settings-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            await saveSettings();
        });
    }
}

async function saveSettings(additionalData = {}) {
    try {
        // Get work days
        const workDays = Array.from(document.querySelectorAll('.work-day-checkbox:checked'))
            .map(cb => cb.value)
            .join(',');
        
        const settings = {
            store_name: document.getElementById('store-name').value || null,
            store_address: document.getElementById('store-address').value || null,
            store_phone: document.getElementById('store-phone').value || null,
            store_email: document.getElementById('store-email').value || null,
            store_inn: document.getElementById('store-inn').value || null,
            store_tin: document.getElementById('store-tin').value || null,
            receipt_footer_text: document.getElementById('receipt-footer-text').value || null,
            receipt_show_logo: document.getElementById('receipt-show-logo').checked,
            work_start_time: document.getElementById('work-start-time').value || null,
            work_end_time: document.getElementById('work-end-time').value || null,
            work_days: workDays || null,
            notify_new_sale: document.getElementById('notify-new-sale').checked,
            notify_low_stock: document.getElementById('notify-low-stock').checked,
            notify_debt_limit: document.getElementById('notify-debt-limit').checked,
            notify_daily_report: document.getElementById('notify-daily-report').checked,
            ...additionalData
        };
        
        const saveBtn = document.getElementById('save-settings-btn');
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saqlanmoqda...';
        
        const sellerId = localStorage.getItem('admin_seller_id');
        const headers = {
            'Content-Type': 'application/json'
        };
        if (sellerId) {
            headers['X-Seller-ID'] = sellerId;
        }
        
        const response = await fetch('/api/settings', {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify(settings)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Sozlamalarni saqlashda xatolik');
        }
        
        alert('Sozlamalar muvaffaqiyatli saqlandi!');
    } catch (error) {
        console.error('Error saving settings:', error);
        alert('Sozlamalarni saqlashda xatolik: ' + error.message);
    } finally {
        const saveBtn = document.getElementById('save-settings-btn');
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Sozlamalarni Saqlash';
        }
    }
}
