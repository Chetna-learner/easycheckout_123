const app = {
    currentView: 'dashboard',

    // Core Navigation Methods
    init() {
        this.bindEvents();
        this.renderRoleMenu();

        // Handle initial route or fallback
        const hash = window.location.hash.slice(1);
        if (hash && this.views[hash]) {
            this.navigate(hash);
        } else {
            this.navigate(db.getRole() === 'admin' ? 'dashboard' : 'scan');
        }

        // Listen to hash changes (back button support)
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash.slice(1);
            if (hash && this.views[hash] && hash !== this.currentView) {
                this.render(hash);
            }
        });
    },

    bindEvents() {
        document.getElementById('menu-toggle').addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('open');
        });

        document.getElementById('role-toggle').addEventListener('click', () => {
            this.toggleRole();
        });
    },

    toggleRole() {
        const roles = ['admin', 'customer', 'staff'];
        const current = db.getRole();
        const nextIdx = (roles.indexOf(current) + 1) % roles.length;
        const newRole = roles[nextIdx];

        db.setRole(newRole);
        this.showToast(`Role switched to: ${newRole.toUpperCase()}`, 'success');
        this.renderRoleMenu();

        // Redirect to default view for role
        if (newRole === 'admin') this.navigate('dashboard');
        else if (newRole === 'customer') this.navigate('scan');
        else if (newRole === 'staff') this.navigate('verify');
    },

    renderRoleMenu() {
        const role = db.getRole();
        const navLinks = document.getElementById('nav-links');
        const cartIcon = document.getElementById('cart-icon-container');
        let linksHTML = '';

        // Role specific UI adjustments
        if (role === 'admin') {
            cartIcon.classList.add('hidden');
            linksHTML = `
                <li class="nav-item" onclick="app.navigate('dashboard')" data-view="dashboard"><i class="ph ph-squares-four"></i> Dashboard</li>
                <li class="nav-item" onclick="app.navigate('admin-products')" data-view="admin-products"><i class="ph ph-packages"></i> Products</li>
                <li class="nav-item" onclick="app.navigate('admin-transactions')" data-view="admin-transactions"><i class="ph ph-receipt"></i> Transactions</li>
            `;
        } else if (role === 'customer') {
            cartIcon.classList.remove('hidden');
            this.updateCartBadge();
            linksHTML = `
                <li class="nav-item" onclick="app.navigate('scan')" data-view="scan"><i class="ph ph-qr-code"></i> Scan & Shop</li>
                <li class="nav-item" onclick="app.navigate('cart')" data-view="cart"><i class="ph ph-shopping-cart"></i> Cart</li>
            `;
        } else if (role === 'staff') {
            cartIcon.classList.add('hidden');
            linksHTML = `
                <li class="nav-item" onclick="app.navigate('verify')" data-view="verify"><i class="ph ph-shield-check"></i> Verify Exit</li>
            `;
        }

        navLinks.innerHTML = linksHTML;
        this.highlightNav(this.currentView);
    },

    navigate(viewName, params = {}) {
        window.location.hash = viewName;
        this.render(viewName, params);
    },

    render(viewName, params = {}) {
        this.currentView = viewName;
        const viewData = this.views[viewName];
        if (!viewData) return;

        // Update title
        document.getElementById('page-title').textContent = viewData.title;

        // Render view HTML
        document.getElementById('view-container').innerHTML = typeof viewData.html === 'function' ? viewData.html(params) : viewData.html;

        // Initialize view logic
        if (viewData.init) {
            viewData.init(params);
        }

        this.highlightNav(viewName);

        // Close sidebar on mobile
        document.getElementById('sidebar').classList.remove('open');
    },

    highlightNav(viewName) {
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        const activeLink = document.querySelector(`.nav-item[data-view="${viewName}"]`);
        if (activeLink) activeLink.classList.add('active');
    },

    updateCartBadge() {
        const cart = db.getCart();
        const count = cart.reduce((acc, item) => acc + item.quantity, 0);
        document.getElementById('cart-badge').textContent = count;
    },

    showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icon = type === 'success' ? '<i class="ph-fill ph-check-circle"></i>' : '<i class="ph-fill ph-warning-circle"></i>';
        toast.innerHTML = `${icon} <span>${message}</span>`;

        container.appendChild(toast);

        setTimeout(() => toast.classList.add('fade-out'), 2500);
        setTimeout(() => toast.remove(), 3000);
    },

    // View Definitions
    views: {
        'dashboard': {
            title: 'Admin Dashboard',
            html: () => {
                const products = db.getProducts().length;
                const txns = db.getTransactions();
                const totalSales = txns.reduce((sum, t) => sum + t.total, 0);

                return `
                    <div class="grid-3">
                        <div class="card">
                            <h3 class="text-muted">Total Products</h3>
                            <h2 style="font-size: 2.5rem; color: var(--primary); margin-top: 8px;">${products}</h2>
                        </div>
                        <div class="card">
                            <h3 class="text-muted">Total Sales</h3>
                            <h2 style="font-size: 2.5rem; color: var(--secondary); margin-top: 8px;">₹${totalSales.toFixed(2)}</h2>
                        </div>
                        <div class="card">
                            <h3 class="text-muted">Transactions</h3>
                            <h2 style="font-size: 2.5rem; color: var(--accent); margin-top: 8px;">${txns.length}</h2>
                        </div>
                    </div>
                `;
            }
        },
        'admin-products': {
            title: 'Manage Products',
            html: `
                <div class="card mb-4">
                    <h3>Add New Product</h3>
                    <form id="add-product-form" class="mt-4 grid-3">
                        <div class="form-group">
                            <label>Product Name</label>
                            <input type="text" id="p-name" required>
                        </div>
                        <div class="form-group">
                            <label>Price (₹)</label>
                            <input type="number" id="p-price" step="0.01" required>
                        </div>
                        <div class="form-group">
                            <label>Stock</label>
                            <input type="number" id="p-stock" required>
                        </div>
                        <div style="grid-column: 1 / -1;">
                            <button type="submit" class="button"><i class="ph ph-plus"></i> Add Product</button>
                        </div>
                    </form>
                </div>
                
                <div class="card">
                    <h3>Product List</h3>
                    <div id="product-list" class="mt-4"></div>
                </div>
                
                <!-- QR Code Modal -->
                <div id="qr-modal" class="hidden" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:1000; display:flex; align-items:center; justify-content:center;">
                    <div class="card text-center" style="min-width: 300px; position: relative;">
                        <button class="icon-btn" onclick="document.getElementById('qr-modal').classList.add('hidden')" style="position:absolute; top:12px; right:12px;"><i class="ph ph-x"></i></button>
                        <h3 id="qr-title" class="mb-4"></h3>
                        <div id="qr-code-container" style="display:flex; justify-content:center; margin: 20px 0;"></div>
                        <p class="text-muted">Print this QR code and attach to shelf</p>
                    </div>
                </div>
            `,
            init: () => {
                const renderProducts = () => {
                    const products = db.getProducts();
                    const list = document.getElementById('product-list');
                    if (products.length === 0) {
                        list.innerHTML = '<p class="text-muted">No products available.</p>';
                        return;
                    }

                    let html = '<table style="width:100%; text-align:left; border-collapse:collapse;">';
                    html += '<tr style="border-bottom:1px solid var(--border-color);"><th>ID</th><th>Name</th><th>Price</th><th>Stock</th><th>Actions</th></tr>';

                    products.forEach(p => {
                        html += `
                            <tr style="border-bottom:1px solid #eee;">
                                <td style="padding:12px 0;">${p.id}</td>
                                <td>${p.name}</td>
                                <td>₹${p.price.toFixed(2)}</td>
                                <td>${p.stock}</td>
                                <td>
                                    <button class="button secondary" onclick="app.views['admin-products'].showQR('${p.id}', '${p.name}')" style="padding: 6px 12px; font-size: 0.85rem;"><i class="ph ph-qr-code"></i> Print QR</button>
                                    <button class="button" onclick="app.views['admin-products'].deleteProduct('${p.id}')" style="background:var(--accent); padding: 6px 12px; font-size: 0.85rem;"><i class="ph ph-trash"></i></button>
                                </td>
                            </tr>
                        `;
                    });
                    html += '</table>';
                    list.innerHTML = html;
                };

                renderProducts();

                document.getElementById('add-product-form').addEventListener('submit', (e) => {
                    e.preventDefault();
                    const name = document.getElementById('p-name').value;
                    const price = parseFloat(document.getElementById('p-price').value);
                    const stock = parseInt(document.getElementById('p-stock').value);
                    const id = 'P' + Math.floor(Math.random() * 10000).toString().padStart(4, '0');

                    db.addProduct({ id, name, price, stock });
                    app.showToast('Product added successfully!');
                    e.target.reset();
                    renderProducts();
                });

                // Expose methods to view context
                app.views['admin-products'].deleteProduct = (id) => {
                    if (confirm('Delete product?')) {
                        db.deleteProduct(id);
                        app.showToast('Product deleted', 'success');
                        renderProducts();
                    }
                };

                app.views['admin-products'].showQR = (id, name) => {
                    const modal = document.getElementById('qr-modal');
                    const container = document.getElementById('qr-code-container');
                    document.getElementById('qr-title').textContent = name;

                    container.innerHTML = '';
                    new QRCode(container, {
                        text: id, // Ensure we encode the ID for scanner
                        width: 200,
                        height: 200,
                        colorDark: "#000000",
                        colorLight: "#ffffff",
                        correctLevel: QRCode.CorrectLevel.H
                    });

                    modal.classList.remove('hidden');
                };
            }
        },
        'admin-transactions': {
            title: 'Transactions',
            html: `
                <div class="card">
                    <div id="txn-list"></div>
                </div>
            `,
            init: () => {
                const txns = db.getTransactions();
                const list = document.getElementById('txn-list');

                if (txns.length === 0) {
                    list.innerHTML = '<p class="text-muted">No transactions yet.</p>';
                    return;
                }

                let html = '<table style="width:100%; text-align:left; border-collapse:collapse;">';
                html += '<tr style="border-bottom:1px solid var(--border-color);"><th>Txn ID</th><th>Date</th><th>Method</th><th>Total</th><th>Status</th></tr>';

                txns.reverse().forEach(t => {
                    const date = new Date(t.timestamp).toLocaleString();
                    const statusColor = t.status === 'EXITED' ? 'var(--secondary)' : 'var(--primary)';
                    html += `
                        <tr style="border-bottom:1px solid #eee;">
                            <td style="padding:12px 0; font-family: monospace;">${t.id}</td>
                            <td>${date}</td>
                            <td>${t.paymentMethod}</td>
                            <td style="font-weight:600;">₹${t.total.toFixed(2)}</td>
                            <td><span style="background:${statusColor}; color:white; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: bold;">${t.status}</span></td>
                        </tr>
                    `;
                });
                html += '</table>';
                list.innerHTML = html;
            }
        },
        'scan': {
            title: 'Scan Product',
            html: `
                <div class="card text-center mb-4">
                    <h3>QR Scanner</h3>
                    <div id="reader-container" style="width: 100%; max-width: 400px; margin: 20px auto; overflow: hidden; border-radius: var(--radius-md);">
                        <div id="qr-reader" style="width: 100%;"></div>
                    </div>
                </div>
                
                <div class="card text-center">
                    <h4 class="mb-4">Or Enter Product ID Manually</h4>
                    <form id="manual-scan-form" style="display: flex; gap: 12px; justify-content: center;">
                        <input type="text" id="manual-pid" placeholder="e.g. P001" required style="padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); font-family: inherit;">
                        <button type="submit" class="button"><i class="ph ph-plus"></i> Add</button>
                    </form>
                </div>
            `,
            init: () => {
                const addProduct = (id) => {
                    const success = db.addToCart(id);
                    if (success) {
                        const p = db.getProductById(id);
                        app.showToast(`Added ${p.name} to cart`, 'success');
                        app.updateCartBadge();
                    } else {
                        app.showToast('Product not found!', 'error');
                    }
                };

                // Manual Add
                document.getElementById('manual-scan-form').addEventListener('submit', (e) => {
                    e.preventDefault();
                    const id = document.getElementById('manual-pid').value.trim().toUpperCase();
                    addProduct(id);
                    e.target.reset();
                });

                // Camera Scan Setup
                try {
                    app.html5QrcodeScanner = new Html5QrcodeScanner("qr-reader", { fps: 10, qrbox: 250 });
                    app.html5QrcodeScanner.render((decodedText, decodedResult) => {
                        // Handle on success
                        addProduct(decodedText);
                        // Prevent rapid scanning
                        app.html5QrcodeScanner.pause(true);
                        setTimeout(() => app.html5QrcodeScanner.resume(), 3000);
                    }, (error) => {
                        // ignore failures
                    });
                } catch (e) {
                    console.error("QR scanner init failed", e);
                }
            }
        },
        'cart': {
            title: 'Your Cart',
            html: `
                <div class="grid-2">
                    <div class="card" style="grid-column: 1 / span 2;">
                        <div id="cart-list"></div>
                    </div>
                </div>
            `,
            init: () => {
                const render = () => {
                    const cart = db.getCart();
                    const list = document.getElementById('cart-list');

                    if (cart.length === 0) {
                        list.innerHTML = `
                            <div class="text-center" style="padding: 40px 0;">
                                <i class="ph ph-shopping-cart" style="font-size: 4rem; color: var(--text-muted); margin-bottom: 16px;"></i>
                                <h3 class="text-muted">Your cart is empty</h3>
                                <button class="button mt-4" onclick="app.navigate('scan')">Start Scanning</button>
                            </div>
                        `;
                        return;
                    }

                    let total = 0;
                    let html = '<div style="display:flex; flex-direction:column; gap:16px;">';

                    cart.forEach(item => {
                        const itemTotal = item.price * item.quantity;
                        total += itemTotal;
                        html += `
                            <div style="display:flex; justify-content:space-between; align-items:center; padding-bottom:16px; border-bottom:1px solid #eee;">
                                <div>
                                    <h4 style="margin-bottom:4px;">${item.name}</h4>
                                    <span class="text-muted">₹${item.price.toFixed(2)} / each</span>
                                </div>
                                <div style="display:flex; align-items:center; gap: 16px;">
                                    <div style="display:flex; align-items:center; border: 1px solid var(--border-color); border-radius: var(--radius-sm);">
                                        <button class="icon-btn" onclick="app.views['cart'].updateQty('${item.id}', ${item.quantity - 1})" style="padding:4px;"><i class="ph ph-minus"></i></button>
                                        <span style="width: 32px; text-align:center; font-weight: 500;">${item.quantity}</span>
                                        <button class="icon-btn" onclick="app.views['cart'].updateQty('${item.id}', ${item.quantity + 1})" style="padding:4px;"><i class="ph ph-plus"></i></button>
                                    </div>
                                    <h4 style="width: 80px; text-align:right;">₹${itemTotal.toFixed(2)}</h4>
                                    <button class="icon-btn" onclick="app.views['cart'].updateQty('${item.id}', 0)" style="color:var(--accent);"><i class="ph ph-trash"></i></button>
                                </div>
                            </div>
                        `;
                    });

                    html += `
                        </div>
                        <div style="margin-top:24px; padding-top:24px; border-top:2px solid var(--border-color); display:flex; justify-content:space-between; align-items:center;">
                            <h3>Total:</h3>
                            <h2 style="font-size:2rem; color:var(--primary);">₹${total.toFixed(2)}</h2>
                        </div>
                        <div class="text-center mt-4" style="text-align: right;">
                            <button class="button success" style="padding: 16px 32px; font-size: 1.1rem;" onclick="app.navigate('checkout')"><i class="ph-fill ph-credit-card"></i> Proceed to Checkout</button>
                        </div>
                    `;
                    list.innerHTML = html;
                };

                app.views['cart'].updateQty = (id, newQty) => {
                    db.updateCartQuantity(id, newQty);
                    app.updateCartBadge();
                    render();
                };

                render();
            }
        },
        'checkout': {
            title: 'Checkout & Payment',
            html: `
                <div class="grid-2" style="max-width:800px; margin: 0 auto;">
                    <div class="card">
                        <h3 class="mb-4">Order Summary</h3>
                        <div id="checkout-summary"></div>
                    </div>
                    <div class="card">
                        <h3 class="mb-4">Payment Method</h3>
                        <div style="display:flex; flex-direction:column; gap:12px;">
                            <label style="display:flex; align-items:center; gap:12px; padding:16px; border:1px solid var(--border-color); border-radius:var(--radius-md); cursor:pointer;" class="payment-method">
                                <input type="radio" name="payment" value="UPI" checked style="width:18px; height:18px;">
                                <span style="font-weight:500;">UPI / QR Code</span>
                            </label>
                            <label style="display:flex; align-items:center; gap:12px; padding:16px; border:1px solid var(--border-color); border-radius:var(--radius-md); cursor:pointer;" class="payment-method">
                                <input type="radio" name="payment" value="Card" style="width:18px; height:18px;">
                                <span style="font-weight:500;">Credit / Debit Card</span>
                            </label>
                            <label style="display:flex; align-items:center; gap:12px; padding:16px; border:1px solid var(--border-color); border-radius:var(--radius-md); cursor:pointer;" class="payment-method">
                                <input type="radio" name="payment" value="Wallet" style="width:18px; height:18px;">
                                <span style="font-weight:500;">Digital Wallet</span>
                            </label>
                        </div>
                        <button class="button success mt-4" style="width:100%; padding:16px;" onclick="app.views['checkout'].pay()"><i class="ph-fill ph-lock-key"></i> Pay Securely</button>
                    </div>
                </div>
            `,
            init: () => {
                const cart = db.getCart();
                if (cart.length === 0) {
                    app.navigate('cart');
                    return;
                }

                const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                document.getElementById('checkout-summary').innerHTML = `
                    <div style="display:flex; justify-content:space-between; margin-bottom:8px;"><span class="text-muted">Items (${cart.length}):</span> <span>₹${total.toFixed(2)}</span></div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:8px;"><span class="text-muted">Tax (0%):</span> <span>₹0.00</span></div>
                    <div style="display:flex; justify-content:space-between; margin-top:16px; padding-top:16px; border-top:1px solid #eee; font-weight:bold; font-size:1.2rem;">
                        <span>Total:</span> <span style="color:var(--primary);">₹${total.toFixed(2)}</span>
                    </div>
                `;

                app.views['checkout'].pay = () => {
                    const method = document.querySelector('input[name="payment"]:checked').value;
                    const txn = db.createTransaction(method);
                    if (txn) {
                        app.updateCartBadge();
                        app.showToast('Payment Successful!', 'success');
                        app.navigate('receipt', { txn });
                    }
                };
            }
        },
        'receipt': {
            title: 'Exit Pass / Receipt',
            html: (params) => {
                // If deep linked without params, fetch last or show error
                if (!params || !params.txn) {
                    return `<div class="card text-center"><h3>Invalid Receipt</h3><button class="button mt-4" onclick="app.navigate('scan')">Go back</button></div>`;
                }
                const tx = params.txn;

                let itemsHtml = '';
                tx.items.forEach(i => {
                    itemsHtml += `<div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px dashed #eee; font-size:0.9rem;">
                        <span>${i.quantity}x ${i.name}</span>
                        <span>₹${(i.quantity * i.price).toFixed(2)}</span>
                    </div>`;
                });

                return `
                    <div class="card text-center" style="max-width: 400px; margin: 0 auto;">
                        <div style="color:var(--secondary); font-size: 3rem; margin-bottom:16px;"><i class="ph-fill ph-check-circle"></i></div>
                        <h2>Payment Successful</h2>
                        <p class="text-muted mb-4">Please show this QR code at the exit gate.</p>
                        
                        <div style="background: white; padding: 24px; border-radius: var(--radius-md); border:1px solid #eee; margin-bottom:24px;">
                            <div id="exit-qr" style="display:flex; justify-content:center; margin-bottom:16px;"></div>
                            <p style="font-family:monospace; font-weight:bold; letter-spacing:1px; font-size:1.1rem;">${tx.id}</p>
                        </div>
                        
                        <div style="text-align:left; background: #F8FAFC; padding:16px; border-radius: var(--radius-sm);">
                            <h4 class="mb-4">Receipt Details</h4>
                            ${itemsHtml}
                            <div style="display:flex; justify-content:space-between; font-weight:bold; margin-top:16px; font-size:1.1rem;">
                                <span>Paid via ${tx.paymentMethod}</span>
                                <span>₹${tx.total.toFixed(2)}</span>
                            </div>
                        </div>
                        
                        <button class="button mt-4" style="width:100%;" onclick="app.navigate('scan')">Start New Shopping Trip</button>
                    </div>
                `;
            },
            init: (params) => {
                if (!params || !params.txn) return;

                setTimeout(() => {
                    // Generate QR encoding the txn ID
                    new QRCode(document.getElementById('exit-qr'), {
                        text: params.txn.id,
                        width: 200,
                        height: 200,
                        colorDark: "#4F46E5",
                        colorLight: "#ffffff",
                        correctLevel: QRCode.CorrectLevel.H
                    });
                }, 100); // small delay to ensure DOM is ready
            }
        },
        'verify': {
            title: 'Verify Customer Exit',
            html: `
                <div class="grid-2">
                    <div class="card text-center">
                        <h3 class="mb-4">Scan Exit Pass</h3>
                        <div id="verify-reader-container" style="width: 100%; max-width: 400px; margin: 20px auto; overflow: hidden; border-radius: var(--radius-md);">
                            <div id="verify-reader" style="width: 100%;"></div>
                        </div>
                        
                        <h4 class="mb-4 mt-4">Or Enter Receipt ID Manually</h4>
                        <form id="manual-verify-form" style="display: flex; gap: 12px; justify-content: center;">
                            <input type="text" id="manual-receipt-id" placeholder="e.g. TXN-123" required style="padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); font-family: inherit;">
                            <button type="submit" class="button"><i class="ph ph-check"></i> Verify</button>
                        </form>
                    </div>
                    <div class="card" id="verify-result-card" style="display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:300px;">
                        <div class="text-center" id="verify-prompt">
                            <i class="ph ph-qr-code" style="font-size: 4rem; color: var(--text-muted); margin-bottom: 16px;"></i>
                            <h3 class="text-muted">Awaiting Scan...</h3>
                        </div>
                    </div>
                </div>
            `,
            init: () => {
                const showResult = (tx) => {
                    const resultCard = document.getElementById('verify-result-card');
                    if (!tx) {
                        resultCard.innerHTML = `
                            <div class="text-center" style="color:var(--accent);">
                                <i class="ph-fill ph-x-circle" style="font-size: 4rem; margin-bottom: 16px;"></i>
                                <h2>Invalid Receipt</h2>
                                <p>This transaction ID does not exist in the system.</p>
                            </div>
                        `;
                        return;
                    }

                    if (tx.status === 'EXITED') {
                        resultCard.innerHTML = `
                            <div class="text-center" style="color:var(--accent);">
                                <i class="ph-fill ph-warning-circle" style="font-size: 4rem; margin-bottom: 16px;"></i>
                                <h2>Already Scanned!</h2>
                                <p>Transaction <b>${tx.id}</b> has already exited.</p>
                            </div>
                        `;
                        return;
                    }

                    // Valid and Paid
                    let itemsHtml = '';
                    tx.items.forEach(i => {
                        itemsHtml += `<div style="display:flex; justify-content:space-between; margin-bottom:4px;"><span class="text-muted">${i.quantity}x ${i.name}</span></div>`;
                    });

                    resultCard.innerHTML = `
                        <div style="width:100%;">
                            <div class="text-center" style="color:var(--secondary); margin-bottom:24px;">
                                <i class="ph-fill ph-check-circle" style="font-size: 4rem; margin-bottom: 16px;"></i>
                                <h2>Valid Receipt</h2>
                                <span class="badge" style="position:static; display:inline-block; transform:none; padding:4px 12px; font-size:1rem;">${tx.status}</span>
                            </div>
                            
                            <div style="background: #F8FAFC; padding:16px; border-radius: var(--radius-sm); margin-bottom:24px;">
                                <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-weight:bold;"><span>ID: ${tx.id}</span> <span>Total: ₹${tx.total.toFixed(2)}</span></div>
                                ${itemsHtml}
                            </div>
                            
                            <button class="button success" style="width:100%; padding:16px; font-size:1.1rem;" onclick="app.views['verify'].markExited('${tx.id}')">
                                <i class="ph-fill ph-door-open"></i> Allow Exit
                            </button>
                        </div>
                    `;
                };

                const verifyTxn = (id) => {
                    const tx = db.getTransactionById(id);
                    showResult(tx);
                };

                app.views['verify'].markExited = (id) => {
                    db.markTransactionExited(id);
                    app.showToast('Customer exit approved!', 'success');
                    // Refresh view
                    verifyTxn(id);
                };

                // Manual Add
                document.getElementById('manual-verify-form').addEventListener('submit', (e) => {
                    e.preventDefault();
                    const id = document.getElementById('manual-receipt-id').value.trim().toUpperCase();
                    verifyTxn(id);
                    e.target.reset();
                });

                // Camera Scan Setup
                try {
                    app.verifyScanner = new Html5QrcodeScanner("verify-reader", { fps: 10, qrbox: 250 });
                    app.verifyScanner.render((decodedText) => {
                        verifyTxn(decodedText);
                        app.verifyScanner.pause(true);
                        setTimeout(() => app.verifyScanner.resume(), 3000);
                    }, () => { });
                } catch (e) {
                    console.error("QR scanner init failed", e);
                }
            }
        }
    }
};

window.onload = () => app.init();
