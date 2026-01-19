// API Base URL
const API = '';

// Helper function to get auth headers
function getAuthHeaders() {
    const token = localStorage.getItem('access_token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

// Helper function to handle auth errors
function handleAuthError(response) {
    if (response.status === 401) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_email');
        window.location.href = '/login';
        return true;
    }
    return false;
}

// Toast notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ========== NAVIGATION ==========
const navLinks = document.querySelectorAll('.nav-link');
const pages = document.querySelectorAll('.page');
const pageTitle = document.getElementById('page-title');

navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const pageName = link.dataset.page;
        
        // Update active nav
        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        
        // Show page
        pages.forEach(p => p.classList.remove('active'));
        document.getElementById(`${pageName}-page`).classList.add('active');
        
        // Update title
        const titles = {
            'dashboard': 'Dashboard',
            'products': 'Products',
            'orders': 'Orders',
            'expiry': 'Expiry Status'
        };
        pageTitle.textContent = titles[pageName];
        
        // Load data for page
        if (pageName === 'dashboard') loadDashboard();
        if (pageName === 'products') loadProducts();
        if (pageName === 'orders') { loadDraftOrders(); loadOrders(); }
        if (pageName === 'expiry') loadExpiry();
    });
});

// ========== DASHBOARD ==========
async function loadDashboard() {
    try {
        // Load stats
        await loadStats();
        
        // Load recent products
        const response = await fetch(`${API}/products`, {
            headers: getAuthHeaders()
        });
        
        if (handleAuthError(response)) return;
        const products = await response.json();
        
        const container = document.getElementById('recent-products');
        if (products.length === 0) {
            container.innerHTML = '<p class="empty">No products found</p>';
        } else {
            const recent = products.slice(0, 5);
            container.innerHTML = `
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Batch</th>
                            <th>Quantity</th>
                            <th>Expiry</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${recent.map(p => `
                            <tr>
                                <td>${p.name}</td>
                                <td>${p.batch}</td>
                                <td>${p.quantity}</td>
                                <td>${p.expiry_date}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }
        
        // Load draft orders for dashboard
        const draftsResponse = await fetch(`${API}/orders/drafts`, {
            headers: getAuthHeaders()
        });
        
        if (handleAuthError(draftsResponse)) return;
        const drafts = await draftsResponse.json();
        
        const draftsContainer = document.getElementById('dashboard-drafts');
        if (drafts.length === 0) {
            draftsContainer.innerHTML = '<p class="empty">No draft orders</p>';
        } else {
            draftsContainer.innerHTML = drafts.slice(0, 3).map(order => `
                <div class="list-item">
                    <div>
                        <h4>${order.product}</h4>
                        <p class="list-meta">Batch: ${order.batch} | Qty: ${order.requested_qty}</p>
                    </div>
                    <span class="badge badge-draft">Draft</span>
                </div>
            `).join('');
        }
        
    } catch (error) {
        console.error('Dashboard load error:', error);
    }
}

async function loadStats() {
    try {
        // Get products
        const productsRes = await fetch(`${API}/products`, {
            headers: getAuthHeaders()
        });
        if (handleAuthError(productsRes)) return;
        const products = await productsRes.json();
        
        // Get orders
        const ordersRes = await fetch(`${API}/orders`, {
            headers: getAuthHeaders()
        });
        if (handleAuthError(ordersRes)) return;
        const orders = await ordersRes.json();
        
        // Get expiry
        const expiryRes = await fetch(`${API}/products/expiry`, {
            headers: getAuthHeaders()
        });
        if (handleAuthError(expiryRes)) return;
        const expiry = await expiryRes.json();
        
        // Calculate stats
        document.getElementById('stat-products').textContent = products.length;
        document.getElementById('stat-orders').textContent = orders.length;
        
        const expiringSoon = expiry.filter(e => 
            e.status === 'Critical' || e.status === 'Warning' || e.status === 'Expired'
        ).length;
        document.getElementById('stat-expiry').textContent = expiringSoon;
        
        const lowStock = products.filter(p => p.quantity < 10).length;
        document.getElementById('stat-low').textContent = lowStock;
        
    } catch (error) {
        console.error('Stats load error:', error);
    }
}

// ========== PRODUCTS ==========
const addProductBtn = document.getElementById('add-product-btn');
const productModal = document.getElementById('product-modal');
const closeProduct = document.getElementById('close-product');
const cancelProduct = document.getElementById('cancel-product');
const productForm = document.getElementById('product-form');

addProductBtn.addEventListener('click', () => {
    productModal.classList.add('show');
});

closeProduct.addEventListener('click', () => {
    productModal.classList.remove('show');
    productForm.reset();
});

cancelProduct.addEventListener('click', () => {
    productModal.classList.remove('show');
    productForm.reset();
});

// Add product
productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const product = {
        name: document.getElementById('product-name').value,
        price: parseFloat(document.getElementById('product-price').value),
        quantity: parseInt(document.getElementById('product-quantity').value),
        batch: document.getElementById('product-batch').value,
        expiry_date: document.getElementById('product-expiry').value
    };
    
    try {
        const response = await fetch(`${API}/products`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(product)
        });
        
        if (handleAuthError(response)) return;
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to add product');
        }
        
        const result = await response.json();
        showToast(result.message || 'Product added successfully', 'success');
        productModal.classList.remove('show');
        productForm.reset();
        
        await loadProducts();
        await loadStats();
    } catch (error) {
        showToast(error.message, 'error');
    }
});

// Load products
async function loadProducts() {
    try {
        const response = await fetch(`${API}/products`, {
            headers: getAuthHeaders()
        });
        
        if (handleAuthError(response)) return;
        const products = await response.json();
        
        const container = document.getElementById('products-list');
        
        if (products.length === 0) {
            container.innerHTML = '<p class="empty">No products found</p>';
            return;
        }
        
        container.innerHTML = products.map(product => `
            <div class="product-card">
                <h3>${product.name}</h3>
                <div class="product-meta">
                    <div>Price: ₹${product.price.toFixed(2)}</div>
                    <div>Quantity: ${product.quantity}</div>
                    <div>Batch: ${product.batch}</div>
                    <div>Expiry: ${product.expiry_date}</div>
                </div>
                <div class="product-actions">
                    <button class="btn btn-sm" onclick="openReceiveModal('${product.batch}', '${product.name}')">Receive</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteProduct('${product.batch}')">Delete</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        showToast('Failed to load products', 'error');
    }
}

// Delete product
async function deleteProduct(batch) {
    if (!confirm(`Delete product with batch ${batch}?`)) return;
    
    try {
        const response = await fetch(`${API}/products/${batch}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        if (handleAuthError(response)) return;
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to delete product');
        }
        
        showToast('Product deleted successfully', 'success');
        await loadProducts();
        await loadStats();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// Refresh products
document.getElementById('refresh-products').addEventListener('click', loadProducts);

// ========== RECEIVE STOCK ==========
const receiveModal = document.getElementById('receive-modal');
const closeReceive = document.getElementById('close-receive');
const cancelReceive = document.getElementById('cancel-receive');
const receiveForm = document.getElementById('receive-form');

function openReceiveModal(batch, name) {
    document.getElementById('receive-batch').value = batch;
    document.getElementById('receive-product-name').value = name;
    document.getElementById('receive-quantity').value = '';
    receiveModal.classList.add('show');
}

closeReceive.addEventListener('click', () => {
    receiveModal.classList.remove('show');
    receiveForm.reset();
});

cancelReceive.addEventListener('click', () => {
    receiveModal.classList.remove('show');
    receiveForm.reset();
});

receiveForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const batch = document.getElementById('receive-batch').value;
    const quantity = parseInt(document.getElementById('receive-quantity').value);
    
    try {
        const response = await fetch(`${API}/supplier/recieve?batch=${batch}&received_quantity=${quantity}`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        
        if (handleAuthError(response)) return;
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to receive stock');
        }
        
        const result = await response.json();
        showToast(`Stock received: ${result.received} units`, 'success');
        receiveModal.classList.remove('show');
        receiveForm.reset();
        
        await loadProducts();
        await loadStats();
    } catch (error) {
        showToast(error.message, 'error');
    }
});

// ========== ORDERS ==========
const createOrderBtn = document.getElementById('create-order-btn');
const orderModal = document.getElementById('order-modal');
const closeOrder = document.getElementById('close-order');
const cancelOrder = document.getElementById('cancel-order');
const orderForm = document.getElementById('order-form');

createOrderBtn.addEventListener('click', () => {
    orderModal.classList.add('show');
});

closeOrder.addEventListener('click', () => {
    orderModal.classList.remove('show');
    orderForm.reset();
});

cancelOrder.addEventListener('click', () => {
    orderModal.classList.remove('show');
    orderForm.reset();
});

// Create order
orderForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const batch = document.getElementById('order-batch').value;
    const quantity = parseInt(document.getElementById('order-quantity').value);
    
    try {
        const response = await fetch(`${API}/orders?batch=${batch}&quantity=${quantity}`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        
        if (handleAuthError(response)) return;
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to create order');
        }
        
        const result = await response.json();
        showToast(result.message || 'Order created successfully', 'success');
        orderModal.classList.remove('show');
        orderForm.reset();
        
        await loadDraftOrders();
        await loadOrders();
    } catch (error) {
        showToast(error.message, 'error');
    }
});

// Load draft orders
async function loadDraftOrders() {
    try {
        const response = await fetch(`${API}/orders/drafts`, {
            headers: getAuthHeaders()
        });
        
        if (handleAuthError(response)) return;
        const drafts = await response.json();
        
        const container = document.getElementById('draft-orders-list');
        
        if (drafts.length === 0) {
            container.innerHTML = '<p class="empty">No draft orders</p>';
            return;
        }
        
        container.innerHTML = drafts.map(order => `
            <div class="list-item">
                <div>
                    <h4>${order.product}</h4>
                    <p class="list-meta">Order ID: ${order.order_id} | Batch: ${order.batch} | Qty: ${order.requested_qty}</p>
                </div>
                <div class="list-actions">
                    <button class="btn btn-sm" onclick="openEditOrderModal('${order.order_id}', '${order.product}', '${order.batch}', ${order.requested_qty})">Edit</button>
                    <button class="btn btn-sm btn-success" onclick="confirmOrder('${order.order_id}')">Confirm</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        showToast('Failed to load draft orders', 'error');
    }
}

// Load all orders
async function loadOrders() {
    try {
        const response = await fetch(`${API}/orders`, {
            headers: getAuthHeaders()
        });
        
        if (handleAuthError(response)) return;
        const orders = await response.json();
        
        const container = document.getElementById('orders-list');
        
        if (orders.length === 0) {
            container.innerHTML = '<p class="empty">No orders found</p>';
            return;
        }
        
        container.innerHTML = orders.map(order => `
            <div class="list-item">
                <div>
                    <h4>${order.product}</h4>
                    <p class="list-meta">Order ID: ${order.order_id} | Batch: ${order.batch} | Qty: ${order.requested_qty}</p>
                </div>
                <span class="badge badge-${order.status.toLowerCase()}">${order.status}</span>
            </div>
        `).join('');
    } catch (error) {
        showToast('Failed to load orders', 'error');
    }
}

// Confirm order
async function confirmOrder(orderId) {
    if (!confirm(`Confirm order ${orderId}?`)) return;
    
    try {
        const response = await fetch(`${API}/orders/${orderId}/confirm`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        
        if (handleAuthError(response)) return;
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to confirm order');
        }
        
        showToast('Order confirmed successfully', 'success');
        await loadDraftOrders();
        await loadOrders();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// Refresh orders
document.getElementById('refresh-orders').addEventListener('click', () => {
    loadDraftOrders();
    loadOrders();
});

// ========== EDIT ORDER ==========
const editOrderModal = document.getElementById('edit-order-modal');
const closeEditOrder = document.getElementById('close-edit-order');
const cancelEditOrder = document.getElementById('cancel-edit-order');
const editOrderForm = document.getElementById('edit-order-form');

function openEditOrderModal(orderId, product, batch, quantity) {
    document.getElementById('edit-order-id').value = orderId;
    document.getElementById('edit-order-product').value = product;
    document.getElementById('edit-order-batch').value = batch;
    document.getElementById('edit-order-quantity').value = quantity;
    editOrderModal.classList.add('show');
}

closeEditOrder.addEventListener('click', () => {
    editOrderModal.classList.remove('show');
    editOrderForm.reset();
});

cancelEditOrder.addEventListener('click', () => {
    editOrderModal.classList.remove('show');
    editOrderForm.reset();
});

editOrderForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const orderId = document.getElementById('edit-order-id').value;
    const quantity = parseInt(document.getElementById('edit-order-quantity').value);
    
    try {
        const response = await fetch(`${API}/orders/${orderId}?quantity=${quantity}`, {
            method: 'PUT',
            headers: getAuthHeaders()
        });
        
        if (handleAuthError(response)) return;
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to update order');
        }
        
        showToast('Order updated successfully', 'success');
        editOrderModal.classList.remove('show');
        editOrderForm.reset();
        
        await loadDraftOrders();
        await loadOrders();
    } catch (error) {
        showToast(error.message, 'error');
    }
});

// ========== EXPIRY ==========
async function loadExpiry() {
    try {
        const response = await fetch(`${API}/products/expiry`, {
            headers: getAuthHeaders()
        });
        
        if (handleAuthError(response)) return;
        const items = await response.json();
        
        const container = document.getElementById('expiry-list');
        
        if (items.length === 0) {
            container.innerHTML = '<p class="empty">No products found</p>';
            return;
        }
        
        container.innerHTML = items.map(item => `
            <div class="list-item">
                <div>
                    <h4>${item.name}</h4>
                    <p class="list-meta">Batch: ${item.batch} | Days Left: ${item.days_left}</p>
                </div>
                <span class="badge badge-${item.status.toLowerCase()}">${item.status}</span>
            </div>
        `).join('');
    } catch (error) {
        showToast('Failed to load expiry data', 'error');
    }
}

// Refresh expiry
document.getElementById('refresh-expiry').addEventListener('click', loadExpiry);

// ========== INITIALIZE ==========
// Don't load anything automatically - only load when user clicks