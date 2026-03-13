// Define the mock database
const initData = {
    products: [
        { id: 'P001', name: 'Organic Milk 1L', price: 65.00, stock: 50 },
        { id: 'P002', name: 'Whole Wheat Bread', price: 45.00, stock: 30 },
        { id: 'P003', name: 'Farm Fresh Eggs (12)', price: 90.00, stock: 40 },
        { id: 'P004', name: 'Basmati Rice 5kg', price: 650.00, stock: 15 },
        { id: 'P005', name: 'Avocado', price: 120.00, stock: 25 },
    ],
    cart: [], // Customer cart state
    transactions: [], // Completed orders
    currentRole: 'admin' // Roles: 'admin', 'customer', 'staff'
};

// Data service
const db = {
    load() {
        const data = localStorage.getItem('easycheckout_db');
        if (data) {
            return JSON.parse(data);
        }
        this.save(initData);
        return initData;
    },
    save(data) {
        localStorage.setItem('easycheckout_db', JSON.stringify(data));
    },
    getProducts() {
        return this.load().products;
    },
    addProduct(product) {
        const data = this.load();
        data.products.push(product);
        this.save(data);
    },
    getProductById(id) {
        return this.load().products.find(p => p.id === id);
    },
    deleteProduct(id) {
        const data = this.load();
        data.products = data.products.filter(p => p.id !== id);
        this.save(data);
    },

    // Cart operations
    getCart() {
        return this.load().cart;
    },
    addToCart(productId) {
        const data = this.load();
        const product = data.products.find(p => p.id === productId);
        if (!product) return false;

        const existingItem = data.cart.find(item => item.id === productId);
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            data.cart.push({ ...product, quantity: 1 });
        }
        this.save(data);
        return true;
    },
    removeFromCart(productId) {
        const data = this.load();
        data.cart = data.cart.filter(item => item.id !== productId);
        this.save(data);
    },
    updateCartQuantity(productId, quantity) {
        const data = this.load();
        const item = data.cart.find(i => i.id === productId);
        if (item) {
            item.quantity = quantity;
            if (quantity <= 0) {
                data.cart = data.cart.filter(i => i.id !== productId);
            }
        }
        this.save(data);
    },
    clearCart() {
        const data = this.load();
        data.cart = [];
        this.save(data);
    },

    // Transactions
    createTransaction(paymentMethod) {
        const data = this.load();
        if (data.cart.length === 0) return null;

        const total = data.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        const transaction = {
            id: 'TXN-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
            items: [...data.cart],
            total: total,
            paymentMethod,
            timestamp: new Date().toISOString(),
            status: 'PAID', // PAID, EXITED
        };

        data.transactions.push(transaction);
        data.cart = []; // clear cart after checkout
        this.save(data);
        return transaction;
    },
    getTransactions() {
        return this.load().transactions;
    },
    getTransactionById(id) {
        return this.load().transactions.find(t => t.id === id);
    },
    markTransactionExited(id) {
        const data = this.load();
        const tx = data.transactions.find(t => t.id === id);
        if (tx) {
            tx.status = 'EXITED';
            this.save(data);
            return true;
        }
        return false;
    },

    // Role management
    getRole() {
        return this.load().currentRole;
    },
    setRole(role) {
        const data = this.load();
        data.currentRole = role;
        this.save(data);
    }
};

// Initialize DB safely
db.load();
