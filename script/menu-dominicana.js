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

// Coordenadas aproximadas del centro de Santo Domingo (Latitud, Longitud)
const SANTO_DOMINGO_CENTER = { lat: 18.4861, lng: -69.9312 }; // Centro de Santo Domingo
const MAX_DISTANCE_KM = 50; // Radio máximo en kilómetros desde el centro de Santo Domingo

// Toggle cart visibility
function toggleCart(forceShow = false) {
    if (forceShow) {
        isCartVisible = true;
    } else {
        isCartVisible = !isCartVisible;
    }
    cartContainer.style.display = isCartVisible ? 'block' : 'none';
}

// Calcular distancia entre dos puntos en kilómetros (fórmula de Haversine)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radio de la Tierra en kilómetros
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distancia en kilómetros
}

// Verificar si el usuario está en Santo Domingo
function checkLocation(callback) {
    if (!navigator.geolocation) {
        showCartNotification('Geolocalización no soportada por tu navegador.');
        callback(false);
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;
            const distance = calculateDistance(
                userLat, userLng,
                SANTO_DOMINGO_CENTER.lat, SANTO_DOMINGO_CENTER.lng
            );
            const isInSantoDomingo = distance <= MAX_DISTANCE_KM;
            callback(isInSantoDomingo);
        },
        (error) => {
            console.error('Error al obtener la ubicación:', error);
            showCartNotification('No se pudo verificar tu ubicación. Permite el acceso para continuar.');
            callback(false);
        },
        { timeout: 10000, maximumAge: 0 } // Sin caché para ubicación fresca
    );
}

// Add item to cart
function addToCart(e) {
    e.stopPropagation();
    const button = e.target;
    const plate = button.closest('.plato');
    const plateName = plate.querySelector('h1').textContent;
    const platePriceText = plate.querySelector('.plato--info p').textContent.replace('$', '');
    const platePrice = parseFloat(platePriceText);

    if (isNaN(platePrice)) {
        console.error(`Precio inválido para ${plateName}: ${platePriceText}`);
        showCartNotification('Error al agregar el producto. Contacta al soporte.');
        return;
    }

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
    showCartNotification('¡Producto agregado al carrito!', true);
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
    
    const paypalContainer = document.getElementById('paypal-button-container');
    if (cart.length === 0) {
        cartList.innerHTML = '<li class="empty-cart">El carrito está vacío</li>';
        if (paypalContainer) paypalContainer.style.display = 'none';
    } else {
        if (paypalContainer) {
            paypalContainer.style.display = 'block';
            if (!paypalContainer.hasChildNodes() && window.paypal) {
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

// Show notification with stacking behavior
let notificationCount = 0;
function showCartNotification(message, isSuccess = false) {
    const notification = document.createElement('div');
    notification.className = `cart-notification ${isSuccess ? 'success' : ''}`;
    notification.textContent = message;
    notification.style.top = `${20 + (notificationCount * 60)}px`; // Apila notificaciones
    document.body.appendChild(notification);
    
    notificationCount++;
    
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            notification.remove();
            notificationCount = Math.max(0, notificationCount - 1);
            const remainingNotifications = document.querySelectorAll('.cart-notification');
            remainingNotifications.forEach((notif, index) => {
                notif.style.top = `${20 + (index * 60)}px`;
            });
        }, 300);
    }, 2000);
}

