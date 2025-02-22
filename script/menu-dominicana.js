// Get DOM elements
const cartList = document.getElementById('carrito-lista');
const totalElement = document.getElementById('total');
const clearCartButton = document.getElementById('vaciar-carrito');
const cartContainer = document.getElementById('carrito');
const addButtons = document.querySelectorAll('.plato--info button');
const cartIcon = document.querySelector('.carrito-icono');

// Cart state
let cart = [];
let isCartVisible = false;

// Toggle cart visibility
function toggleCart(forceShow = false) {
    if (forceShow) {
        isCartVisible = true;
    } else {
        isCartVisible = !isCartVisible;
    }
    cartContainer.style.display = isCartVisible ? 'block' : 'none';
}

// Add item to cart
function addToCart(e) {
    e.stopPropagation();
    const button = e.target;
    const plate = button.closest('.plato');
    const plateName = plate.querySelector('h1').textContent;
    const platePrice = parseFloat(plate.querySelector('.plato--info p').textContent.replace('$', ''));

    const existingItem = cart.find(item => item.name === plateName);
    
    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({
            name: plateName,
            price: platePrice,
            quantity: 1
        });
    }
    
    updateCart();
    showCartNotification('¡Producto agregado!');
    toggleCart(true);
}

// Update cart display
function updateCart() {
    cartList.innerHTML = '';
    
    cart.forEach(item => {
        const li = document.createElement('li');
        li.className = 'cart-item';
        li.innerHTML = `
            <div class="cart-item-name">${item.name} x${item.quantity}</div>
            <div class="cart-item-details">
                <span class="cart-item-price">$${(item.price * item.quantity).toFixed(2)}</span>
                <div class="cart-item-controls">
                    <button class="quantity-btn minus">-</button>
                    <button class="quantity-btn plus">+</button>
                    <button class="remove-btn">×</button>
                </div>
            </div>
        `;
        
        const minusBtn = li.querySelector('.minus');
        const plusBtn = li.querySelector('.plus');
        const removeBtn = li.querySelector('.remove-btn');
        
        minusBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            updateQuantity(item, -1);
        });
        
        plusBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            updateQuantity(item, 1);
        });
        
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeItem(item);
        });
        
        cartList.appendChild(li);
    });
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    totalElement.textContent = `Total: $${total.toFixed(2)}`;
    
    // Obtener el contenedor de PayPal
    const paypalContainer = document.getElementById('paypal-button-container');
    
    if (cart.length === 0) {
        cartList.innerHTML = '<li class="empty-cart">El carrito está vacío</li>';
        if (paypalContainer) {
            paypalContainer.style.display = 'none';
        }
    } else {
        if (paypalContainer) {
            paypalContainer.style.display = 'block';
            // Si el botón aún no está inicializado, inicializarlo
            if (!paypalContainer.hasChildNodes()) {
                initializePayPalButton();
            }
        }
    }
}

// Update item quantity
function updateQuantity(item, change) {
    item.quantity += change;
    if (item.quantity <= 0) {
        removeItem(item);
    } else {
        updateCart();
    }
}

// Remove item from cart
function removeItem(item) {
    cart = cart.filter(cartItem => cartItem !== item);
    updateCart();
}

// Clear entire cart
function clearCart(e) {
    if (e) e.stopPropagation();
    cart = [];
    updateCart();
}

// Show notification when item is added
function showCartNotification(message, isSuccess = false) {
    const notification = document.createElement('div');
    notification.className = `cart-notification ${isSuccess ? 'success' : ''}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 2000);
}

// Load PayPal SDK
function loadPayPalScript() {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = "https://www.paypal.com/sdk/js?client-id=AZ7QZ7i8pNOt2GTKDH2PQMjn5hMS-OeZxR6Ucd8ldPuhyvRbOUr6sAztO9-4LSr1T81wKLeO-m0R8Ria&currency=USD";
        script.async = true;
        
        script.onload = () => {
            console.log('PayPal SDK loaded successfully');
            resolve();
        };
        script.onerror = (error) => {
            console.error('Failed to load PayPal SDK:', error);
            reject(new Error('Failed to load PayPal SDK'));
        };
        
        document.body.appendChild(script);
    });
}

// Initialize PayPal button
function initializePayPalButton() {
    if (!window.paypal) {
        console.error('PayPal SDK not loaded');
        return;
    }

    const paypalContainer = document.getElementById('paypal-button-container');
    if (!paypalContainer) {
        console.error('PayPal container not found');
        return;
    }

    // Limpiar el contenedor antes de renderizar
    paypalContainer.innerHTML = '';

    paypal.Buttons({
        style: {
            layout: 'vertical',
            color: 'gold',
            shape: 'rect',
            label: 'pay'
        },

        createOrder: function(data, actions) {
            const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            
            const orderData = {
                purchase_units: [{
                    amount: {
                        currency_code: "USD",
                        value: total.toFixed(2),
                        breakdown: {
                            item_total: {
                                currency_code: "USD",
                                value: total.toFixed(2)
                            }
                        }
                    },
                    items: cart.map(item => ({
                        name: item.name,
                        unit_amount: {
                            currency_code: "USD",
                            value: item.price.toFixed(2)
                        },
                        quantity: item.quantity.toString()
                    }))
                }]
            };

            console.log('Creating PayPal order with data:', orderData);
            return actions.order.create(orderData);
        },

        onApprove: function(data, actions) {
            console.log('Payment approved:', data);
            return actions.order.capture()
                .then(function(details) {
                    console.log('Payment completed successfully:', details);
                    handleSuccessfulPayment(details);
                })
                .catch(function(error) {
                    console.error('Error capturing order:', error);
                    showCartNotification('Error al procesar el pago. Por favor, intente nuevamente.');
                });
        },

        onCancel: function(data) {
            console.log('Payment cancelled:', data);
            showCartNotification('El pago fue cancelado.');
        },

        onError: function(err) {
            console.error('PayPal Error:', err);
            showCartNotification('Error al procesar el pago. Por favor, intente nuevamente.');
        }
    }).render('#paypal-button-container')
    .catch(function(error) {
        console.error('Error rendering PayPal buttons:', error);
        showCartNotification('Error al cargar PayPal. Por favor, recargue la página.');
    });
}

// Handle successful payment
function handleSuccessfulPayment(details) {
    console.log('Processing successful payment:', details);
    
    const orderData = {
        paypalOrderId: details.id,
        cartItems: cart,
        total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        status: details.status
    };
    
    showCartNotification('¡Pago procesado con éxito! Gracias por su compra.', true);
    
    clearCart();
    setTimeout(() => {
        toggleCart();
    }, 3000);
}

// Initialize cart functionality
async function initializeCart() {
    cartContainer.style.display = 'none';
    
    // Agregar PayPal container al carrito si no existe
    let paypalContainer = document.getElementById('paypal-button-container');
    if (!paypalContainer) {
        paypalContainer = document.createElement('div');
        paypalContainer.id = 'paypal-button-container';
        paypalContainer.style.display = 'none';
        cartContainer.appendChild(paypalContainer);
    }
    
    // Event listeners
    addButtons.forEach(button => {
        button.addEventListener('click', addToCart);
    });
    
    clearCartButton.addEventListener('click', clearCart);
    
    cartIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleCart();
    });
    
    cartContainer.addEventListener('click', (e) => {
        e.stopPropagation();
    });
    
    document.addEventListener('click', () => {
        if (isCartVisible) {
            toggleCart();
        }
    });

    try {
        // Cargar el script de PayPal
        await loadPayPalScript();
        // Inicializar el botón de PayPal si hay items en el carrito
        if (cart.length > 0) {
            initializePayPalButton();
        }
    } catch (error) {
        console.error('Error loading PayPal:', error);
        showCartNotification('Error al cargar PayPal. Por favor, recargue la página.');
    }
}

// Add all necessary styles
const styles = `
    .carrito {
        position: fixed;
        top: 80px;
        right: 20px;
        width: 350px;
        background: linear-gradient(rgba(15, 23, 43, .9), rgba(15, 23, 43, .9));
        border: 2px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        z-index: 1000;
        max-height: 80vh;
        overflow-y: auto;
        color: white;
    }
    
    .carrito h2 {
        margin: 0 0 15px 0;
        color: white;
        font-size: 1.5em;
        border-bottom: 2px solid rgba(255, 255, 255, 0.1);
        padding-bottom: 10px;
    }
    
    .cart-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        margin-bottom: 8px;
        color: white;
    }
    
    .cart-item-name {
        flex: 1;
        font-weight: 500;
        margin-right: 10px;
    }
    
    .cart-item-details {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .cart-item-price {
        color: white;
        font-weight: bold;
        min-width: 80px;
        text-align: right;
    }
    
    .cart-item-controls {
        display: flex;
        gap: 5px;
    }
    
    .quantity-btn {
        padding: 4px 10px;
        border: 1px solid white;
        background: transparent;
        color: white;
        cursor: pointer;
        border-radius: 4px;
        font-weight: bold;
        transition: all 0.3s ease;
    }
    
    .quantity-btn:hover {
        background: white;
        color: rgba(15, 23, 43, 1);
    }
    
    .remove-btn {
        padding: 4px 10px;
        border: 1px solid #ff4444;
        background: transparent;
        color: #ff4444;
        cursor: pointer;
        border-radius: 4px;
        font-weight: bold;
        transition: all 0.3s ease;
    }
    
    .remove-btn:hover {
        background: #ff4444;
        color: white;
    }
    
    .empty-cart {
        text-align: center;
        padding: 20px;
        color: rgba(255, 255, 255, 0.7);
        font-style: italic;
    }
    
    #total {
        margin-top: 15px;
        padding-top: 15px;
        border-top: 2px solid rgba(255, 255, 255, 0.1);
        font-weight: bold;
        color: white;
        font-size: 1.2em;
        text-align: right;
    }
    
    #vaciar-carrito {
        width: 100%;
        padding: 12px;
        margin-top: 15px;
        background: white;
        color: black;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-weight: bold;
        transition: background 0.3s ease;
    }
    
    #vaciar-carrito:hover {
        background: #f0f0f0;
    }
    
    #paypal-button-container {
        margin-top: 15px;
        width: 100%;
    }

    .carrito-icono {
        position: fixed;
        top: 20px;
        right: 20px;
        background: #FFA500;
        color: white;
        padding: 10px;
        border-radius: 50%;
        cursor: pointer;
        z-index: 999;
        transition: background 0.3s ease;
    }

    .carrito-icono:hover {
        background: #FF8C00;
    }

    .cart-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(15, 23, 43, .9);
        color: white;
        padding: 12px 25px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        animation: fadeInOut 2s ease-in-out;
        z-index: 1001;
    }

    .cart-notification.success {
        background: #4CAF50;
    }

    @keyframes fadeInOut {
        0% { opacity: 0; transform: translateY(-20px); }
        15% { opacity: 1; transform: translateY(0); }
        85% { opacity: 1; transform: translateY(0); }
        100% { opacity: 0; transform: translateY(-20px); }
    }
`;

// Add styles to document
const styleSheet = document.createElement('style');
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);

// Initialize cart when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeCart);