// Professional Sale Functions
// Use API_BASE from app.js (defined in window.API_BASE)
// Don't declare const API_BASE here to avoid redeclaration error

let saleProducts = [];
let saleCustomers = [];
let saleItems = []; // Array of {product, packages, pieces, quantity, price, total}
let selectedCustomer = null;

// Initialize sale page
let saleProductBarcodeScanner = null;

async function initSalePage() {
    console.log('initSalePage called');
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
    }
    
    // Wait a bit more for elements to be fully rendered
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Load data first
    console.log('Loading sale data...');
    await loadSaleData();
    console.log('Sale data loaded');
    
    // Wait a bit more after data is loaded
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Setup event listeners
    console.log('Setting up event listeners...');
    setupSaleEventListeners();
    console.log('Event listeners set up');
    
    // Initialize barcode scanner for product search
    initSaleProductBarcodeScanner();
    
    // Update UI
    updateCurrentDate();
    updateSellerName();
    
    // Wait a bit more before rendering
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Render products grid
    renderProductsGrid();
    
    console.log('UI updated - date, seller name, and products grid rendered');
    
    console.log('initSalePage completed - products:', (typeof window !== 'undefined' && window.saleProducts) ? window.saleProducts.length : 0, 'customers:', (typeof window !== 'undefined' && window.saleCustomers) ? window.saleCustomers.length : 0);
}

// Initialize barcode scanner for new sale page product search
function initSaleProductBarcodeScanner() {
    const productSearchInput = document.getElementById('sale-product-search');
    if (!productSearchInput || !window.BarcodeScanner) {
        console.warn('Barcode scanner not available or product search input not found');
        return;
    }
    
    // Detach previous scanner if exists
    if (saleProductBarcodeScanner) {
        saleProductBarcodeScanner.detach();
    }
    
    // Create new scanner instance
    saleProductBarcodeScanner = new window.BarcodeScanner({
        minLength: 3,
        maxLength: 50,
        timeout: 100,
        onScan: (barcode) => {
            console.log('New Sale: Barcode scanned:', barcode);
            // Set search input value and trigger search
            productSearchInput.value = barcode;
            
            // Trigger product search
            const handleFn = window.handleProductSearch || handleProductSearch;
            if (typeof handleFn === 'function') {
                // Create a fake event object
                const fakeEvent = {
                    target: productSearchInput
                };
                handleFn(fakeEvent);
                
                // If there's exactly one match, add it to sale automatically
                setTimeout(() => {
                    const resultsDiv = document.getElementById('product-search-results');
                    if (resultsDiv) {
                        const resultItems = resultsDiv.querySelectorAll('.product-search-result[onclick]');
                        if (resultItems.length === 1) {
                            // Auto-select single result
                            const onclickAttr = resultItems[0].getAttribute('onclick');
                            if (onclickAttr) {
                                // Extract function call and execute
                                const match = onclickAttr.match(/(?:window\.)?addProductToSale\((\d+)\)/);
                                if (match && match[1]) {
                                    const productId = parseInt(match[1]);
                                    const addFn = window.addProductToSale || addProductToSale;
                                    if (typeof addFn === 'function') {
                                        addFn(productId);
                                        // Clear search after adding
                                        productSearchInput.value = '';
                                        resultsDiv.style.display = 'none';
                                    }
                                }
                            }
                        }
                    }
                }, 200);
            }
        }
    });
    
    // Attach to product search input
    saleProductBarcodeScanner.attach(productSearchInput);
    console.log('Sale product barcode scanner initialized');
}

// Make functions available globally
if (typeof window !== 'undefined') {
    window.initSalePage = initSalePage;
    window.loadSaleData = loadSaleData;
    window.setupSaleEventListeners = setupSaleEventListeners;
    window.handleCustomerSearch = handleCustomerSearch;
    window.handleProductSearch = handleProductSearch;
    window.selectCustomer = selectCustomer;
    window.clearSelectedCustomer = clearSelectedCustomer;
    window.clearProductSearch = clearProductSearch;
    window.addProductToSale = addProductToSale;
    window.editItemQuantity = editItemQuantity;
    window.adjustProductQuantity = adjustProductQuantity;
    window.removeSaleItem = removeSaleItem;
    window.selectPaymentMethod = selectPaymentMethod;
    window.completeSale = completeSale;
    window.resetSale = resetSale;
    window.renderProductsGrid = renderProductsGrid;
    window.updatePaymentInfo = updatePaymentInfo;
    window.selectExcessAction = selectExcessAction;
    window.updateCompleteButtonState = updateCompleteButtonState;
}

function updateCurrentDate() {
    const now = new Date();
    const dateStr = now.toLocaleString('uz-UZ', {
        timeZone: 'Asia/Tashkent',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
    const dateEl = document.getElementById('sale-current-date');
    if (dateEl) dateEl.textContent = dateStr;
}

function updateSellerName() {
    // Get seller name from global currentUser or localStorage
    let sellerName = 'Sotuvchi';
    
    // Try to get from app.js currentUser (window.currentUser)
    if (typeof window !== 'undefined' && window.currentUser && window.currentUser.name) {
        sellerName = window.currentUser.name;
    } else if (typeof currentUser !== 'undefined' && currentUser?.name) {
        sellerName = currentUser.name;
    } else {
        const userId = localStorage.getItem('seller_id');
        if (userId) {
            // Try to get from API
            const apiBase = (typeof window !== 'undefined' && window.API_BASE) ? window.API_BASE : '/api';
            fetch(`${apiBase}/auth/me`, {
                headers: { 'X-Seller-ID': userId }
            })
            .then(r => r.json())
            .then(data => {
                if (data.name) {
                    sellerName = data.name;
                    // Update both header and sale page
                    const headerEl = document.getElementById('seller-name');
                    const saleEl = document.getElementById('sale-seller-name');
                    if (headerEl) headerEl.textContent = sellerName;
                    if (saleEl) saleEl.textContent = sellerName;
                }
            })
            .catch(() => {});
        }
    }
    
    // Update both header and sale page seller name
    const headerEl = document.getElementById('seller-name');
    const saleEl = document.getElementById('sale-seller-name');
    if (headerEl) headerEl.textContent = sellerName;
    if (saleEl) saleEl.textContent = sellerName;
}

async function loadSaleData() {
    try {
        const apiBase = (typeof window !== 'undefined' && window.API_BASE) ? window.API_BASE : '/api';
        console.log('Loading sale data from:', apiBase);
        
        // Show loading state
        const gridContainer = document.getElementById('products-grid');
        if (gridContainer) {
            gridContainer.innerHTML = '<div class="products-loading">Mahsulotlar yuklanmoqda...</div>';
        }
        
        const [productsRes, customersRes] = await Promise.all([
            fetch(`${apiBase}/products?limit=1000`),
            fetch(`${apiBase}/customers?limit=1000`)
        ]);
        
        if (!productsRes.ok) {
            const errorText = await productsRes.text().catch(() => 'Unknown error');
            console.error('Products fetch error:', productsRes.status, errorText);
            throw new Error(`Mahsulotlarni yuklashda xatolik: ${productsRes.status} ${productsRes.statusText}`);
        }
        if (!customersRes.ok) {
            const errorText = await customersRes.text().catch(() => 'Unknown error');
            console.error('Customers fetch error:', customersRes.status, errorText);
            throw new Error(`Mijozlarni yuklashda xatolik: ${customersRes.status} ${customersRes.statusText}`);
        }
        
        saleProducts = await productsRes.json();
        saleCustomers = await customersRes.json();
        
        console.log('Raw products response:', saleProducts);
        console.log('Raw customers response:', saleCustomers);
        
        // Ensure arrays
        if (!Array.isArray(saleProducts)) {
            console.warn('Products is not an array:', saleProducts);
            saleProducts = [];
        }
        if (!Array.isArray(saleCustomers)) {
            console.warn('Customers is not an array:', saleCustomers);
            saleCustomers = [];
        }
        
        console.log('Loaded products:', saleProducts.length, 'customers:', saleCustomers.length);
        
        if (saleProducts.length > 0) {
            console.log('First product sample:', saleProducts[0]);
        }
        if (saleCustomers.length > 0) {
            console.log('First customer sample:', saleCustomers[0]);
        }
        
        // Make available globally for editSale
        if (typeof window !== 'undefined') {
            window.saleProducts = saleProducts;
            window.saleCustomers = saleCustomers;
            console.log('Made available globally - window.saleProducts:', window.saleProducts.length, 'window.saleCustomers:', window.saleCustomers.length);
        }
        
        // Render products grid after loading
        renderProductsGrid();
    } catch (error) {
        console.error('Error loading sale data:', error);
        saleProducts = [];
        saleCustomers = [];
        
        // Show error in UI
        const gridContainer = document.getElementById('products-grid');
        if (gridContainer) {
            gridContainer.innerHTML = `<div class="products-loading" style="color: #ef4444;">Xatolik: ${error.message}</div>`;
        }
        
        // Show alert after a delay to not interrupt user
        setTimeout(() => {
            alert('Ma\'lumotlarni yuklashda xatolik yuz berdi: ' + error.message);
        }, 500);
    }
}

function setupSaleEventListeners() {
    console.log('setupSaleEventListeners called');
    
    // Use event delegation on document for search inputs
    // This ensures listeners work even if elements are replaced
    
    // Customer search
    const customerSearch = document.getElementById('sale-customer-search');
    if (customerSearch) {
        console.log('Found customer search element:', customerSearch);
        
        // Remove any existing listeners by cloning
        const newCustomerSearch = customerSearch.cloneNode(true);
        customerSearch.parentNode.replaceChild(newCustomerSearch, customerSearch);
        
        // Add listener directly
        newCustomerSearch.addEventListener('input', function(e) {
            console.log('Customer search input event:', e.target.value);
            const handleFn = window.handleCustomerSearch || handleCustomerSearch;
            if (handleFn && typeof handleFn === 'function') {
                handleFn.call(this, e);
            } else {
                console.error('handleCustomerSearch not found');
            }
        });
        
        newCustomerSearch.addEventListener('focus', function(e) {
            console.log('Customer search focused');
            // Show customers when input is focused (even if empty)
            const handleFn = window.handleCustomerSearch || handleCustomerSearch;
            if (handleFn && typeof handleFn === 'function') {
                handleFn.call(this, e);
            }
        });
        
        newCustomerSearch.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') e.preventDefault();
        });
        
        console.log('Customer search listener added');
    } else {
        console.error('sale-customer-search element not found');
    }
    
    // Product search
    const productSearch = document.getElementById('sale-product-search');
    if (productSearch) {
        console.log('Found product search element:', productSearch);
        
        // Remove any existing listeners by cloning
        const newProductSearch = productSearch.cloneNode(true);
        productSearch.parentNode.replaceChild(newProductSearch, productSearch);
        
        // Add listener directly
        newProductSearch.addEventListener('input', function(e) {
            console.log('Product search input event:', e.target.value);
            const handleFn = window.handleProductSearch || handleProductSearch;
            if (handleFn && typeof handleFn === 'function') {
                handleFn.call(this, e);
            } else {
                console.error('handleProductSearch not found');
            }
        });
        
        newProductSearch.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') e.preventDefault();
        });
        
        console.log('Product search listener added');
    } else {
        console.error('sale-product-search element not found');
    }
    
    // Hide search results when clicking outside (only add once)
    if (!window.saleClickOutsideListener) {
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-input-large') && !e.target.closest('.search-results') && !e.target.closest('.product-search-results')) {
                const hideFn = window.hideSearchResults || hideSearchResults;
                if (hideFn && typeof hideFn === 'function') {
                    hideFn();
                }
            }
        });
        window.saleClickOutsideListener = true;
    }
    
    // Payment method buttons
    document.querySelectorAll('.payment-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const method = btn.dataset.method;
            const selectFn = window.selectPaymentMethod || selectPaymentMethod;
            if (method && selectFn && typeof selectFn === 'function') {
                selectFn(method);
            }
        });
    });
    
    console.log('setupSaleEventListeners completed');
}