// Load PayPal SDK with improved error handling
function loadPayPalScript() {
    return new Promise((resolve, reject) => {
        if (window.paypal) {
            console.log('PayPal SDK ya está cargado');
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = "https://www.paypal.com/sdk/js?client-id=AZ7QZ7i8pNOt2GTKDH2PQMjn5hMS-OeZxR6Ucd8ldPuhyvRbOUr6sAztO9-4LSr1T81wKLeO-m0R8Ria&currency=USD"; // Corregido "¤cy" a "&currency"
        script.async = true;
        
        script.onload = () => {
            console.log('PayPal SDK cargado con éxito');
            resolve();
        };
        script.onerror = () => {
            console.error('Error al cargar el PayPal SDK');
            showCartNotification('No se pudo cargar PayPal. Verifica tu conexión o recarga la página.');
            reject(new Error('Failed to load PayPal SDK'));
        };
        
        document.body.appendChild(script);
    });
}

// Initialize PayPal button with geolocation check
function initializePayPalButton() {
    if (!window.paypal) {
        console.error('PayPal SDK no está disponible');
        showCartNotification('PayPal no está cargado. Recarga la página.');
        return;
    }

    const paypalContainer = document.getElementById('paypal-button-container');
    if (!paypalContainer) {
        console.error('Contenedor de PayPal no encontrado');
        showCartNotification('Error interno: contenedor de PayPal no encontrado.');
        return;
    }

    paypalContainer.innerHTML = ''; // Limpiar antes de renderizar

    paypal.Buttons({
        style: {
            layout: 'vertical',
            color: 'gold',
            shape: 'rect',
            label: 'pay'
        },

        createOrder: function(data, actions) {
            return new Promise((resolve, reject) => {
                checkLocation((isInSantoDomingo) => {
                    if (!isInSantoDomingo) {
                        showCartNotification('Solo aceptamos pedidos desde Santo Domingo.');
                        reject(new Error('Ubicación no válida'));
                        return;
                    }

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
                    resolve(actions.order.create(orderData));
                });
            });
        },

        onApprove: function(data, actions) {
            return actions.order.capture()
                .then(details => handleSuccessfulPayment(details))
                .catch(error => {
                    console.error('Error al capturar el pedido:', error);
                    showCartNotification('Error al procesar el pago. Intenta de nuevo.');
                });
        },

        onCancel: function(data) {
            showCartNotification('El pago fue cancelado.');
        },

        onError: function(err) {
            console.error('Error de PayPal:', err);
            showCartNotification('Error al procesar el pago.');
        }
    }).render('#paypal-button-container')
    .catch(error => {
        console.error('Error al renderizar botones de PayPal:', error);
        showCartNotification('Error al inicializar PayPal. Recarga la página.');
    });
}

// Handle successful payment
function handleSuccessfulPayment(details) {
    const orderData = {
        paypalOrderId: details.id,
        cartItems: [...cart],
        total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        status: details.status
    };
    
    showCartNotification('¡Pago procesado con éxito! Gracias por tu compra.', true);
    clearCart();
    setTimeout(() => toggleCart(), 3000);

    console.log('Datos del pedido completado:', orderData);
}

// Initialize cart functionality
async function initializeCart() {
    cartContainer.style.display = 'none';
    
    let paypalContainer = document.getElementById('paypal-button-container');
    if (!paypalContainer) {
        paypalContainer = document.createElement('div');
        paypalContainer.id = 'paypal-button-container';
        paypalContainer.style.display = 'none';
        cartContainer.appendChild(paypalContainer);
    }
    
    addButtons.forEach(button => button.addEventListener('click', addToCart));
    clearCartButton.addEventListener('click', clearCart);
    cartIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleCart();
    });
    
    cartContainer.addEventListener('click', (e) => e.stopPropagation());
    document.addEventListener('click', () => {
        if (isCartVisible) toggleCart();
    });

    try {
        await loadPayPalScript();
        if (cart.length > 0 && window.paypal) {
            initializePayPalButton();
        }
    } catch (error) {
        console.error('Error al inicializar PayPal:', error);
        showCartNotification('No se pudo cargar PayPal. Verifica tu conexión o recarga.');
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
        right: 20px;
        background: rgba(15, 23, 43, .9);
        color: white;
        padding: 12px 25px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        z-index: 1001;
        transition: opacity 0.3s ease;
        opacity: 1;
    }

    .cart-notification.success {
        background: #4CAF50;
    }
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);

// Initialize cart when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeCart);