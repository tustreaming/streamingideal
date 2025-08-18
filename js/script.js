document.addEventListener('DOMContentLoaded', () => {
    let dollarRate = 0;
    let products = [];
    const whatsappNumber = '584129386149';
    let cart = [];
    let selectedPaymentMethod = '';
    let selectedGiftcardOption = null;

    let currentSlide = 0;
    const tmdbApiKey = '65aa5b7946592f4674d9d2115569d584';

    const searchInput = document.getElementById('search-input');
    const searchSuggestionsList = document.getElementById('search-suggestions');

    // Función para obtener la tasa del dólar.
    const fetchDollarRate = async () => {
        try {
            const tasaUrl = `https://open.er-api.com/v6/latest/USD`;
            const response = await fetch(tasaUrl);
            if (!response.ok) {
                throw new Error(`Error al cargar la tasa: ${response.status}`);
            }
            const data = await response.json();
            if (data && data.rates && data.rates.VES) {
                dollarRate = parseFloat(data.rates.VES);
                if (!isNaN(dollarRate)) {
                    document.getElementById('dollar-rate-display').innerText = dollarRate.toFixed(2);
                    updatePrices();
                } else {
                    console.error('El valor de la tasa no es un número válido.');
                    document.getElementById('dollar-rate-display').innerText = 'Error al cargar';
                }
            } else {
                console.error('No se encontró el valor de la tasa en la respuesta de la API.');
                document.getElementById('dollar-rate-display').innerText = 'No disponible';
            }
        } catch (error) {
            console.error('Error al obtener la tasa del dólar:', error);
            document.getElementById('dollar-rate-display').innerText = 'Error de conexión';
        }
    };

    // FUNCIÓN CORREGIDA: Ahora maneja errores de archivos individuales.
    const fetchProducts = async () => {
        try {
            const response = await fetch('data/product-list.json');
            if (!response.ok) {
                throw new Error('Error al cargar la lista de productos.');
            }
            const productFiles = await response.json();
            
            const productPromises = productFiles.map(async (fileName) => {
                try {
                    const productResponse = await fetch(`data/products/${fileName}`);
                    if (!productResponse.ok) {
                        throw new Error(`Error al cargar el producto: ${fileName}`);
                    }
                    return await productResponse.json();
                } catch (error) {
                    // Si un archivo de producto falla, lo registramos pero continuamos con los demás.
                    console.error(error.message);
                    return null; // Devolvemos null para que el Promise.all no se detenga.
                }
            });

            // Filtramos los resultados nulos para evitar errores.
            const fetchedProducts = await Promise.all(productPromises);
            products = fetchedProducts.filter(p => p !== null);

            if (products.length === 0) {
                document.getElementById('product-container').innerHTML = '<p style="text-align:center;">No se pudo cargar ningún producto. Por favor, revise los archivos.</p>';
            } else {
                renderProducts();
            }
            
            fetchDollarRate();
        } catch (error) {
            console.error('No se pudo cargar la lista de productos:', error);
            document.getElementById('product-container').innerHTML = '<p style="text-align:center;">Error al cargar los productos. Por favor, inténtelo de nuevo más tarde.</p>';
        }
    };

    const renderProducts = () => {
        const productContainer = document.getElementById('product-container');
        productContainer.innerHTML = '';
        products.forEach(product => {
            const productDiv = document.createElement('div');
            productDiv.classList.add('product');
            if (product.stock === false) {
                productDiv.classList.add('out-of-stock');
            }
            productDiv.setAttribute('data-product-name', product.name);

            let priceToDisplay = '';
            let bsPrice = '0.00';
            let productDescription = product.description;

            if (product.productType === 'giftcard') {
                const minPriceOption = product.pricingOptions.find(option => option.realPrice > 0);
                if (minPriceOption) {
                    priceToDisplay = `Desde $${minPriceOption.realPrice.toFixed(2)}`;
                    bsPrice = (minPriceOption.realPrice * dollarRate).toFixed(2);
                    productDescription = minPriceOption.productDescription;
                } else {
                    priceToDisplay = 'No disponible';
                }
            } else {
                priceToDisplay = `$${product.usdPrice}`;
                bsPrice = (product.usdPrice * dollarRate).toFixed(2);
            }
            
            const buttonText = product.productType === 'giftcard' ? 'Detalles' : 'Sugerencias';
            const buttonAction = product.productType === 'giftcard' ? `window.showProductDetailsModal(${product.id})` : `window.showSuggestionsModal('${product.name}')`;
            const suggestionsButtonDisabled = product.productType === 'streaming' && (!product.suggestions || product.suggestions.length === 0);

            productDiv.innerHTML = `
                <img src="${product.imgUrl}" alt="${product.name}">
                <h3>${product.name}</h3>
                <p>${productDescription}</p>
                <p class="price" data-usd-price="${product.usdPrice}">${product.stock ? priceToDisplay : 'SIN STOCK'}</p>
                <p class="price-bs">Bs <span id="price-bs-${product.id}">${bsPrice}</span></p>
                <div class="product-buttons">
                    <button class="add-to-cart-button" onclick="window.handleAddToCart(${product.id})" ${product.stock ? '' : 'disabled'}>Añadir al carrito</button>
                    <button class="view-details-button" onclick="${buttonAction}" ${product.stock && !suggestionsButtonDisabled ? '' : 'disabled'}>${buttonText}</button>
                </div>
            `;
            productContainer.appendChild(productDiv);
        });
    };

    const updatePrices = () => {
        products.forEach(product => {
            const bsPriceElement = document.getElementById(`price-bs-${product.id}`);
            if (bsPriceElement) {
                if (product.productType === 'giftcard') {
                    const minPrice = product.pricingOptions.length > 0 ? product.pricingOptions[0].realPrice : 0;
                    const minBsPrice = (minPrice * dollarRate).toFixed(2);
                    bsPriceElement.innerText = minBsPrice;
                } else {
                    bsPriceElement.innerText = (product.usdPrice * dollarRate).toFixed(2);
                }
            }
        });
        updateCartUI();
    };

    const filterProducts = (event) => {
        const searchTerm = searchInput.value.toLowerCase();
        const productElements = document.querySelectorAll('.product');
        const exchangeRateInfo = document.querySelector('.exchange-rate-info');

        if (searchTerm.length > 0) {
            exchangeRateInfo.style.display = 'none';
        } else {
            exchangeRateInfo.style.display = 'block';
        }

        productElements.forEach(productEl => {
            const productName = productEl.getAttribute('data-product-name').toLowerCase();
            if (productName.includes(searchTerm)) {
                productEl.style.display = 'flex';
            } else {
                productEl.style.display = 'none';
            }
        });
    };
    
    window.handleAddToCart = (productId) => {
        const product = products.find(p => p.id === productId);
        if (product && product.productType === 'giftcard') {
            window.showPricingModal(product);
        } else {
            window.addToCart(productId);
        }
    };

    window.addToCart = (productId, price = null, description = null) => {
        const product = products.find(p => p.id === productId);
        if (product && product.stock) {
            const existingItem = cart.find(item => item.id === productId && (item.description === description || !description));
            if (existingItem) {
                existingItem.quantity++;
            } else {
                const newItem = { 
                    ...product, 
                    quantity: 1, 
                    usdPrice: price || product.usdPrice,
                    description: description || product.description
                };
                cart.push(newItem);
            }
            saveCartToStorage();
            updateCartUI();
            showNotification(`${product.name} ha sido añadido al carrito.`);
            launchConfetti();
        } else if (product && !product.stock) {
            showNotification(`${product.name} no está disponible actualmente.`);
        }
    };

    window.updateCartItemQuantity = (productId, change) => {
        const item = cart.find(p => p.id === productId);
        if (item) {
            item.quantity += change;
            if (item.quantity <= 0) {
                cart = cart.filter(p => p.id !== productId);
            }
            saveCartToStorage();
            updateCartUI();
        }
    };

    window.clearCart = () => {
        cart = [];
        selectedPaymentMethod = '';
        saveCartToStorage();
        updateCartUI();
        showNotification('El carrito ha sido vaciado.');
    };

    const updateCartUI = () => {
        const cartItemsList = document.getElementById('cart-items');
        const whatsappButton = document.getElementById('whatsapp-button');
        const clearCartButton = document.getElementById('clear-cart-button');
        const selectPaymentButton = document.getElementById('select-payment-button');

        cartItemsList.innerHTML = '';
        let totalUSD = 0;
        let totalItems = 0;

        if (cart.length === 0) {
            cartItemsList.innerHTML = '<li>El carrito está vacío.</li>';
            whatsappButton.classList.add('disabled');
            clearCartButton.disabled = true;
            selectPaymentButton.disabled = true;
        } else {
            whatsappButton.classList.remove('disabled');
            clearCartButton.disabled = false;
            selectPaymentButton.disabled = false;
            cart.forEach(item => {
                const subtotalUSD = item.usdPrice * item.quantity;
                const subtotalBS = (subtotalUSD * dollarRate).toFixed(2);
                const li = document.createElement('li');
                li.innerHTML = `
                    <div class="cart-item-info">
                        <span>${item.name} (${item.quantity})</span>
                        <span class="item-price">$${subtotalUSD.toFixed(2)} (Bs ${subtotalBS})</span>
                    </div>
                    <div class="quantity-control">
                        <button onclick="window.updateCartItemQuantity(${item.id}, -1)">-</button>
                        <span>${item.quantity}</span>
                        <button onclick="window.updateCartItemQuantity(${item.id}, 1)">+</button>
                    </div>
                `;
                cartItemsList.appendChild(li);
                totalUSD += subtotalUSD;
                totalItems += item.quantity;
            });
        }
        const totalBS = (totalUSD * dollarRate).toFixed(2);
        document.getElementById('cart-total-usd').innerText = totalUSD.toFixed(2);
        document.getElementById('cart-total-bs').innerText = totalBS;
        document.getElementById('cart-count').innerText = totalItems;
        prepareWhatsappLink();
    };

    const saveCartToStorage = () => {
        sessionStorage.setItem('shoppingCart', JSON.stringify(cart));
    };

    const loadCartFromStorage = () => {
        const storedCart = sessionStorage.getItem('shoppingCart');
        if (storedCart) {
            cart = JSON.parse(storedCart);
            updateCartUI();
        }
    };

    window.showCart = () => {
        document.getElementById('cart-modal').style.display = 'block';
    };

    window.closeCart = () => {
        document.getElementById('cart-modal').style.display = 'none';
    };

    const prepareWhatsappLink = () => {
        const whatsappButton = document.getElementById('whatsapp-button');
        if (cart.length > 0 && selectedPaymentMethod) {
            const message = generateWhatsappMessage();
            const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
            whatsappButton.href = url;
            whatsappButton.classList.remove('disabled');
        } else {
            whatsappButton.href = '#';
            whatsappButton.classList.add('disabled');
        }
    };

    const generateWhatsappMessage = () => {
        let message = '¡Hola! Me gustaría hacer un pedido.\n\n';
        let totalUSD = 0;
        message += 'Productos:\n';
        cart.forEach(item => {
            const subtotalUSD = item.usdPrice * item.quantity;
            const subtotalBS = (subtotalUSD * dollarRate).toFixed(2);
            message += `- ${item.name} (${item.quantity}) - $${subtotalUSD.toFixed(2)} / Bs ${subtotalBS}\n`;
            totalUSD += subtotalUSD;
        });
        const totalBS = (totalUSD * dollarRate).toFixed(2);
        message += `\nTotal: $${totalUSD.toFixed(2)} (Bs ${totalBS})`;
        message += `\n\nMétodo de pago: ${selectedPaymentMethod}`;
        message += `\n\nPor favor, indícame los pasos para completar la compra.`;
        return message;
    };

    window.selectPaymentMethod = (card) => {
        const allCards = document.querySelectorAll('.payment-method-card');
        allCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedPaymentMethod = card.getAttribute('data-method');
        window.closePaymentMethods();
        prepareWhatsappLink();
        showNotification(`Método de pago seleccionado: ${selectedPaymentMethod}`);
    };

    window.closeSplashScreen = () => {
        document.getElementById('splash-screen').style.display = 'none';
    };

    const showNotification = (message) => {
        const notification = document.getElementById('notification-message');
        notification.innerText = message;
        notification.classList.add('show');
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    };

    window.toggleSocialMenu = () => {
        const socialMenu = document.getElementById('social-menu');
        socialMenu.style.display = socialMenu.style.display === 'block' ? 'none' : 'block';
    };

    window.closeSocialMenu = () => {
        document.getElementById('social-menu').style.display = 'none';
    };

    window.togglePaymentMethods = () => {
        const paymentModal = document.getElementById('payment-methods-modal');
        paymentModal.style.display = paymentModal.style.display === 'block' ? 'none' : 'block';
    };

    window.closePaymentMethods = () => {
        document.getElementById('payment-methods-modal').style.display = 'none';
    };

    const launchConfetti = () => {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        });
    };

    const toggleFixedButtons = (show) => {
        const buttons = document.querySelectorAll('.fixed-button');
        buttons.forEach(button => {
            if (show) {
                button.classList.remove('hidden');
            } else {
                button.classList.add('hidden');
            }
        });
    };

    window.showSuggestionsModal = (serviceName) => {
        const modal = document.getElementById('suggestions-modal');
        const title = document.getElementById('suggestions-title');
        const product = products.find(p => p.name === serviceName);
        if (!product || !product.suggestions || product.suggestions.length === 0) {
            console.error("No se encontraron sugerencias para este servicio.");
            return;
        }
        title.innerText = `Sugerencias para ${serviceName}`;
        renderSuggestionsSlides(product.suggestions);
        modal.style.display = 'block';
        toggleFixedButtons(false);
    };

    window.closeSuggestionsModal = () => {
        document.getElementById('suggestions-modal').style.display = 'none';
        toggleFixedButtons(true);
        currentSlide = 0;
    };

    const renderSuggestionsSlides = (movieList) => {
        const carouselContainer = document.getElementById('suggestions-carousel-slides');
        carouselContainer.innerHTML = '';
        movieList.forEach(movie => {
            const slide = document.createElement('div');
            slide.classList.add('carousel-slide');
            slide.innerHTML = `
                <div class="movie-image-container">
                    <img src="${movie.imgUrl}" alt="${movie.title}">
                </div>
                <div class="synopsis-buttons">
                    <button class="synopsis-button" onclick="window.showSynopsis(${movie.id}, '${movie.title.replace(/'/g, "\\'")}')">Sinopsis</button>
                    <button class="trailer-button" onclick="window.showTrailer('${movie.title.replace(/'/g, "\\'")}', '${movie.trailerUrl}')">Tráiler</button>
                </div>
            `;
            carouselContainer.appendChild(slide);
        });
    };

    window.changeSlide = (direction) => {
        const slides = document.querySelectorAll('#suggestions-carousel-slides .carousel-slide');
        currentSlide = (currentSlide + direction + slides.length) % slides.length;
        document.getElementById('suggestions-carousel-slides').style.transform = `translateX(-${currentSlide * 100}%)`;
    };

    window.showSynopsis = async (movieId, movieTitle) => {
        const synopsisModal = document.getElementById('synopsis-modal');
        const synopsisTitle = document.getElementById('synopsis-title');
        const synopsisText = document.getElementById('synopsis-text');

        synopsisTitle.innerText = `Cargando...`;
        synopsisText.innerText = '';
        synopsisModal.style.display = 'block';

        const movieData = await getMovieSynopsis(movieId);
        if (movieData) {
            synopsisTitle.innerText = movieTitle;
            synopsisText.innerText = movieData.overview;
        } else {
            synopsisTitle.innerText = 'Error';
            synopsisText.innerText = 'No se pudo cargar la sinopsis. Intente de nuevo más tarde.';
        }
    };

    const getMovieSynopsis = async (movieId) => {
        const url = `https://api.themoviedb.org/3/movie/${movieId}?api_key=${tmdbApiKey}&language=es-MX`;
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error("Error al obtener la sinopsis:", error);
            return null;
        }
    };

    window.closeSynopsis = () => {
        document.getElementById('synopsis-modal').style.display = 'none';
    };

    window.showTrailer = (movieTitle, trailerUrl) => {
        const trailerModal = document.getElementById('trailer-modal');
        const trailerTitle = document.getElementById('trailer-title');
        const youtubePlayer = document.getElementById('youtube-player');
        trailerTitle.innerText = `Tráiler de ${movieTitle}`;
        youtubePlayer.src = trailerUrl + '?autoplay=1';
        trailerModal.style.display = 'block';
    };

    window.closeTrailer = () => {
        const trailerModal = document.getElementById('trailer-modal');
        const youtubePlayer = document.getElementById('youtube-player');
        youtubePlayer.src = '';
        trailerModal.style.display = 'none';
    };

    window.showMoviesCatalog = () => {};

    window.showProductDetailsModal = (productId) => {
        const product = products.find(p => p.id === productId);
        if (!product) return;

        const modal = document.getElementById('product-details-modal');
        document.getElementById('details-product-name').innerText = product.name;
        document.getElementById('details-product-img').src = product.imgUrl;
        document.getElementById('details-product-img').alt = product.name;
        document.getElementById('details-product-description').innerText = product.detailsDescription || product.description;
        
        modal.style.display = 'block';
        toggleFixedButtons(false);
    };

    window.closeProductDetailsModal = () => {
        document.getElementById('product-details-modal').style.display = 'none';
        toggleFixedButtons(true);
    };

    window.showPricingModal = (product) => {
        selectedGiftcardOption = null;
        const modal = document.getElementById('pricing-modal');
        const title = document.getElementById('pricing-modal-product-name');
        const optionsContainer = document.getElementById('pricing-options-container');
        const infoDisplay = document.getElementById('selected-price-info');
        const confirmButton = document.getElementById('add-to-cart-selected-price');

        title.innerText = product.name;
        optionsContainer.innerHTML = '';
        infoDisplay.innerHTML = '';
        confirmButton.disabled = true;

        product.pricingOptions.forEach(option => {
            const button = document.createElement('button');
            const isDisabled = option.realPrice === 0;
            button.className = 'price-option-button';
            if (isDisabled) {
                button.classList.add('disabled-option');
            }
            button.innerText = `$${option.value}`;
            button.onclick = () => {
                if (isDisabled) return;
                document.querySelectorAll('.price-option-button').forEach(btn => btn.classList.remove('selected'));
                button.classList.add('selected');
                selectedGiftcardOption = option;
                infoDisplay.innerText = `Precio real: $${option.realPrice.toFixed(2)} (Bs ${(option.realPrice * dollarRate).toFixed(2)})`;
                confirmButton.disabled = false;
            };
            optionsContainer.appendChild(button);
        });

        confirmButton.onclick = () => {
            if (selectedGiftcardOption) {
                window.addToCart(product.id, selectedGiftcardOption.realPrice, selectedGiftcardOption.productDescription);
                window.closePricingModal();
            }
        };

        modal.style.display = 'block';
    };

    window.closePricingModal = () => {
        document.getElementById('pricing-modal').style.display = 'none';
    };

    loadCartFromStorage();
    fetchProducts();

    document.getElementById('close-cart-modal').addEventListener('click', window.closeCart);
    document.getElementById('cart-modal').addEventListener('click', (e) => {
        if (e.target.id === 'cart-modal') {
            window.closeCart();
        }
    });
    document.getElementById('social-menu').addEventListener('click', (e) => {
        if (e.target.id === 'social-menu') {
            window.closeSocialMenu();
        }
    });
    document.getElementById('payment-methods-modal').addEventListener('click', (e) => {
        if (e.target.id === 'payment-methods-modal') {
            window.closePaymentMethods();
        }
    });
    document.getElementById('suggestions-modal').addEventListener('click', (e) => {
        if (e.target.id === 'suggestions-modal') {
            window.closeSuggestionsModal();
        }
    });
    document.getElementById('synopsis-modal').addEventListener('click', (e) => {
        if (e.target.id === 'synopsis-modal') {
            window.closeSynopsis();
        }
    });
    document.getElementById('trailer-modal').addEventListener('click', (e) => {
        if (e.target.id === 'trailer-modal') {
            window.closeTrailer();
        }
    });
    document.getElementById('product-details-modal').addEventListener('click', (e) => {
        if (e.target.id === 'product-details-modal') {
            window.closeProductDetailsModal();
        }
    });
    document.getElementById('pricing-modal').addEventListener('click', (e) => {
        if (e.target.id === 'pricing-modal') {
            window.closePricingModal();
        }
    });
});