// Customer search and selection
function handleCustomerSearch(e) {
    console.log('handleCustomerSearch called', e);
    const query = (e && e.target && e.target.value) ? e.target.value.trim().toLowerCase() : '';
    const resultsDiv = document.getElementById('customer-search-results');
    
    if (!resultsDiv) {
        console.error('customer-search-results element not found');
        return;
    }
    
    console.log('Search query:', query);
    
    // Get customers from global or local
    const customers = (typeof window !== 'undefined' && window.saleCustomers) ? window.saleCustomers : saleCustomers;
    
    console.log('Available customers:', customers ? customers.length : 0);
    
    // If query is empty, show first 5 customers to help user select
    if (query.length < 1) {
        if (customers && customers.length > 0) {
            const customersToShow = customers.slice(0, 5);
            resultsDiv.innerHTML = customersToShow.map(c => {
                return `
                <div class="search-result-item" onclick="(window.selectCustomer || selectCustomer)(${c.id})" style="cursor: pointer; padding: 0.75rem; border-bottom: 1px solid #e5e7eb;">
                    <div class="result-item-name" style="font-weight: 600; margin-bottom: 0.25rem;">${escapeHtml(c.name || 'Noma\'lum')}</div>
                    <div class="result-item-info" style="display: flex; gap: 0.5rem; align-items: center; font-size: 0.875rem; color: #6b7280;">
                        ${c.phone ? `<span><i class="fas fa-phone"></i> ${escapeHtml(c.phone)}</span>` : ''}
                        <span class="customer-type-badge-small ${c.customer_type === 'wholesale' ? 'wholesale' : c.customer_type === 'retail' ? 'retail' : 'regular'}">
                            ${c.customer_type === 'wholesale' ? 'Ulgurji' : c.customer_type === 'retail' ? 'Dona' : 'Oddiy'}
                        </span>
                    </div>
                </div>
            `;
            }).join('');
            resultsDiv.style.display = 'block';
            // Ensure parent has position relative for absolute positioning to work
            const formGroup = resultsDiv.closest('.form-group');
            if (formGroup) {
                formGroup.style.position = 'relative';
            }
            console.log('Showing', customersToShow.length, 'customers (empty search). Results div:', resultsDiv, 'Display:', resultsDiv.style.display);
        } else {
            resultsDiv.innerHTML = '';
            resultsDiv.style.display = 'none';
        }
        return;
    }
    
    // Ensure customers are loaded
    if (!customers || customers.length === 0) {
        console.warn('No customers loaded, trying to reload...');
        resultsDiv.innerHTML = '<div class="search-result-item">Mijozlar yuklanmoqda...</div>';
        resultsDiv.style.display = 'block';
        // Try to reload
        if (typeof loadSaleData === 'function' || typeof window.loadSaleData === 'function') {
            const loadFn = typeof loadSaleData === 'function' ? loadSaleData : window.loadSaleData;
            loadFn().then(() => {
                // Retry search after loading
                if (e && e.target) {
                    handleCustomerSearch(e);
                }
            }).catch(err => {
                console.error('Error reloading customers:', err);
                resultsDiv.innerHTML = '<div class="search-result-item" style="color: red;">Xatolik: Mijozlar yuklanmadi</div>';
            });
        }
        return;
    }
    
    const matches = customers.filter(c => {
        const nameMatch = c.name && c.name.toLowerCase().includes(query);
        const phoneMatch = c.phone && c.phone.includes(query);
        const emailMatch = c.email && c.email.toLowerCase().includes(query);
        return nameMatch || phoneMatch || emailMatch;
    }).slice(0, 5);
    
    console.log('Customer matches found:', matches.length);
    
    if (matches.length === 0) {
        resultsDiv.innerHTML = '<div class="search-result-item">Mijoz topilmadi</div>';
    } else {
        resultsDiv.innerHTML = matches.map(c => {
            return `
                <div class="search-result-item" onclick="(window.selectCustomer || selectCustomer)(${c.id})" style="cursor: pointer; padding: 0.75rem; border-bottom: 1px solid #e5e7eb;">
                    <div class="result-item-name" style="font-weight: 600; margin-bottom: 0.25rem;">${escapeHtml(c.name || 'Noma\'lum')}</div>
                    <div class="result-item-info" style="display: flex; gap: 0.5rem; align-items: center; font-size: 0.875rem; color: #6b7280;">
                        ${c.phone ? `<span><i class="fas fa-phone"></i> ${escapeHtml(c.phone)}</span>` : ''}
                        <span class="customer-type-badge-small ${c.customer_type === 'wholesale' ? 'wholesale' : c.customer_type === 'retail' ? 'retail' : 'regular'}">
                            ${c.customer_type === 'wholesale' ? 'Ulgurji' : c.customer_type === 'retail' ? 'Dona' : 'Oddiy'}
                        </span>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    resultsDiv.style.display = 'block';
    // Ensure parent has position relative for absolute positioning to work
    const formGroup = resultsDiv.closest('.form-group');
    if (formGroup) {
        formGroup.style.position = 'relative';
    }
    console.log('Customer search results displayed with', matches.length, 'items. Results div:', resultsDiv, 'Display:', resultsDiv.style.display, 'Computed display:', window.getComputedStyle(resultsDiv).display);
}

function selectCustomer(customerId) {
    console.log('selectCustomer called with customerId:', customerId);
    
    const customers = (typeof window !== 'undefined' && window.saleCustomers) ? window.saleCustomers : saleCustomers;
    
    if (!customers || customers.length === 0) {
        console.error('No customers loaded');
        alert('Mijozlar yuklanmagan. Iltimos, qidiruvdan foydalaning.');
        return;
    }
    
    const customer = customers.find(c => c.id === customerId);
    if (!customer) {
        console.error('Customer not found:', customerId, 'Available customers:', customers.length);
        alert('Mijoz topilmadi');
        return;
    }
    
    // Check debt limit
    const debtLimit = customer.debt_limit;
    if (debtLimit !== null && debtLimit !== undefined && debtLimit > 0) {
        const currentDebt = customer.debt_balance || 0;
        const remainingLimit = debtLimit - currentDebt;
        
        if (remainingLimit <= 0) {
            alert(`⚠️ Diqqat!\n\nMijoz "${customer.name}" uchun qarz limiti to'ldi.\n\nJoriy qarz: ${formatMoney(currentDebt)}\nQarz limiti: ${formatMoney(debtLimit)}\n\nQarzga qo'shish uchun admin ruxsati kerak.`);
        } else {
            // Show warning if limit is close
            const limitUsagePercent = (currentDebt / debtLimit) * 100;
            if (limitUsagePercent >= 80) {
                alert(`⚠️ Ogohlantirish!\n\nMijoz "${customer.name}" uchun qarz limiti deyarli to'ldi.\n\nJoriy qarz: ${formatMoney(currentDebt)}\nQarz limiti: ${formatMoney(debtLimit)}\nQolgan limit: ${formatMoney(remainingLimit)}\n\nQarzga qo'shish uchun admin ruxsati tavsiya etiladi.`);
            }
        }
    }
    
    selectedCustomer = customer;
    
    // Hide search
    const customerSearchEl = document.getElementById('sale-customer-search');
    if (customerSearchEl) customerSearchEl.value = '';
    
    const customerResultsEl = document.getElementById('customer-search-results');
    if (customerResultsEl) customerResultsEl.style.display = 'none';
    
    // Show selected customer
    const customerNameEl = document.getElementById('selected-customer-name');
    if (customerNameEl) customerNameEl.textContent = customer.name;
    
    const customerTypeEl = document.getElementById('selected-customer-type');
    if (customerTypeEl) {
        let typeText = 'Oddiy';
        let typeClass = 'regular';
        if (customer.customer_type === 'wholesale') {
            typeText = 'Ulgurji';
            typeClass = 'wholesale';
        } else if (customer.customer_type === 'retail') {
            typeText = 'Dona';
            typeClass = 'retail';
        }
        customerTypeEl.textContent = typeText;
        customerTypeEl.className = `customer-type-badge ${typeClass}`;
    }
    
    const customerInfoEl = document.getElementById('selected-customer-info');
    if (customerInfoEl) customerInfoEl.style.display = 'block';
    
    // Update hidden input
    const customerInputEl = document.getElementById('sale-customer');
    if (customerInputEl) customerInputEl.value = customerId;
    
    // Make available globally
    if (typeof window !== 'undefined') {
        window.selectedCustomer = selectedCustomer;
    }
    
    console.log('Customer selected:', customer.name);
    
    // Recalculate prices for all items
    let items = (typeof window !== 'undefined' && window.saleItems) ? window.saleItems : saleItems;
    if (Array.isArray(items)) {
        items.forEach(item => {
            if (item.product) {
                item.pricePerPiece = getProductPrice(item.product);
                item.total = (item.quantity || 0) * item.pricePerPiece;
            }
        });
        // Update global
        if (typeof window !== 'undefined') {
            window.saleItems = items;
        }
        saleItems = items;
    }
    
    // Update UI
    updateSaleSummary();
    renderSaleItems();
    // Update products grid with new prices
    renderProductsGrid();
}

function clearSelectedCustomer() {
    selectedCustomer = null;
    if (typeof window !== 'undefined') {
        window.selectedCustomer = null;
    }
    document.getElementById('sale-customer').value = '';
    document.getElementById('selected-customer-info').style.display = 'none';
    document.getElementById('sale-customer-search').focus();
    
    // Recalculate prices for all items (use regular price when no customer)
    let items = (typeof window !== 'undefined' && window.saleItems) ? window.saleItems : saleItems;
    if (Array.isArray(items)) {
        items.forEach(item => {
            if (item.product) {
                item.pricePerPiece = getProductPrice(item.product);
                item.total = (item.quantity || 0) * item.pricePerPiece;
            }
        });
        // Update global
        if (typeof window !== 'undefined') {
            window.saleItems = items;
        }
        saleItems = items;
    }
    
    // Update UI
    updateSaleSummary();
    renderSaleItems();
    // Update products grid
    renderProductsGrid();
}

// Product search and selection
function handleProductSearch(e) {
    console.log('handleProductSearch called', e);
    if (!e || !e.target) {
        console.error('Invalid event object:', e);
        return;
    }
    const query = e.target.value.trim().toLowerCase();
    const resultsDiv = document.getElementById('product-search-results');
    
    if (!resultsDiv) {
        console.error('product-search-results element not found');
        return;
    }
    
    console.log('Product search query:', query);
    
    // Hide products grid when searching
    const gridContainer = document.getElementById('products-grid-container');
    if (gridContainer) {
        gridContainer.style.display = query.length < 1 ? 'block' : 'none';
    }
    
    if (query.length < 1) {
        resultsDiv.innerHTML = '';
        resultsDiv.style.display = 'none';
        // Show products grid
        if (gridContainer) {
            gridContainer.style.display = 'block';
        }
        renderProductsGrid();
        return;
    }
    
    // Get products from global or local
    const products = (typeof window !== 'undefined' && window.saleProducts) ? window.saleProducts : saleProducts;
    
    console.log('Available products:', products ? products.length : 0);
    console.log('Products array check:', Array.isArray(products), typeof products);
    
    // Ensure products are loaded
    if (!products || !Array.isArray(products) || products.length === 0) {
        console.warn('No products loaded, trying to reload...', {
            products: products,
            isArray: Array.isArray(products),
            length: products ? products.length : 0
        });
        resultsDiv.innerHTML = '<div class="search-result-item">Mahsulotlar yuklanmoqda...</div>';
        resultsDiv.style.display = 'block';
        // Try to reload
        if (typeof loadSaleData === 'function' || typeof window.loadSaleData === 'function') {
            const loadFn = typeof loadSaleData === 'function' ? loadSaleData : window.loadSaleData;
            loadFn().then(() => {
                // Retry search after loading
                if (e && e.target) {
                    handleProductSearch(e);
                }
            }).catch(err => {
                console.error('Error reloading products:', err);
                resultsDiv.innerHTML = '<div class="search-result-item" style="color: red;">Xatolik: Mahsulotlar yuklanmadi</div>';
            });
        } else {
            resultsDiv.innerHTML = '<div class="search-result-item" style="color: red;">Xatolik: Mahsulotlar yuklanmadi. Sahifani yangilang.</div>';
        }
        return;
    }
    
    const matches = products.filter(p => {
        if (!p) return false;
        const nameMatch = p.name && p.name.toLowerCase().includes(query);
        const barcodeMatch = p.barcode && p.barcode.toString().toLowerCase().includes(query);
        return nameMatch || barcodeMatch;
    }).slice(0, 20); // Show more results
    
    console.log('Product matches found:', matches.length, 'out of', products.length, 'total products');
    console.log('Search query:', query);
    if (matches.length > 0) {
        console.log('First match:', matches[0]);
    }
    
    if (matches.length === 0) {
        resultsDiv.innerHTML = '<div class="search-result-item">Mahsulot topilmadi</div>';
    } else {
        const customer = (typeof window !== 'undefined' && window.selectedCustomer) ? window.selectedCustomer : selectedCustomer;
        const addFn = typeof addProductToSale === 'function' ? 'addProductToSale' : 'window.addProductToSale';
        resultsDiv.innerHTML = matches.map((p, index) => {
            const stockText = (p.total_pieces || 0) > 0 
                ? `<span class="stock-badge">Omborda: ${p.total_pieces || 0} dona</span>`
                : `<span class="stock-badge out-of-stock">Omborda yo'q</span>`;
            
            const imageUrl = p.image_url 
                ? (p.image_url.startsWith('http') ? p.image_url : `${window.location.origin}${p.image_url}`)
                : null;
            
            // Get price based on customer type using getProductPrice function
            const price = getProductPrice(p);
            
            // Debug log for first product
            if (index === 0) {
                console.log('Product price debug:', {
                    productId: p.id,
                    productName: p.name,
                    wholesale_price: p.wholesale_price,
                    retail_price: p.retail_price,
                    regular_price: p.regular_price,
                    customerType: customer ? customer.customer_type : 'none',
                    calculatedPrice: price
                });
            }
        
            return `
                <div class="product-search-result" onclick="(window.addProductToSale || addProductToSale)(${p.id})" ${(p.total_pieces || 0) === 0 ? 'style="opacity: 0.6; cursor: not-allowed;"' : 'style="cursor: pointer;"'}>
                    ${imageUrl ? `<div class="product-result-image">
                        <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(p.name || '')}" onerror="this.style.display='none';">
                    </div>` : '<div class="product-result-image-placeholder"><i class="fas fa-image"></i></div>'}
                    <div class="product-result-info">
                        <div class="product-result-name" style="font-weight: 600;">${escapeHtml(p.name || 'Noma\'lum')}</div>
                        <div class="product-result-details" style="display: flex; gap: 0.5rem; align-items: center; font-size: 0.875rem;">
                            ${stockText}
                            ${p.barcode ? `<span><i class="fas fa-barcode"></i> ${p.barcode}</span>` : ''}
                        </div>
                    </div>
                    <div class="product-result-price" style="font-weight: 600; color: var(--primary-color);">
                        ${formatMoney(price)} / dona
                    </div>
                </div>
            `;
        }).join('');
    }
    
    resultsDiv.style.display = 'block';
    console.log('Product search results displayed');
}

function clearProductSearch() {
    const searchInput = document.getElementById('sale-product-search');
    const resultsDiv = document.getElementById('product-search-results');
    const gridContainer = document.getElementById('products-grid-container');
    
    if (searchInput) searchInput.value = '';
    if (resultsDiv) {
        resultsDiv.innerHTML = '';
        resultsDiv.style.display = 'none';
    }
    if (searchInput) searchInput.focus();
    
    // Show products grid when search is cleared
    if (gridContainer) {
        gridContainer.style.display = 'block';
    }
    renderProductsGrid();
}

// Render products grid
function renderProductsGrid() {
    console.log('renderProductsGrid called');
    
    // Try products-grid first
    let gridContainer = document.getElementById('products-grid');
    
    // If not found, try to find in products-grid-container
    if (!gridContainer) {
        const container = document.getElementById('products-grid-container');
        if (container) {
            // Create products-grid inside container if it doesn't exist
            gridContainer = container.querySelector('#products-grid');
            if (!gridContainer) {
                gridContainer = document.createElement('div');
                gridContainer.id = 'products-grid';
                gridContainer.className = 'products-grid';
                container.appendChild(gridContainer);
                console.log('Created products-grid element');
            }
        }
    }
    
    if (!gridContainer) {
        console.error('products-grid or products-grid-container element not found');
        return;
    }
    
    console.log('Grid container found:', gridContainer);
    
    const products = (typeof window !== 'undefined' && window.saleProducts) ? window.saleProducts : saleProducts;
    
    if (!products || products.length === 0) {
        gridContainer.innerHTML = '<div class="products-loading">Mahsulotlar yuklanmoqda...</div>';
        return;
    }
    
    // Filter products with stock
    const availableProducts = products.filter(p => (p.total_pieces || 0) > 0);
    
    if (availableProducts.length === 0) {
        gridContainer.innerHTML = '<div class="empty-state">Omborda mahsulotlar yo\'q</div>';
        return;
    }
    
    const customer = (typeof window !== 'undefined' && window.selectedCustomer) ? window.selectedCustomer : selectedCustomer;
    
    gridContainer.innerHTML = availableProducts.map(p => {
        const imageUrl = p.image_url 
            ? (p.image_url.startsWith('http') ? p.image_url : `${window.location.origin}${p.image_url}`)
            : null;
        
        // Get price based on customer type using getProductPrice function
        const price = getProductPrice(p);
        
        return `
            <div class="product-grid-item" onclick="(window.addProductToSale || addProductToSale)(${p.id})" title="${escapeHtml(p.name || 'Noma\'lum')}">
                ${imageUrl ? `
                    <div class="product-grid-image">
                        <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(p.name || '')}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                        <div class="product-grid-image-placeholder" style="display:none;"><i class="fas fa-image"></i></div>
                    </div>
                ` : `
                    <div class="product-grid-image-placeholder"><i class="fas fa-image"></i></div>
                `}
                <div class="product-grid-info">
                    <div class="product-grid-name">${escapeHtml(p.name || 'Noma\'lum')}</div>
                    <div class="product-grid-stock">Omborda: ${p.total_pieces || 0} dona</div>
                    <div class="product-grid-price">${formatMoney(price)} / dona</div>
                </div>
            </div>
        `;
    }).join('');
}

function hideSearchResults() {
    document.getElementById('customer-search-results').style.display = 'none';
    document.getElementById('product-search-results').style.display = 'none';
}

function addProductToSale(productId) {
    console.log('addProductToSale called with productId:', productId);
    
    const products = (typeof window !== 'undefined' && window.saleProducts) ? window.saleProducts : saleProducts;
    
    if (!products || products.length === 0) {
        console.error('No products loaded');
        alert('Mahsulotlar yuklanmagan. Iltimos, qidiruvdan foydalaning.');
        return;
    }
    
    const product = products.find(p => p.id === productId);
    if (!product) {
        console.error('Product not found:', productId, 'Available products:', products.length);
        alert('Mahsulot topilmadi');
        return;
    }
    
    // Get current saleItems from global or local
    let items = (typeof window !== 'undefined' && window.saleItems) ? window.saleItems : saleItems;
    if (!Array.isArray(items)) items = [];
    
    // Check if product already in sale
    const existingIndex = items.findIndex(item => item.product && item.product.id === productId);
    if (existingIndex !== -1) {
        // Show quantity adjustment modal or just increment
        if (typeof adjustProductQuantity === 'function') {
            adjustProductQuantity(existingIndex, 1);
        } else if (typeof window.adjustProductQuantity === 'function') {
            window.adjustProductQuantity(existingIndex, 1);
        }
        return;
    }
    
    // Check stock
    if ((product.total_pieces || 0) === 0) {
        alert('Bu mahsulot omborda yo\'q!');
        return;
    }
    
    // Add new item with default quantity
    const pricePerPiece = getProductPrice(product);
    const newItem = {
        product: product,
        packages: 0,
        pieces: 1,
        quantity: 1, // total pieces
        pricePerPiece: pricePerPiece,
        total: pricePerPiece
    };
    
    items.push(newItem);
    console.log('Product added to sale:', product.name, 'Items count:', items.length);
    
    // Update global and local
    if (typeof window !== 'undefined') {
        window.saleItems = items;
    }
    saleItems = items;
    
    renderSaleItems();
    clearProductSearch();
    updateSaleSummary();
    
    // Show quantity editor for new item
    setTimeout(() => {
        if (typeof editItemQuantity === 'function') {
            editItemQuantity(items.length - 1);
        }
    }, 100);
}

function editItemQuantity(index) {
    const item = saleItems[index];
    if (!item) return;
    
    showQuantityModal(item, index);
}

function showQuantityModal(item, index) {
    const modal = document.createElement('div');
    modal.className = 'quantity-modal';
    modal.innerHTML = `
        <div class="quantity-modal-content">
            <div class="quantity-modal-header">
                <h3>${escapeHtml(item.product.name)}</h3>
                <button class="btn-icon" onclick="this.closest('.quantity-modal').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="quantity-modal-body">
                <div class="quantity-info">
                    <p>1 qop = ${item.product.pieces_per_package} dona</p>
                    <p>Omborda: <strong>${item.product.total_pieces} dona</strong></p>
                </div>
                <div class="quantity-inputs">
                    <div class="quantity-input-group">
                        <label>Qoplar</label>
                        <input type="number" id="qty-packages" min="0" value="${item.packages}" 
                               onchange="(window.updateQuantityFromInputs || updateQuantityFromInputs)(${index})">
                    </div>
                    <div class="quantity-input-group">
                        <label>Donalar</label>
                        <input type="number" id="qty-pieces" min="0" max="${item.product.pieces_per_package - 1}" 
                               value="${item.pieces}" onchange="(window.updateQuantityFromInputs || updateQuantityFromInputs)(${index})">
                    </div>
                    <div class="quantity-input-group">
                        <label>Jami dona</label>
                        <input type="number" id="qty-total" min="1" max="${item.product.total_pieces}" 
                               value="${item.quantity}" oninput="(window.updateQuantityFromTotal || updateQuantityFromTotal)(${index})" onchange="(window.updateQuantityFromTotal || updateQuantityFromTotal)(${index})">
                    </div>
                </div>
                <div class="quantity-summary">
                    <p>Narx: <strong>${formatMoney(item.pricePerPiece)} / dona</strong></p>
                    <p>Jami: <strong class="quantity-total-price">${formatMoney(item.total)}</strong></p>
                </div>
            </div>
            <div class="quantity-modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.quantity-modal').remove()">Bekor</button>
                <button class="btn btn-primary" onclick="(window.saveQuantity || saveQuantity)(${index})">Saqlash</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Focus on total input
    setTimeout(() => {
        document.getElementById('qty-total').focus();
        document.getElementById('qty-total').select();
    }, 100);
}

function updateQuantityFromInputs(index) {
    const items = (typeof window !== 'undefined' && window.saleItems) ? window.saleItems : saleItems;
    const item = items[index];
    if (!item) return;
    
    const packages = parseInt(document.getElementById('qty-packages').value) || 0;
    const pieces = parseInt(document.getElementById('qty-pieces').value) || 0;
    const piecesPerPackage = item.product.pieces_per_package || 1;
    
    const totalPieces = (packages * piecesPerPackage) + pieces;
    
    if (totalPieces > item.product.total_pieces) {
        alert(`Omborda faqat ${item.product.total_pieces} dona mavjud!`);
        document.getElementById('qty-total').value = item.product.total_pieces;
        updateQuantityFromTotal(index);
        return;
    }
    
    document.getElementById('qty-total').value = totalPieces;
    updateQuantityTotalPrice(index);
}

function updateQuantityFromTotal(index) {
    const items = (typeof window !== 'undefined' && window.saleItems) ? window.saleItems : saleItems;
    const item = items[index];
    if (!item) return;
    
    const total = parseInt(document.getElementById('qty-total').value) || 0;
    
    if (total > (item.product.total_pieces || 0)) {
        alert(`Omborda faqat ${item.product.total_pieces || 0} dona mavjud!`);
        document.getElementById('qty-total').value = item.product.total_pieces || 0;
        return;
    }
    
    const piecesPerPackage = item.product.pieces_per_package || 1;
    const packages = Math.floor(total / piecesPerPackage);
    const pieces = total % piecesPerPackage;
    
    document.getElementById('qty-packages').value = packages;
    document.getElementById('qty-pieces').value = pieces;
    updateQuantityTotalPrice(index);
}

function updateQuantityTotalPrice(index) {
    const items = (typeof window !== 'undefined' && window.saleItems) ? window.saleItems : saleItems;
    const item = items[index];
    if (!item) return;
    
    const total = parseInt(document.getElementById('qty-total').value) || 0;
    const totalPrice = total * (item.pricePerPiece || 0);
    
    const priceEl = document.querySelector('.quantity-total-price');
    if (priceEl) {
        priceEl.textContent = formatMoney(totalPrice);
    }
}

function saveQuantity(index) {
    const items = (typeof window !== 'undefined' && window.saleItems) ? window.saleItems : saleItems;
    const item = items[index];
    if (!item) return;
    
    const total = parseInt(document.getElementById('qty-total').value) || 0;
    const packages = parseInt(document.getElementById('qty-packages').value) || 0;
    const pieces = parseInt(document.getElementById('qty-pieces').value) || 0;
    
    if (total < 1) {
        alert('Miqdor 0 dan katta bo\'lishi kerak!');
        return;
    }
    
    item.quantity = total;
    item.packages = packages;
    item.pieces = pieces;
    item.total = total * (item.pricePerPiece || 0);
    
    // Update global
    if (typeof window !== 'undefined') {
        window.saleItems = items;
    }
    saleItems = items;
    
    const modal = document.querySelector('.quantity-modal');
    if (modal) {
        modal.remove();
    }
    
    renderSaleItems();
    updateSaleSummary();
}

function adjustProductQuantity(index, delta) {
    const items = (typeof window !== 'undefined' && window.saleItems) ? window.saleItems : saleItems;
    const item = items[index];
    if (!item) return;
    
    const newQuantity = (item.quantity || 0) + delta;
    
    if (newQuantity < 1) {
        removeSaleItem(index);
        return;
    }
    
    if (newQuantity > (item.product.total_pieces || 0)) {
        alert(`Omborda faqat ${item.product.total_pieces || 0} dona mavjud!`);
        return;
    }
    
    const piecesPerPackage = item.product.pieces_per_package || 1;
    item.quantity = newQuantity;
    item.packages = Math.floor(newQuantity / piecesPerPackage);
    item.pieces = newQuantity % piecesPerPackage;
    item.total = newQuantity * (item.pricePerPiece || 0);
    
    // Update global
    if (typeof window !== 'undefined') {
        window.saleItems = items;
    }
    saleItems = items;
    
    renderSaleItems();
    updateSaleSummary();
}

function removeSaleItem(index) {
    const items = (typeof window !== 'undefined' && window.saleItems) ? window.saleItems : saleItems;
    items.splice(index, 1);
    
    // Update global
    if (typeof window !== 'undefined') {
        window.saleItems = items;
    }
    saleItems = items;
    
    renderSaleItems();
    updateSaleSummary();
}

function renderSaleItems() {
    const container = document.getElementById('sale-items-container');
    if (!container) {
        console.error('sale-items-container not found');
        return;
    }
    
    // Get saleItems from global or local
    const items = (typeof window !== 'undefined' && window.saleItems) ? window.saleItems : saleItems;
    
    if (!items || items.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-shopping-cart"></i>
                <p>Mahsulot qo'shish uchun qidiruvdan yoki ro'yxatdan tanlang</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = items.map((item, index) => {
        const imageUrl = item.product.image_url 
            ? (item.product.image_url.startsWith('http') ? item.product.image_url : `${window.location.origin}${item.product.image_url}`)
            : null;
        
        return `
        <div class="sale-item-card">
            ${imageUrl ? `<div class="sale-item-image">
                <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(item.product.name)}" onerror="this.style.display='none';">
            </div>` : '<div class="sale-item-image-placeholder"><i class="fas fa-image"></i></div>'}
            <div class="sale-item-info">
                <div class="sale-item-name">${escapeHtml(item.product.name)}</div>
                <div class="sale-item-details">
                    ${item.packages > 0 ? `<span><i class="fas fa-box"></i> ${item.packages} qop</span>` : ''}
                    ${item.pieces > 0 ? `<span><i class="fas fa-cube"></i> ${item.pieces} dona</span>` : ''}
                    <span class="sale-item-unit-price">${formatMoney(item.pricePerPiece)} / dona</span>
                </div>
            </div>
            <div class="sale-item-controls">
                <div class="quantity-controls">
                    <button class="btn-icon-small" onclick="(window.adjustProductQuantity || adjustProductQuantity)(${index}, -1)" title="Kamaytirish">
                        <i class="fas fa-minus"></i>
                    </button>
                    <span class="quantity-display" onclick="(window.editItemQuantity || editItemQuantity)(${index})" title="Tahrirlash">
                        ${item.quantity} dona
                    </span>
                    <button class="btn-icon-small" onclick="(window.adjustProductQuantity || adjustProductQuantity)(${index}, 1)" title="Ko'paytirish"
                            ${item.quantity >= item.product.total_pieces ? 'disabled' : ''}>
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
                <div class="sale-item-total">${formatMoney(item.total)}</div>
                <button class="btn-icon" onclick="(window.removeSaleItem || removeSaleItem)(${index})" title="O'chirish">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `;
    }).join('');
}

function updateSaleSummary() {
    // Get saleItems from global or local
    const items = (typeof window !== 'undefined' && window.saleItems) ? window.saleItems : saleItems;
    const totalAmount = items.reduce((sum, item) => sum + (item.total || 0), 0);
    const totalItems = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    
    // Update summary
    document.getElementById('summary-items-count').textContent = totalItems;
    document.getElementById('sale-total').textContent = formatMoney(totalAmount);
    document.getElementById('btn-total').textContent = formatMoney(totalAmount);
    
    // Update summary items list
    const summaryList = document.getElementById('summary-items-list');
    if (!items || items.length === 0) {
        if (summaryList) {
            summaryList.innerHTML = '<p class="empty-summary">Mahsulotlar qo\'shilmagan</p>';
        }
    } else {
        if (summaryList) {
            summaryList.innerHTML = items.map(item => `
            <div class="summary-item">
                <span class="summary-item-name">${escapeHtml(item.product.name)}</span>
                <span class="summary-item-qty">${item.quantity} dona</span>
                <span class="summary-item-price">${formatMoney(item.total)}</span>
            </div>
        `).join('');
        }
    }
    
    // Update payment info
    updatePaymentInfo();
    
    // Enable/disable complete button
    updateCompleteButtonState();
}

// Update complete button state based on sale validity
function updateCompleteButtonState() {
    const completeBtn = document.querySelector('.btn-complete');
    if (!completeBtn) return;
    
    const items = (typeof window !== 'undefined' && window.saleItems) ? window.saleItems : saleItems;
    const customer = (typeof window !== 'undefined' && window.selectedCustomer) ? window.selectedCustomer : selectedCustomer;
    
    // Button should be enabled if:
    // 1. Customer is selected
    // 2. At least one item is added
    // 3. If admin approval is required, it's okay (admin will handle payment/debt)
    const hasItems = items && items.length > 0;
    const hasCustomer = customer !== null && customer !== undefined;
    const requiresApproval = document.getElementById('requires-admin-approval')?.checked || false;
    
    // If admin approval is required, always enable the button (admin will handle it)
    // If no approval needed, check if payment amount is valid
    let shouldEnable = hasItems && hasCustomer;
    
    if (shouldEnable && !requiresApproval) {
        // If no approval needed, check payment amount
        const paymentAmountInput = document.getElementById('payment-amount-input');
        if (paymentAmountInput) {
            const paymentAmount = parseFloat(paymentAmountInput.value) || 0;
            const totalAmount = items.reduce((sum, item) => sum + (item.total || 0), 0);
            
            // If payment is less than total and no approval, warn user but allow (will create debt)
            // Actually, let's allow it - debt will be created automatically
        }
    }
    
    completeBtn.disabled = !shouldEnable;
    
    // Update button text/styling if needed
    if (completeBtn.disabled) {
        completeBtn.title = 'Mijoz va mahsulot tanlang';
    } else if (requiresApproval) {
        completeBtn.title = 'To\'lov - Admin ruxsati kerak';
    } else {
        completeBtn.title = 'To\'lovni yakunlash';
    }
}

// Update payment info based on payment amount
function updatePaymentInfo() {
    const items = (typeof window !== 'undefined' && window.saleItems) ? window.saleItems : saleItems;
    const totalAmount = items.reduce((sum, item) => sum + (item.total || 0), 0);
    
    const paymentAmountInput = document.getElementById('payment-amount-input');
    const changeInfo = document.getElementById('payment-change-info');
    const changeText = document.getElementById('payment-change-text');
    const excessActionSection = document.getElementById('excess-action-section');
    
    if (!paymentAmountInput || !changeInfo || !changeText || !excessActionSection) {
        return;
    }
    
    const paymentAmount = parseFloat(paymentAmountInput.value) || 0;
    const difference = paymentAmount - totalAmount;
    
    // Update complete button state after payment info changes
    updateCompleteButtonState();
    
    if (paymentAmount === 0 || paymentAmount === null || isNaN(paymentAmount)) {
        changeInfo.style.display = 'none';
        excessActionSection.style.display = 'none';
        const excessActionEl = document.getElementById('excess-action');
        if (excessActionEl) {
            excessActionEl.value = '';
        }
        return;
    }
    
    if (difference > 0) {
        // Customer paid more
        changeInfo.style.display = 'block';
        changeText.textContent = `Ortiqcha to'lov: ${formatMoney(difference)}`;
        changeText.style.color = '#0369a1';
        excessActionSection.style.display = 'block';
        
        // If no action selected yet, default to 'return'
        const excessActionEl = document.getElementById('excess-action');
        if (excessActionEl && !excessActionEl.value) {
            selectExcessAction('return');
        }
    } else if (difference < 0) {
        // Customer paid less
        changeInfo.style.display = 'block';
        changeText.textContent = `Yetmadi: ${formatMoney(Math.abs(difference))} (qarzga yoziladi)`;
        changeText.style.color = '#dc2626';
        excessActionSection.style.display = 'none';
        const excessActionEl = document.getElementById('excess-action');
        if (excessActionEl) {
            excessActionEl.value = '';
        }
    } else {
        // Exact payment
        changeInfo.style.display = 'block';
        changeText.textContent = `To'liq to'landi`;
        changeText.style.color = '#10b981';
        excessActionSection.style.display = 'none';
        const excessActionEl = document.getElementById('excess-action');
        if (excessActionEl) {
            excessActionEl.value = '';
        }
    }
}

// Select excess action
function selectExcessAction(action) {
    const excessActionEl = document.getElementById('excess-action');
    if (excessActionEl) {
        excessActionEl.value = action;
    }
    
    // Update button styles
    document.querySelectorAll('.excess-action-btn').forEach(btn => {
        if (btn.dataset.action === action) {
            btn.style.borderColor = 'var(--primary-color)';
            btn.style.background = 'var(--primary-color)';
            btn.style.color = 'white';
        } else {
            btn.style.borderColor = 'var(--border-color)';
            btn.style.background = 'white';
            btn.style.color = 'var(--text-color)';
        }
    });
    
    // Update complete button state
    updateCompleteButtonState();
}

function getProductPrice(product) {
    if (!product) {
        console.warn('getProductPrice: product is null or undefined');
        return 0;
    }
    
    const customer = (typeof window !== 'undefined' && window.selectedCustomer) ? window.selectedCustomer : selectedCustomer;
    
    // Debug: Check if product has price fields
    if (!product.hasOwnProperty('wholesale_price') || !product.hasOwnProperty('retail_price') || !product.hasOwnProperty('regular_price')) {
        console.warn('Product missing price fields:', {
            id: product.id,
            name: product.name,
            hasWholesale: product.hasOwnProperty('wholesale_price'),
            hasRetail: product.hasOwnProperty('retail_price'),
            hasRegular: product.hasOwnProperty('regular_price'),
            allKeys: Object.keys(product)
        });
    }
    
    // If no customer selected, use regular price
    if (!customer) {
        const price = product.regular_price || product.regular_price === 0 ? product.regular_price : 0;
        return price;
    }
    
    // Get price based on customer type
    let price = 0;
    if (customer.customer_type === 'wholesale') {
        price = product.wholesale_price || (product.wholesale_price === 0 ? 0 : 0);
    } else if (customer.customer_type === 'retail') {
        price = product.retail_price || (product.retail_price === 0 ? 0 : 0);
    } else {
        price = product.regular_price || (product.regular_price === 0 ? 0 : 0);
    }
    
    // Debug: Log price calculation for first few products
    if (product.id <= 3) {
        console.log('getProductPrice:', {
            productId: product.id,
            productName: product.name,
            customerType: customer.customer_type,
            wholesale_price: product.wholesale_price,
            retail_price: product.retail_price,
            regular_price: product.regular_price,
            calculatedPrice: price
        });
    }
    
    return price;
}

