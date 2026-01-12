// API Base URL
const API = '';

// DOM Elements
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.content');

// Toast notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.remove('hidden');
    
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

// Tab switching
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const targetTab = tab.dataset.tab;
        
        tabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        
        tab.classList.add('active');
        document.getElementById(`${targetTab}-tab`).classList.add('active');
        
        // Load data when switching tabs
        if (targetTab === 'products') loadProducts();
        if (targetTab === 'orders') {
            loadDraftOrders();
            loadOrders();
        }
        if (targetTab === 'expiry') loadExpiry();
    });
});

// ========== PRODUCTS ==========

// Show/hide add product form
document.getElementById('add-product-btn').addEventListener('click', () => {
    document.getElementById('add-product-form').classList.remove('hidden');
});

document.getElementById('cancel-product').addEventListener('click', () => {
    document.getElementById('add-product-form').classList.add('hidden');
    document.getElementById('product-form').reset();
});

// Add product
document.getElementById('product-form').addEventListener('submit', async (e) => {
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(product)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to add product');
        }
        
        const result = await response.json();
        showToast(result.message || 'Product added successfully');
        document.getElementById('add-product-form').classList.add('hidden');
        document.getElementById('product-form').reset();
        loadProducts();
    } catch (error) {
        showToast(error.message, 'error');
    }
});

// Load products
async function loadProducts() {
    try {
        const response = await fetch(`${API}/products`);
        const products = await response.json();
        
        const container = document.getElementById('products-list');
        
        if (products.length === 0) {
            container.innerHTML = '<div class="empty-state">NO PRODUCTS FOUND</div>';
            return;
        }
        
        container.innerHTML = products.map(product => `
            <div class="card">
                <h3>${product.name}</h3>
                <div class="card-meta">
                    <div>PRICE: ₹${product.price.toFixed(2)}</div>
                    <div>QUANTITY: ${product.quantity}</div>
                    <div>BATCH: ${product.batch}</div>
                    <div>EXPIRY: ${product.expiry_date}</div>
                </div>
                <div class="card-actions">
                    <button class="btn" onclick="openReceiveModal('${product.batch}', '${product.name}')">RECEIVE</button>
                    <button class="btn danger" onclick="deleteProduct('${product.batch}')">DELETE</button>
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
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to delete product');
        }
        
        showToast('Product deleted successfully');
        loadProducts();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// Refresh products
document.getElementById('refresh-products').addEventListener('click', loadProducts);

// ========== ORDERS ==========

// Show/hide create order form
document.getElementById('create-order-btn').addEventListener('click', () => {
    document.getElementById('create-order-form').classList.remove('hidden');
});

document.getElementById('cancel-order').addEventListener('click', () => {
    document.getElementById('create-order-form').classList.add('hidden');
    document.getElementById('order-form').reset();
});

// Create order
document.getElementById('order-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const batch = document.getElementById('order-batch').value;
    const quantity = parseInt(document.getElementById('order-quantity').value);
    
    try {
        const response = await fetch(`${API}/orders?batch=${batch}&quantity=${quantity}`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to create order');
        }
        
        const result = await response.json();
        showToast(result.message || 'Order created successfully');
        document.getElementById('create-order-form').classList.add('hidden');
        document.getElementById('order-form').reset();
        loadDraftOrders();
        loadOrders();
    } catch (error) {
        showToast(error.message, 'error');
    }
});

// Load draft orders
async function loadDraftOrders() {
    try {
        const response = await fetch(`${API}/orders/drafts`);
        const drafts = await response.json();
        
        const container = document.getElementById('draft-orders-list');
        
        if (drafts.length === 0) {
            container.innerHTML = '<div class="empty-state">NO DRAFT ORDERS</div>';
            return;
        }
        
        container.innerHTML = drafts.map(order => `
            <div class="list-item draft">
                <div class="list-item-content">
                    <h3>${order.product}</h3>
                    <div class="list-item-meta">
                        ORDER ID: ${order.order_id} | BATCH: ${order.batch} | QTY: ${order.requested_qty} | CREATED: ${order.created_at}
                    </div>
                </div>
                <span class="badge badge-draft">DRAFT</span>
                <div class="list-item-actions">
                    <button class="btn info btn-small" onclick="openEditOrderModal('${order.order_id}', '${order.product}', '${order.batch}', ${order.requested_qty})">EDIT</button>
                    <button class="btn success btn-small" onclick="confirmOrder('${order.order_id}')">CONFIRM</button>
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
        const response = await fetch(`${API}/orders`);
        const orders = await response.json();
        
        const container = document.getElementById('orders-list');
        
        if (orders.length === 0) {
            container.innerHTML = '<div class="empty-state">NO ORDERS FOUND</div>';
            return;
        }
        
        container.innerHTML = orders.map(order => {
            // Check if order has the new structure
            if (order.order_id) {
                return `
                    <div class="list-item">
                        <div class="list-item-content">
                            <h3>${order.product}</h3>
                            <div class="list-item-meta">
                                ORDER ID: ${order.order_id} | BATCH: ${order.batch} | QTY: ${order.requested_qty} | CREATED: ${order.created_at}
                            </div>
                        </div>
                        <span class="badge badge-${order.status.toLowerCase()}">${order.status}</span>
                    </div>
                `;
            } else {
                // Old structure fallback
                return `
                    <div class="list-item">
                        <div class="list-item-content">
                            <h3>${order.name || order.product}</h3>
                            <div class="list-item-meta">
                                BATCH: ${order.batch} | QTY: ${order.quantity || order.requested_qty} | STOCK: ${order.current_stock || 'N/A'}
                            </div>
                        </div>
                    </div>
                `;
            }
        }).join('');
    } catch (error) {
        showToast('Failed to load orders', 'error');
    }
}

// Confirm order
async function confirmOrder(orderId) {
    if (!confirm(`Confirm order ${orderId}?`)) return;
    
    try {
        const response = await fetch(`${API}/orders/${orderId}/confirm`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to confirm order');
        }
        
        showToast('Order confirmed successfully');
        loadDraftOrders();
        loadOrders();
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

// Open edit order modal
function openEditOrderModal(orderId, product, batch, quantity) {
    document.getElementById('edit-order-id').value = orderId;
    document.getElementById('edit-order-product').value = product;
    document.getElementById('edit-order-batch').value = batch;
    document.getElementById('edit-order-quantity').value = quantity;
    document.getElementById('edit-order-modal').classList.remove('hidden');
}

// Close edit order modal
document.getElementById('cancel-edit-order').addEventListener('click', () => {
    document.getElementById('edit-order-modal').classList.add('hidden');
    document.getElementById('edit-order-form').reset();
});

// Close modal on backdrop click
document.getElementById('edit-order-modal').addEventListener('click', (e) => {
    if (e.target.id === 'edit-order-modal') {
        document.getElementById('edit-order-modal').classList.add('hidden');
        document.getElementById('edit-order-form').reset();
    }
});

// Update order
document.getElementById('edit-order-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const orderId = document.getElementById('edit-order-id').value;
    const quantity = parseInt(document.getElementById('edit-order-quantity').value);
    
    try {
        const response = await fetch(`${API}/orders/${orderId}?quantity=${quantity}`, {
            method: 'PUT'
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to update order');
        }
        
        showToast('Order updated successfully');
        document.getElementById('edit-order-modal').classList.add('hidden');
        document.getElementById('edit-order-form').reset();
        loadDraftOrders();
        loadOrders();
    } catch (error) {
        showToast(error.message, 'error');
    }
});

// ========== EXPIRY ==========

// Load expiry status
async function loadExpiry() {
    try {
        const response = await fetch(`${API}/products/expiry`);
        const items = await response.json();
        
        const container = document.getElementById('expiry-list');
        
        if (items.length === 0) {
            container.innerHTML = '<div class="empty-state">NO PRODUCTS FOUND</div>';
            return;
        }
        
        container.innerHTML = items.map(item => `
            <div class="list-item">
                <div class="list-item-content">
                    <h3>${item.name}</h3>
                    <div class="list-item-meta">
                        BATCH: ${item.batch} | DAYS LEFT: ${item.days_left}
                    </div>
                </div>
                <span class="badge badge-${item.status.toLowerCase()}">${item.status.toUpperCase()}</span>
            </div>
        `).join('');
    } catch (error) {
        showToast('Failed to load expiry data', 'error');
    }
}

// Refresh expiry
document.getElementById('refresh-expiry').addEventListener('click', loadExpiry);

// ========== RECEIVE STOCK ==========

// Open receive modal
function openReceiveModal(batch, name) {
    document.getElementById('receive-batch').value = batch;
    document.getElementById('receive-product-name').value = name;
    document.getElementById('receive-quantity').value = '';
    document.getElementById('receive-modal').classList.remove('hidden');
}

// Close receive modal
document.getElementById('cancel-receive').addEventListener('click', () => {
    document.getElementById('receive-modal').classList.add('hidden');
    document.getElementById('receive-form').reset();
});

// Close modal on backdrop click
document.getElementById('receive-modal').addEventListener('click', (e) => {
    if (e.target.id === 'receive-modal') {
        document.getElementById('receive-modal').classList.add('hidden');
        document.getElementById('receive-form').reset();
    }
});

// Receive stock
document.getElementById('receive-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const batch = document.getElementById('receive-batch').value;
    const quantity = parseInt(document.getElementById('receive-quantity').value);
    
    try {
        const response = await fetch(`${API}/supplier/recieve?batch=${batch}&received_quantity=${quantity}`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to receive stock');
        }
        
        const result = await response.json();
        showToast(`Stock updated: ${result.received} received, new stock: ${result.current_stock}`);
        document.getElementById('receive-modal').classList.add('hidden');
        document.getElementById('receive-form').reset();
        loadProducts();
        // Refresh draft orders as auto-create might have triggered
        loadDraftOrders();
    } catch (error) {
        showToast(error.message, 'error');
    }
});

// ========== INITIALIZE ==========

// Load products on page load
loadProducts();