function selectPaymentMethod(method) {
    const paymentMethodInput = document.getElementById('sale-payment-method');
    if (paymentMethodInput) {
        paymentMethodInput.value = method;
    }
    
    document.querySelectorAll('.payment-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const selectedBtn = document.querySelector(`.payment-btn[data-method="${method}"]`);
    if (selectedBtn) {
        selectedBtn.classList.add('active');
    }
}

async function completeSale() {
    const customer = (typeof window !== 'undefined' && window.selectedCustomer) ? window.selectedCustomer : selectedCustomer;
    if (!customer) {
        alert('Iltimos, mijozni tanlang!');
        return;
    }
    
    const items = (typeof window !== 'undefined' && window.saleItems) ? window.saleItems : saleItems;
    if (!items || items.length === 0) {
        alert('Kamida bitta mahsulot qo\'shing!');
        return;
    }
    
    const paymentMethod = document.getElementById('sale-payment-method')?.value || 'cash';
    const userId = parseInt(localStorage.getItem('seller_id'));
    
    // Get payment amount and excess action
    const paymentAmountInput = document.getElementById('payment-amount-input');
    const paymentAmount = paymentAmountInput ? parseFloat(paymentAmountInput.value) : null;
    const excessAction = document.getElementById('excess-action')?.value || null;
    const requiresApproval = document.getElementById('requires-admin-approval')?.checked || false;
    
    // Calculate total
    const totalAmount = items.reduce((sum, item) => sum + (item.total || 0), 0);
    
    // Validate payment amount
    if (paymentAmount !== null && paymentAmount < 0) {
        alert('To\'lov summasi manfiy bo\'lishi mumkin emas!');
        return;
    }
    
    // CRITICAL: If no payment amount is entered and admin approval is NOT requested, prevent sale
    if (paymentAmount === null || paymentAmount === '' || (paymentAmount === 0 && !requiresApproval)) {
        alert(
            '⚠️ To\'lov summasi kiritilmagan!\n\n' +
            'To\'lov summasi majburiy. Iltimos, to\'lov summasi kiriting.\n\n' +
            'Agar qarzga yozmoqchi bo\'lsangiz, "Admin ruxsati kerak" checkbox\'ini belgilang.'
        );
        // Focus on payment amount input
        const paymentInput = document.getElementById('payment-amount-input');
        if (paymentInput) {
            paymentInput.focus();
            paymentInput.style.border = '2px solid #ef4444';
            setTimeout(() => {
                paymentInput.style.border = '';
            }, 3000);
        }
        return;
    }
    
    // If payment is 0 or empty string (but not null because of admin approval), also check
    if (paymentAmount !== null && paymentAmount === 0 && !requiresApproval) {
        const confirmed = confirm(
            '⚠️ To\'lov summasi 0 so\'m!\n\n' +
            'To\'lov summasi 0 so\'m va admin ruxsati so\'ralmagan.\n\n' +
            'Qarzga yozish uchun admin ruxsati talab etiladi.\n\n' +
            'Admin ruxsatini so\'rash uchun "Admin ruxsati kerak" checkbox\'ini belgilang.\n\n' +
            'Yoki to\'lov summasi kiriting va qayta urinib ko\'ring.'
        );
        if (confirmed) {
            // Focus on payment amount input
            const paymentInput = document.getElementById('payment-amount-input');
            if (paymentInput) {
                paymentInput.focus();
            }
        }
        return;
    }
    
    // If payment is less than total and no approval requested, check debt limit
    if (paymentAmount !== null && paymentAmount < totalAmount && !requiresApproval) {
        const debtAmount = totalAmount - paymentAmount;
        const customerDebtLimit = customer.debt_limit;
        const currentDebt = customer.debt_balance || 0;
        
        // Check if debt limit will be exceeded
        if (customerDebtLimit !== null && customerDebtLimit > 0) {
            const newDebt = currentDebt + debtAmount;
            if (newDebt > customerDebtLimit) {
                const message = '⚠️ Qarz limiti oshib ketadi!\n\n' +
                    `Mijoz "${customer.name}" uchun:\n\n` +
                    `Joriy qarz: ${formatMoney(currentDebt)} so'm\n` +
                    `Qarz limiti: ${formatMoney(customerDebtLimit)} so'm\n` +
                    `Qo'shiladigan qarz: ${formatMoney(debtAmount)} so'm\n` +
                    `Yangi qarz: ${formatMoney(newDebt)} so'm\n\n` +
                    `Admin ruxsati kerak!`;
                
                const confirmMessage = message + '\n\nAdmin ruxsatiga yuborishni tasdiqlaysizmi?';
                const userConfirmed = confirm(confirmMessage);
                
                if (userConfirmed) {
                    // Set requires admin approval and continue
                    document.getElementById('requires-admin-approval').checked = true;
                    // Continue with submission after a short delay
                    setTimeout(() => {
                        completeSale();
                    }, 200);
                    return;
                } else {
                    return;
                }
            }
        }
        
        // Payment is insufficient - ALWAYS require admin approval for debt
        const message = '⚠️ Admin ruxsati kerak\n\n' +
            `Mijoz to'lagan summa (${formatMoney(paymentAmount)} so'm) jami summadan (${formatMoney(totalAmount)} so'm) kam.\n\n` +
            `Qo'shiladigan qarz: ${formatMoney(debtAmount)} so'm\n\n` +
            `Qarzga yozish uchun admin ruxsati talab etiladi. Admin tasdiqlashini so'rash?`;
        
        const userConfirmed = confirm(message);
        
        if (userConfirmed) {
            // Set requires admin approval and continue
            document.getElementById('requires-admin-approval').checked = true;
            // Continue with submission after a short delay
            setTimeout(() => {
                completeSale();
            }, 200);
            return;
        } else {
            return;
        }
    }
    
    // Final confirmation dialog before submitting (similar to mobile app)
    const paymentDisplay = paymentAmount !== null && paymentAmount > 0 
        ? formatMoney(paymentAmount) + ' so\'m'
        : 'To\'lanmagan';
    
    const paymentMethodText = paymentMethod === 'cash' ? 'Naqt' : paymentMethod === 'card' ? 'Karta' : 'O\'tkazma';
    
    const confirmMessage = '⚠️ Sotuvni yakunlash\n\n' +
        `Mijoz: ${customer.name}\n` +
        `Jami summa: ${formatMoney(totalAmount)} so'm\n` +
        `To'lov: ${paymentDisplay}\n` +
        `To'lov usuli: ${paymentMethodText}\n\n` +
        `Sotuvni yakunlashni tasdiqlaysizmi?`;
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    const itemsData = items.map(item => ({
        product_id: item.product.id,
        requested_quantity: item.quantity
    }));
    
    // Check if editing existing sale
    if (window.editingSaleId) {
        // Update sale
        if (!userPermissions.includes('sales.update')) {
            alert('Sizga sotuv tahrirlash ruxsati yo\'q');
            return;
        }
        
        try {
            const apiBase = (typeof window !== 'undefined' && window.API_BASE) ? window.API_BASE : '/api';
        const response = await fetch(`${apiBase}/sales/${window.editingSaleId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Seller-ID': userId
                },
            body: JSON.stringify({
                customer_id: customer.id,
                items: itemsData,
                payment_method: paymentMethod
            })
            });
            
            if (response.ok) {
                const saleData = await response.json();
                alert('Sotuv muvaffaqiyatli yangilandi!');
                resetSale();
                delete window.editingSaleId;
                showPage('sales');
                loadSales();
            } else {
                const error = await response.json();
                alert('Xatolik: ' + (error.detail || 'Noma\'lum xatolik'));
            }
        } catch (error) {
            console.error('Error updating sale:', error);
            alert('Xatolik yuz berdi');
        }
    } else {
        // Create new sale
        if (!userPermissions.includes('sales.create')) {
            alert('Sizga sotuv yaratish ruxsati yo\'q');
            return;
        }
        
        try {
            const apiBase = (typeof window !== 'undefined' && window.API_BASE) ? window.API_BASE : '/api';
            const response = await fetch(`${apiBase}/sales`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Seller-ID': userId
                },
            body: JSON.stringify({
                seller_id: userId,
                customer_id: customer.id,
                items: itemsData,
                payment_method: paymentMethod,
                payment_amount: paymentAmount,
                excess_action: excessAction,
                requires_admin_approval: requiresApproval
            })
            });
            
            if (response.ok) {
                const saleData = await response.json();
                
                // Check if admin approval is required
                if (requiresApproval && saleData.requires_admin_approval) {
                    // Show waiting message modal instead of receipt
                    showWaitingModal(saleData);
                    resetSale();
                    // Optionally refresh sales list
                    if (typeof window.showPage === 'function') {
                        window.showPage('sales');
                        if (typeof window.loadSales === 'function') {
                            setTimeout(() => window.loadSales(), 500);
                        }
                    }
                } else {
                    // Only show receipt if sale is approved (or doesn't require approval)
                    // admin_approved === true means approved, null means pending, false means rejected
                    if (saleData.admin_approved === true || saleData.admin_approved === null && !saleData.requires_admin_approval) {
                        // Show receipt modal
                        if (typeof showReceiptModal === 'function') {
                            showReceiptModal(saleData);
                        }
                    } else if (saleData.admin_approved === false) {
                        alert('Sotuv rad etildi. Chek ko\'rsatilmaydi.');
                    } else {
                        // Pending - show waiting modal
                        showWaitingModal(saleData);
                    }
                    // Reset sale
                    resetSale();
                }
            } else {
                const error = await response.json();
                alert('Xatolik: ' + (error.detail || 'Noma\'lum xatolik'));
            }
        } catch (error) {
            console.error('Error creating sale:', error);
            alert('Xatolik yuz berdi');
        }
    }
}

function resetSale() {
    saleItems = [];
    
    // Reset payment inputs
    const paymentAmountInput = document.getElementById('payment-amount-input');
    if (paymentAmountInput) {
        paymentAmountInput.value = '';
    }
    
    const excessAction = document.getElementById('excess-action');
    if (excessAction) {
        excessAction.value = '';
    }
    
    const requiresApproval = document.getElementById('requires-admin-approval');
    if (requiresApproval) {
        requiresApproval.checked = false;
    }
    
    updatePaymentInfo();
    selectedCustomer = null;
    if (typeof window !== 'undefined') {
        window.saleItems = [];
        window.selectedCustomer = null;
        delete window.editingSaleId;
    }
    
    const customerInput = document.getElementById('sale-customer');
    const customerInfo = document.getElementById('selected-customer-info');
    const customerSearch = document.getElementById('sale-customer-search');
    const productSearch = document.getElementById('sale-product-search');
    
    if (customerInput) customerInput.value = '';
    if (customerInfo) customerInfo.style.display = 'none';
    if (customerSearch) customerSearch.value = '';
    if (productSearch) productSearch.value = '';
    
    if (typeof selectPaymentMethod === 'function') {
        selectPaymentMethod('cash');
    }
    
    // Reset button text
    const completeBtn = document.querySelector('.btn-complete');
    if (completeBtn) {
        const span = completeBtn.querySelector('span');
        if (span) {
            span.textContent = 'Sotuvni yakunlash';
        }
    }
    
    // Show products grid
    const gridContainer = document.getElementById('products-grid-container');
    if (gridContainer) {
        gridContainer.style.display = 'block';
    }
    
    renderSaleItems();
    updateSaleSummary();
    renderProductsGrid();
}

// Show waiting modal for pending sales
function showWaitingModal(saleData) {
    const modal = document.createElement('div');
    modal.className = 'receipt-modal';
    modal.innerHTML = `
        <div class="receipt-modal-content" style="max-width: 500px;">
            <div class="receipt-header">
                <div class="receipt-logo">
                    <i class="fas fa-hourglass-half" style="color: #f59e0b;"></i>
                    <h2>Sotuv Kutilmoqda</h2>
                </div>
                <button class="btn-icon" onclick="this.closest('.receipt-modal').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="receipt-body" style="text-align: center; padding: 2rem;">
                <div style="font-size: 4rem; color: #f59e0b; margin-bottom: 1rem;">
                    <i class="fas fa-clock"></i>
                </div>
                <h3 style="color: #1e293b; margin-bottom: 1rem;">Sotuv № ${saleData.id}</h3>
                <p style="color: #64748b; margin-bottom: 1.5rem; line-height: 1.6;">
                    Sotuv admin ruxsatini kutmoqda.<br>
                    Admin tasdiqlagach, sotuv amalga oshiriladi va chek ko'rsatiladi.
                </p>
                <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
                    <p style="margin: 0; color: #92400e;">
                        <strong>Holat:</strong> Kutilmoqda<br>
                        <strong>Jami summa:</strong> ${formatMoney(saleData.total_amount || 0)}
                    </p>
                </div>
                <p style="color: #64748b; font-size: 0.9rem;">
                    Admin tasdiqlagandan yoki rad etilgandan keyin bu yerda xabar ko'rsatiladi.
                </p>
            </div>
            
            <div class="receipt-footer">
                <button class="btn btn-secondary" onclick="this.closest('.receipt-modal').remove(); if(typeof window.showPage === 'function') window.showPage('sales');">
                    Yopish
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function showReceiptModal(saleData) {
    // Fetch full sale details
    const apiBase = (typeof window !== 'undefined' && window.API_BASE) ? window.API_BASE : '/api';
    fetch(`${apiBase}/sales/${saleData.id}`)
        .then(r => r.json())
        .then(sale => {
            const modal = document.createElement('div');
            modal.className = 'receipt-modal';
            modal.innerHTML = `
                <div class="receipt-modal-content">
                    <div class="receipt-header">
                        <div class="receipt-logo">
                            <i class="fas fa-store"></i>
                            <h2>Sotuv Cheki</h2>
                        </div>
                        <button class="btn-icon" onclick="this.closest('.receipt-modal').remove()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="receipt-body">
                        <div class="receipt-info">
                            <div class="receipt-info-row">
                                <span class="receipt-label">Chek №:</span>
                                <span class="receipt-value">${sale.id}</span>
                            </div>
                            <div class="receipt-info-row">
                                <span class="receipt-label">Sana:</span>
                                <span class="receipt-value">${formatDate(sale.created_at)}</span>
                            </div>
                            <div class="receipt-info-row">
                                <span class="receipt-label">Sotuvchi:</span>
                                <span class="receipt-value">${escapeHtml(sale.seller_name)}</span>
                            </div>
                            <div class="receipt-info-row">
                                <span class="receipt-label">Mijoz:</span>
                                <span class="receipt-value">${escapeHtml(sale.customer_name)}</span>
                            </div>
                        </div>
                        
                        <div class="receipt-items">
                            <div class="receipt-items-header">
                                <div class="receipt-item-col product-col">Mahsulot</div>
                                <div class="receipt-item-col qty-col">Miqdor</div>
                                <div class="receipt-item-col price-col">Narx</div>
                                <div class="receipt-item-col total-col">Jami</div>
                            </div>
                            ${sale.items.map(item => `
                                <div class="receipt-item-row">
                                    <div class="receipt-item-col product-col">
                                        <strong>${escapeHtml(item.product_name)}</strong>
                                        ${item.packages_sold > 0 ? `<span class="receipt-item-detail">${item.packages_sold} qop</span>` : ''}
                                        ${item.pieces_sold > 0 ? `<span class="receipt-item-detail">${item.pieces_sold} dona</span>` : ''}
                                    </div>
                                    <div class="receipt-item-col qty-col">${item.requested_quantity} dona</div>
                                    <div class="receipt-item-col price-col">${formatMoney(item.unit_price || item.piece_price || (item.subtotal / item.requested_quantity))}</div>
                                    <div class="receipt-item-col total-col"><strong>${formatMoney(item.subtotal)}</strong></div>
                                </div>
                            `).join('')}
                        </div>
                        
                        <div class="receipt-totals">
                            <div class="receipt-total-row">
                                <span class="receipt-total-label">To'lov usuli:</span>
                                <span class="receipt-total-value">${getPaymentMethodName(sale.payment_method)}</span>
                            </div>
                            <div class="receipt-total-row receipt-total-final">
                                <span class="receipt-total-label">JAMI:</span>
                                <span class="receipt-total-value">${formatMoney(sale.total_amount)}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="receipt-footer">
                        <button class="btn btn-primary" onclick="printReceipt(this.closest('.receipt-modal-content'))">
                            <i class="fas fa-print"></i> Chop etish
                        </button>
                        <button class="btn btn-secondary" onclick="this.closest('.receipt-modal').remove(); showPage('sales')">
                            Yopish
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Auto focus and enable print on Enter
            setTimeout(() => {
                modal.focus();
            }, 100);
        })
        .catch(error => {
            console.error('Error loading sale details:', error);
            alert('Sotuv muvaffaqiyatli yaratildi! Chek №: ' + saleData.id);
        });
}

function printReceipt(receiptElement) {
    const printWindow = window.open('', '', 'width=800,height=600');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Sotuv Cheki</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    padding: 2rem;
                    margin: 0;
                }
                .receipt-print {
                    max-width: 600px;
                    margin: 0 auto;
                }
                .receipt-header-print {
                    text-align: center;
                    border-bottom: 2px solid #333;
                    padding-bottom: 1rem;
                    margin-bottom: 1rem;
                }
                .receipt-info-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 0.5rem 0;
                    border-bottom: 1px solid #eee;
                }
                .receipt-items {
                    margin: 1rem 0;
                }
                .receipt-item-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 0.5rem 0;
                    border-bottom: 1px solid #eee;
                }
                .receipt-totals {
                    margin-top: 1rem;
                    padding-top: 1rem;
                    border-top: 2px solid #333;
                }
                .receipt-total-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 0.5rem 0;
                    font-weight: bold;
                }
            </style>
        </head>
        <body>
            ${receiptElement.innerHTML}
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

// Utility functions (if not defined in app.js)
if (typeof formatMoney === 'undefined') {
    function formatMoney(amount) {
        return new Intl.NumberFormat('uz-UZ', {
            style: 'currency',
            currency: 'UZS',
            minimumFractionDigits: 0
        }).format(amount || 0);
    }
    window.formatMoney = formatMoney;
}

if (typeof formatDate === 'undefined') {
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
    window.formatDate = formatDate;
}

if (typeof escapeHtml === 'undefined') {
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    window.escapeHtml = escapeHtml;
}

if (typeof getPaymentMethodName === 'undefined') {
    function getPaymentMethodName(method) {
        const methods = {
            'cash': 'Naqd',
            'card': 'Plastik karta',
            'bank_transfer': 'Hisob raqam'
        };
        return methods[method] || method;
    }
    window.getPaymentMethodName = getPaymentMethodName;
}

// Ensure all sale functions are available globally after all declarations
// Force assign all functions to window immediately when script loads
if (typeof window !== 'undefined') {
    // Force assign (overwrite if exists) - do this immediately
    window.initSalePage = initSalePage;
    window.loadSaleData = loadSaleData;
    window.setupSaleEventListeners = setupSaleEventListeners;
    window.handleCustomerSearch = handleCustomerSearch;
    window.handleProductSearch = handleProductSearch;
    window.selectCustomer = selectCustomer;
    window.clearSelectedCustomer = clearSelectedCustomer;
    window.clearProductSearch = clearProductSearch;
    window.addProductToSale = addProductToSale;
    window.editItemQuantity = editItemQuantity;
    window.updateQuantityFromInputs = updateQuantityFromInputs;
    window.updateQuantityFromTotal = updateQuantityFromTotal;
    window.saveQuantity = saveQuantity;
    window.adjustProductQuantity = adjustProductQuantity;
    window.removeSaleItem = removeSaleItem;
    window.selectPaymentMethod = selectPaymentMethod;
    window.completeSale = completeSale;
    window.resetSale = resetSale;
    window.renderProductsGrid = renderProductsGrid;
    window.renderSaleItems = renderSaleItems;
    window.updateSaleSummary = updateSaleSummary;
    window.hideSearchResults = hideSearchResults;
    window.getProductPrice = getProductPrice;
    window.updateCurrentDate = updateCurrentDate;
    window.updateSellerName = updateSellerName;
    
    console.log('Sale functions registered globally:', {
        initSalePage: typeof window.initSalePage,
        loadSaleData: typeof window.loadSaleData,
        handleCustomerSearch: typeof window.handleCustomerSearch,
        handleProductSearch: typeof window.handleProductSearch,
        completeSale: typeof window.completeSale
    });
}


