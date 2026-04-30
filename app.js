// ================================
// 🔥 FIREBASE CONFIGURATION
// ================================
const useFirebase = true;

// ================================
// CONFIGURATION & CONSTANTS
// ================================
const DEFAULT_BANNER = "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=1600&h=600&fit=crop";

// ================================
// STATE
// ================================
let products = [];
let feedbacks = JSON.parse(localStorage.getItem('vishwakarma-feedbacks')) || [];
let pinnedDesigns = JSON.parse(localStorage.getItem('vishwakarma-pinned')) || [];
let bannerImage = localStorage.getItem('vishwakarma-banner') || DEFAULT_BANNER;
let selectedCategory = 'All';
let searchQuery = '';
let currentZoom = 100;
let isAdminAuthenticated = false;
let selectedImageFile = null;
let cropper = null;

// ================================
// IMAGE LAZY LOADING & SKELETON
// ================================
function lazyLoadImage(img) {
    const src = img.dataset.src;
    if (!src) return;

    const container = img.closest('.product-image-container');
    if (container) container.classList.add('skeleton-loading');

    const tempImg = new Image();
    tempImg.onload = () => {
        img.src = src;
        img.classList.add('loaded');
        if (container) container.classList.remove('skeleton-loading');
    };
    tempImg.onerror = () => {
        img.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect fill="%23f5f5f4" width="400" height="300"/><text fill="%23aaa" font-size="14" x="50%" y="50%" dominant-baseline="middle" text-anchor="middle">Image not available</text></svg>';
        img.classList.add('loaded');
        if (container) container.classList.remove('skeleton-loading');
    };
    tempImg.src = src;
}

function initLazyLoading() {
    const images = document.querySelectorAll('img[data-src]');
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    lazyLoadImage(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        }, { rootMargin: '200px' });
        images.forEach(img => observer.observe(img));
    } else {
        images.forEach(lazyLoadImage);
    }
}

// ================================
// SEARCH
// ================================
function initSearch() {
    const input = document.getElementById('search-input');
    const clearBtn = document.getElementById('search-clear');

    if (!input) return;

    let debounceTimer;
    input.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            searchQuery = input.value.trim().toLowerCase();
            clearBtn.classList.toggle('visible', searchQuery.length > 0);
            renderProducts();
            updateSearchResultsBar();
        }, 200);
    });

    clearBtn.addEventListener('click', () => {
        input.value = '';
        searchQuery = '';
        clearBtn.classList.remove('visible');
        renderProducts();
        updateSearchResultsBar();
        input.focus();
    });
}

function updateSearchResultsBar() {
    const bar = document.getElementById('search-results-bar');
    if (!bar) return;
    if (!searchQuery) {
        bar.classList.remove('visible');
        return;
    }
    const count = getFilteredProducts().length;
    bar.innerHTML = `<div class="container">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <span>Found <strong>${count}</strong> result${count !== 1 ? 's' : ''} for "<strong>${escapeHtml(searchQuery)}</strong>"</span>
        <button onclick="clearSearch()" style="background:none;border:none;color:inherit;cursor:pointer;text-decoration:underline;font-size:0.8rem;">Clear</button>
    </div>`;
    bar.classList.add('visible');
}

function clearSearch() {
    const input = document.getElementById('search-input');
    const clearBtn = document.getElementById('search-clear');
    if (input) input.value = '';
    searchQuery = '';
    if (clearBtn) clearBtn.classList.remove('visible');
    renderProducts();
    updateSearchResultsBar();
}

function getFilteredProducts() {
    let filtered = products;
    if (selectedCategory !== 'All') {
        if (selectedCategory === 'Most Liked') {
            filtered = filtered.filter(p => p.mostLiked);
        } else {
            filtered = filtered.filter(p => p.category === selectedCategory);
        }
    }
    if (searchQuery) {
        filtered = filtered.filter(p =>
            p.name.toLowerCase().includes(searchQuery) ||
            p.description.toLowerCase().includes(searchQuery) ||
            p.category.toLowerCase().includes(searchQuery)
        );
    }
    return filtered;
}

function escapeHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ================================
// IMAGE CROPPER
// ================================
function handleImagePreview(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('Select a valid image', 'error'); return; }
    selectedImageFile = file;

    const preview = document.getElementById('image-preview');
    preview.src = URL.createObjectURL(file);
    preview.onload = () => URL.revokeObjectURL(preview.src);
    preview.style.display = 'block';

    if (cropper) cropper.destroy();
    cropper = new Cropper(preview, {
        aspectRatio: 4/3, viewMode: 1, autoCropArea: 1,
        responsive: true, background: false, zoomable: true, movable: true, scalable: false
    });
}

async function uploadToFirebase(file) {
    try {
        const fileName = `product-images/${Date.now()}.jpg`;
        const storageRef = storage.ref(fileName);
        const snapshot = await storageRef.put(file);
        return await snapshot.ref.getDownloadURL();
    } catch (error) {
        console.error('Upload error:', error);
        showToast('Image upload failed', 'error');
        throw error;
    }
}

// ================================
// DEFAULT DATA
// ================================
function getDefaultProducts() {
    return [
        { id:'1', name:'Classic Wooden Bed', description:'Elegant teak wood bed with intricate carvings and premium finish. Available in queen and king sizes.', price:45000, category:'Beds', image:'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800', type:'previous-work', mostLiked:true },
        { id:'2', name:'Modern Wardrobe', description:'Spacious wardrobe with mirror and sliding doors. Made from premium seasoned wood.', price:38000, category:'Almirah', image:'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800', type:'previous-work', mostLiked:false },
        { id:'3', name:'Designer Main Door', description:'Handcrafted main door with traditional designs, premium hardware fittings included.', price:55000, category:'Doors', image:'https://images.unsplash.com/photo-1540079769940-274ed82e6ae7?w=800', type:'inspiration', mostLiked:false },
        { id:'4', name:'Modular Kitchen', description:'Complete modular kitchen with premium finish, soft-close hinges, and custom storage solutions.', price:125000, category:'Kitchens', image:'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=800', type:'inspiration', mostLiked:true },
        { id:'5', name:'LED Panel Wall Unit', description:'Modern LED panel with storage compartments. Custom colours and sizes available.', price:32000, category:'LED Panels', image:'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800', type:'previous-work', mostLiked:false },
        { id:'6', name:'Luxury Dressing Table', description:'Elegant dressing table with lit mirror and ample drawer space for a perfect vanity setup.', price:28000, category:'Dressing Tables', image:'https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=800', type:'inspiration', mostLiked:false }
    ];
}

// ================================
// 🔥 FIREBASE FUNCTIONS
// ================================
function loadProductsFromFirestore() {
    showSkeletons();
    db.collection('products').onSnapshot((snapshot) => {
        products = [];
        snapshot.forEach((doc) => { products.push({ id: doc.id, ...doc.data() }); });
        renderCategories();
        renderProducts();
        console.log('Products loaded:', products.length);
    }, (error) => {
        console.error('Error:', error);
        showToast('Failed to load products', 'error');
        products = getDefaultProducts();
        renderCategories();
        renderProducts();
    });
}

async function addProductToFirestore(productData) {
    try {
        const docRef = await db.collection('products').add({
            ...productData,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showToast('Product added successfully', 'success');
        return { id: docRef.id, ...productData };
    } catch (error) {
        console.error('Error adding product:', error);
        showToast('Failed to add product', 'error');
        throw error;
    }
}

async function updateProductInFirestore(id, updates) {
    try {
        await db.collection('products').doc(id).update({
            ...updates, updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showToast('Product updated successfully', 'success');
    } catch (error) {
        console.error('Error updating product:', error);
        showToast('Failed to update product', 'error');
        throw error;
    }
}

async function deleteProductFromFirestore(id) {
    try {
        await db.collection('products').doc(id).delete();
        showToast('Product deleted successfully', 'success');
    } catch (error) {
        console.error('Error deleting product:', error);
        showToast('Failed to delete product', 'error');
        throw error;
    }
}

// ================================
// 🔐 FIREBASE AUTH
// ================================
function checkAuthState() {
    auth.onAuthStateChanged((user) => {
        isAdminAuthenticated = !!user;
        console.log(user ? `✅ Logged in: ${user.email}` : '❌ Logged out');
    });
}

async function logoutFirebase() {
    try {
        await auth.signOut();
        isAdminAuthenticated = false;
        closeAdminModal();
        showToast('Logged out successfully', 'success');
    } catch (error) { console.error('Logout error:', error); }
}

// ================================
// LOCAL STORAGE
// ================================
function saveToLocalStorage() {
    localStorage.setItem('vishwakarma-feedbacks', JSON.stringify(feedbacks));
    localStorage.setItem('vishwakarma-pinned', JSON.stringify(pinnedDesigns));
    localStorage.setItem('vishwakarma-banner', bannerImage);
}

// ================================
// SKELETON LOADERS
// ================================
function showSkeletons() {
    const skeletonHTML = Array(4).fill(0).map(() => `
        <div class="skeleton-card">
            <div class="skeleton-img"></div>
            <div class="skeleton-body">
                <div class="skeleton-line w-40"></div>
                <div class="skeleton-line w-80"></div>
                <div class="skeleton-line w-60"></div>
            </div>
        </div>
    `).join('');
    const pg = document.getElementById('previous-works-grid');
    const ig = document.getElementById('inspirations-grid');
    if (pg) pg.innerHTML = skeletonHTML;
    if (ig) ig.innerHTML = skeletonHTML;
}

// ================================
// RENDERING
// ================================
function renderCategories() {
    const container = document.getElementById('category-buttons');
    if (!container) return;
    const categories = ['All', 'Beds', 'Almirah', 'Doors', 'Kitchens', 'LED Panels', 'Dressing Tables', 'Study Tables', 'Tables'];
    const mostLikedCount = products.filter(p => p.mostLiked).length;

    let html = categories.map(cat => `
        <button class="category-btn ${cat === selectedCategory ? 'active' : ''}" onclick="selectCategory('${cat}')">${cat}</button>
    `).join('');

    if (mostLikedCount > 0) {
        html += `
            <button class="category-btn most-liked ${selectedCategory === 'Most Liked' ? 'active' : ''}" onclick="selectCategory('Most Liked')">
                <svg class="icon-small" viewBox="0 0 24 24" fill="${selectedCategory === 'Most Liked' ? 'white' : '#f59e0b'}" stroke="${selectedCategory === 'Most Liked' ? 'white' : '#f59e0b'}" stroke-width="1">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
                Most Liked
                <span class="category-badge">${mostLikedCount}</span>
            </button>
        `;
    }
    container.innerHTML = html;
}

function filterProductsByType(type) {
    let filtered = products.filter(p => p.type === type);
    if (selectedCategory === 'Most Liked') return filtered.filter(p => p.mostLiked);
    if (selectedCategory !== 'All') filtered = filtered.filter(p => p.category === selectedCategory);
    if (searchQuery) {
        filtered = filtered.filter(p =>
            p.name.toLowerCase().includes(searchQuery) ||
            p.description.toLowerCase().includes(searchQuery) ||
            p.category.toLowerCase().includes(searchQuery)
        );
    }
    return filtered;
}

function renderProducts() {
    const previousWorks = filterProductsByType('previous-work');
    const inspirations = filterProductsByType('inspiration');

    // Previous Works
    const previousGrid = document.getElementById('previous-works-grid');
    if (previousGrid) {
        const shown = previousWorks.slice(0, 4);
        previousGrid.innerHTML = shown.length
            ? shown.map(p => createProductCard(p)).join('')
            : emptyState('No previous works found');
        initLazyLoading();
    }

    // View All button
    const viewAllPrev = document.getElementById('view-all-previous');
    const prevCount = document.getElementById('previous-count');
    if (viewAllPrev) {
        if (previousWorks.length > 4) {
            viewAllPrev.classList.remove('hidden');
            if (prevCount) prevCount.textContent = `(${previousWorks.length})`;
        } else {
            viewAllPrev.classList.add('hidden');
        }
    }

    // Inspirations
    const inspirGrid = document.getElementById('inspirations-grid');
    if (inspirGrid) {
        const shown = inspirations.slice(0, 4);
        inspirGrid.innerHTML = shown.length
            ? shown.map(p => createProductCard(p)).join('')
            : emptyState('No inspirations found');
        initLazyLoading();
    }

    const viewAllInsp = document.getElementById('view-all-inspirations');
    const inspCount = document.getElementById('inspiration-count');
    if (viewAllInsp) {
        if (inspirations.length > 4) {
            viewAllInsp.classList.remove('hidden');
            if (inspCount) inspCount.textContent = `(${inspirations.length})`;
        } else {
            viewAllInsp.classList.add('hidden');
        }
    }
}

function emptyState(message) {
    return `<div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
            <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
        </svg>
        <h3>${message}</h3>
        <p>Try selecting a different category${searchQuery ? ' or clearing the search' : ''}</p>
    </div>`;
}

function createProductCard(product) {
    const isPinned = pinnedDesigns.some(item => item.product.id === product.id);
    return `
        <div class="product-card" onclick="openProductDetail('${product.id}')">
            <div class="product-image-container skeleton-loading">
                ${product.mostLiked ? `<div class="most-liked-badge">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    Top Pick
                </div>` : ''}
                <img data-src="${product.image}" alt="${product.name}" class="product-image">
                <div class="price-badge">₹${product.price.toLocaleString('en-IN')}</div>
                <button class="pin-btn ${isPinned ? 'pinned' : ''}" onclick="togglePin(event,'${product.id}')" title="${isPinned ? 'Unpin' : 'Pin'} design">
                    <svg class="icon-small" viewBox="0 0 24 24" fill="${isPinned ? 'white' : 'none'}" stroke="${isPinned ? 'white' : 'currentColor'}" stroke-width="2">
                        <path d="M12 17v5m-7-5l7-7 7 7m-7-7v-5l-3 1v5z"/>
                    </svg>
                </button>
            </div>
            <div class="product-info">
                <div class="product-category">${product.category}</div>
                <h3 class="product-name">${product.name}</h3>
                <p class="product-description">${product.description}</p>
            </div>
        </div>
    `;
}

function updateBanner() {
    const hero = document.getElementById('hero-banner');
    if (hero) hero.style.backgroundImage = `url(${bannerImage})`;
}

function updatePinnedBadge() {
    const badge = document.getElementById('pinned-badge');
    if (!badge) return;
    const count = pinnedDesigns.length;
    badge.textContent = count;
    badge.classList.toggle('hidden', count === 0);
}

// ================================
// CATEGORY & PIN EVENTS
// ================================
function selectCategory(category) {
    selectedCategory = category;
    renderCategories();
    renderProducts();
    updateSearchResultsBar();
}

function togglePin(event, productId) {
    event.stopPropagation();
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const existingIdx = pinnedDesigns.findIndex(item => item.product.id === productId);
    if (existingIdx !== -1) {
        pinnedDesigns.splice(existingIdx, 1);
        showToast('Design unpinned');
    } else {
        pinnedDesigns.push({ product, pinnedAt: Date.now() });
        showToast('Design pinned!', 'success');
    }
    saveToLocalStorage();
    updatePinnedBadge();
    renderProducts();
    // Also update detail modal pin button if open
    const pinDetailBtn = document.getElementById('detail-pin-btn');
    if (pinDetailBtn && pinDetailBtn.dataset.id === productId) {
        const nowPinned = pinnedDesigns.some(i => i.product.id === productId);
        pinDetailBtn.className = `btn-pin-detail ${nowPinned ? 'pinned' : ''}`;
        pinDetailBtn.innerHTML = nowPinned ? '📌 Pinned' : '📌 Pin This Design';
    }
}

// ================================
// PRODUCT DETAIL MODAL
// ================================
function openProductDetail(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    // Get related products (same category, excluding current)
    const related = products.filter(p => p.category === product.category && p.id !== product.id).slice(0, 6);
    const isPinned = pinnedDesigns.some(item => item.product.id === product.id);
    const whatsappMsg = encodeURIComponent(`Hello! I'm interested in the "${product.name}" (₹${product.price.toLocaleString('en-IN')}) from Shri Vishwakarma Wood Works. Could you provide more details?`);

    const modal = document.createElement('div');
    modal.id = 'product-detail-overlay';
    modal.className = 'product-detail-modal';
    modal.innerHTML = `
        <div class="product-detail-content" id="product-detail-content">
            <span class="detail-drag-handle"></span>
            <div class="detail-inner">
                <button class="detail-close-btn" onclick="closeProductDetail()" title="Close">&times;</button>
                <div class="detail-layout">
                    <!-- Left: Image -->
                    <div>
                        <div class="detail-main-image" onclick="openImageViewer('${product.image}', '${product.name}')">
                            <img src="${product.image}" alt="${product.name}" loading="lazy">
                        </div>
                    </div>
                    <!-- Right: Info -->
                    <div class="detail-info">
                        <div>
                            <span class="detail-category-badge">${product.category}</span>
                        </div>
                        <h2 class="detail-name">${product.name}</h2>
                        <div>
                            <div class="detail-price">₹${product.price.toLocaleString('en-IN')}</div>
                            <div class="detail-price-note">*Estimated price. Final price may vary based on dimensions & material.</div>
                        </div>
                        <p class="detail-description">${product.description}</p>
                        <div class="detail-actions">
                            <a href="https://wa.me/917082702447?text=${whatsappMsg}" target="_blank" class="btn-whatsapp">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                                </svg>
                                Enquire on WhatsApp
                            </a>
                            <button id="detail-pin-btn" data-id="${product.id}" class="btn-pin-detail ${isPinned ? 'pinned' : ''}" onclick="togglePinFromDetail('${product.id}')">
                                📌 ${isPinned ? 'Pinned' : 'Pin This Design'}
                            </button>
                        </div>
                    </div>
                </div>
                ${related.length > 0 ? `
                <div class="related-section">
                    <h3 class="related-title">More ${product.category}</h3>
                    <div class="related-grid">
                        ${related.map(r => `
                            <div class="related-card" onclick="switchProductDetail('${r.id}')">
                                <img src="${r.image}" alt="${r.name}" loading="lazy">
                                <div class="related-card-info">
                                    <div class="related-card-name">${r.name}</div>
                                    <div class="related-card-price">₹${r.price.toLocaleString('en-IN')}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>` : ''}
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    // Animate in
    requestAnimationFrame(() => {
        requestAnimationFrame(() => modal.classList.add('open'));
    });

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeProductDetail();
    });

    // Close on Escape
    document.addEventListener('keydown', handleDetailKeydown);
}

function handleDetailKeydown(e) {
    if (e.key === 'Escape') closeProductDetail();
}

function closeProductDetail() {
    const modal = document.getElementById('product-detail-overlay');
    if (!modal) return;
    modal.classList.remove('open');
    document.body.style.overflow = '';
    document.removeEventListener('keydown', handleDetailKeydown);
    setTimeout(() => modal.remove(), 300);
}

function switchProductDetail(productId) {
    closeProductDetail();
    setTimeout(() => openProductDetail(productId), 320);
}

function togglePinFromDetail(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const existingIdx = pinnedDesigns.findIndex(item => item.product.id === productId);
    if (existingIdx !== -1) {
        pinnedDesigns.splice(existingIdx, 1);
        showToast('Design unpinned');
    } else {
        pinnedDesigns.push({ product, pinnedAt: Date.now() });
        showToast('Design pinned!', 'success');
    }
    saveToLocalStorage();
    updatePinnedBadge();
    renderProducts();
    // Update button
    const btn = document.getElementById('detail-pin-btn');
    if (btn) {
        const nowPinned = pinnedDesigns.some(i => i.product.id === productId);
        btn.className = `btn-pin-detail ${nowPinned ? 'pinned' : ''}`;
        btn.textContent = nowPinned ? '📌 Pinned' : '📌 Pin This Design';
    }
}

function viewAllSection(type) {
    let filtered = products.filter(p => p.type === type);
    if (selectedCategory !== 'All') {
        filtered = selectedCategory === 'Most Liked'
            ? filtered.filter(p => p.mostLiked)
            : filtered.filter(p => p.category === selectedCategory);
    }

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content modal-large">
            <div class="modal-header">
                <h2>${type === 'previous-work' ? 'All Previous Works' : 'All Inspirations'} (${filtered.length})</h2>
                <button onclick="this.closest('.modal').remove(); document.body.style.overflow='';" class="close-btn">&times;</button>
            </div>
            <div class="modal-body">
                <div class="product-grid">${filtered.map(p => createProductCard(p)).join('')}</div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    modal.addEventListener('click', (e) => {
        if (e.target === modal) { modal.remove(); document.body.style.overflow = ''; }
    });
    initLazyLoading();
}

// ================================
// PINNED DESIGNS MODAL
// ================================
function showPinnedDesigns() {
    if (pinnedDesigns.length === 0) { showToast('No designs pinned yet'); return; }

    const totalEstimate = pinnedDesigns.reduce((sum, item) => sum + item.product.price, 0);
    const whatsappMessage = `Hello! I'm interested in these designs from Shri Vishwakarma Wood Works:\n\n${pinnedDesigns.map((item, idx) => `${idx+1}. ${item.product.name} - ₹${item.product.price.toLocaleString('en-IN')}`).join('\n')}\n\nEstimated Total: ₹${totalEstimate.toLocaleString('en-IN')}\n\nI'd like to discuss pricing and details.`;
    const emailBody = pinnedDesigns.map((item, idx) => `${idx+1}. ${item.product.name} (₹${item.product.price.toLocaleString('en-IN')})`).join('%0D%0A');

    const html = `
        <div style="max-height: 60vh; overflow-y: auto;">
            <h3 style="margin-bottom: 1rem; font-size: 1.1rem; font-weight: 700;">Pinned Designs (${pinnedDesigns.length})</h3>
            <div style="display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1.5rem;">
                ${pinnedDesigns.map(item => `
                    <div style="display: flex; gap: 0.875rem; padding: 0.75rem; border: 1px solid var(--border); border-radius: 10px; background: white;">
                        <img src="${item.product.image}" alt="${item.product.name}" style="width: 72px; height: 56px; object-fit: cover; border-radius: 6px; cursor: pointer; flex-shrink:0;" onclick="openImageViewer('${item.product.image}', '${item.product.name}')">
                        <div style="flex: 1; min-width: 0;">
                            <h4 style="font-weight: 600; font-size: 0.9rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.product.name}</h4>
                            <p style="font-size: 0.75rem; color: var(--text-light);">${item.product.category}</p>
                        </div>
                        <div style="display: flex; flex-direction: column; justify-content: space-between; align-items: flex-end; flex-shrink:0;">
                            <div style="font-weight: 700; color: var(--primary); font-size:0.9rem;">₹${item.product.price.toLocaleString('en-IN')}</div>
                            <button onclick="removeFromPinnedInModal('${item.product.id}')" style="padding: 0.2rem 0.4rem; background: none; border: none; color: var(--danger); cursor: pointer; font-size: 0.8rem;">Remove</button>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div style="border: 1px solid var(--border); border-radius: 10px; padding: 1rem; background: var(--bg);">
                <div style="display: flex; justify-content: space-between; padding-bottom: 0.75rem; border-bottom: 1px solid var(--border); margin-bottom: 0.75rem;">
                    <span style="font-size:0.875rem;">Total Designs:</span>
                    <span style="font-weight:600;">${pinnedDesigns.length}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 1.1rem; font-weight: 700; margin-bottom: 0.75rem;">
                    <span>Estimated Total:</span>
                    <span style="color: var(--primary);">₹${totalEstimate.toLocaleString('en-IN')}</span>
                </div>
                <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 0.6rem 0.875rem; margin-bottom: 1rem; font-size: 0.8rem; color: #92400e;">
                    <strong>Note:</strong> Final pricing may vary based on customisation and dimensions.
                </div>
                <div style="display: flex; flex-direction: column; gap: 0.6rem;">
                    <a href="https://wa.me/917082702447?text=${encodeURIComponent(whatsappMessage)}" target="_blank" class="btn-whatsapp" style="display:flex;align-items:center;justify-content:center;gap:0.5rem;background:#25D366;color:white;padding:0.7rem;border-radius:50px;text-decoration:none;font-weight:600;font-size:0.875rem;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                        Send via WhatsApp
                    </a>
                    <a href="mailto:jangranaman337@gmail.com?subject=Inquiry about Selected Designs&body=Hi,%0D%0A%0D%0AI'm interested in:%0D%0A%0D%0A${emailBody}%0D%0A%0D%0AEstimated Total: ₹${totalEstimate.toLocaleString('en-IN')}%0D%0A%0D%0AThank you!" style="display:flex;align-items:center;justify-content:center;gap:0.5rem;background:white;color:var(--primary);padding:0.7rem;border:1.5px solid var(--primary);border-radius:50px;text-decoration:none;font-weight:600;font-size:0.875rem;">
                        📧 Send via Email
                    </a>
                    <a href="tel:+917082702447" style="display:flex;align-items:center;justify-content:center;gap:0.5rem;background:var(--primary);color:white;padding:0.7rem;border-radius:50px;text-decoration:none;font-weight:600;font-size:0.875rem;">
                        📞 Call Now
                    </a>
                </div>
            </div>
        </div>
    `;

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content modal-large">
            <div class="modal-header">
                <h2>Pinned Designs</h2>
                <button onclick="this.closest('.modal').remove(); document.body.style.overflow='';" class="close-btn">&times;</button>
            </div>
            <div class="modal-body">${html}</div>
        </div>
    `;
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    modal.addEventListener('click', (e) => {
        if (e.target === modal) { modal.remove(); document.body.style.overflow = ''; }
    });
}

function removeFromPinnedInModal(productId) {
    pinnedDesigns = pinnedDesigns.filter(item => item.product.id !== productId);
    saveToLocalStorage();
    updatePinnedBadge();
    document.querySelector('.modal')?.remove();
    document.body.style.overflow = '';
    if (pinnedDesigns.length > 0) showPinnedDesigns();
    else showToast('All designs removed');
}

// ================================
// ADMIN
// ================================
let logoClickCount = 0;
let logoClickTimer;

function handleLogoClick() {
    logoClickCount++;
    clearTimeout(logoClickTimer);
    logoClickTimer = setTimeout(() => { logoClickCount = 0; }, 2000);
    if (logoClickCount >= 5) {
        const email = prompt('Enter admin email');
        if (email === 'jangranaman337@gmail.com') openAdminModal();
        else alert('Access denied');
    }
}

function openAdminModal() {
    const modal = document.getElementById('admin-modal');
    modal.classList.remove('hidden');
    if (!auth.currentUser) renderAdminLogin();
    else renderAdminPanel();
}

function closeAdminModal() {
    document.getElementById('admin-modal').classList.add('hidden');
    if (auth.currentUser) auth.signOut();
    isAdminAuthenticated = false;
}

function renderAdminLogin() {
    document.getElementById('admin-title').textContent = 'Admin Access';
    document.getElementById('admin-body').innerHTML = `
        <form onsubmit="handleFirebaseLogin(event)" style="max-width:400px;margin:0 auto;">
            <div class="form-group"><label>Email</label><input type="email" id="admin-email" required placeholder="Admin email"></div>
            <div class="form-group"><label>Password</label><input type="password" id="admin-password" required placeholder="Password"></div>
            <button type="submit" class="btn btn-primary" style="width:100%">Login</button>
        </form>
    `;
}

async function handleFirebaseLogin(event) {
    event.preventDefault();
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;
    if (email !== 'jangranaman337@gmail.com') { showToast('Access denied', 'error'); return; }
    try {
        await auth.signInWithEmailAndPassword(email, password);
        isAdminAuthenticated = true;
        renderAdminPanel();
        showToast('Login successful', 'success');
    } catch (error) { showToast('Invalid credentials', 'error'); }
}

function renderAdminPanel() {
    document.getElementById('admin-title').textContent = 'Admin Panel';
    document.getElementById('admin-body').innerHTML = `
        <div style="margin-bottom:1rem;display:flex;justify-content:flex-end;">
            <button onclick="logoutFirebase()" class="btn btn-outline" style="font-size:0.875rem;">Logout</button>
        </div>
        <div class="admin-tabs">
            <button class="admin-tab active" onclick="switchAdminTab(event,'products')">Products</button>
            <button class="admin-tab" onclick="switchAdminTab(event,'mostLiked')">Most Liked (${products.filter(p=>p.mostLiked).length})</button>
            <button class="admin-tab" onclick="switchAdminTab(event,'banner')">Banner</button>
            <button class="admin-tab" onclick="switchAdminTab(event,'feedbacks')">Feedbacks (${feedbacks.length})</button>
        </div>
        <div id="admin-content"></div>
    `;
    switchAdminTab(null, 'products');
}

function switchAdminTab(event, tab) {
    document.querySelectorAll('.admin-tab').forEach(btn => btn.classList.remove('active'));
    if (event) event.target.classList.add('active');
    else document.querySelector('.admin-tab')?.classList.add('active');
    const content = document.getElementById('admin-content');
    const map = { products: renderProductsTab, mostLiked: renderMostLikedTab, banner: renderBannerTab, feedbacks: renderFeedbacksTab };
    map[tab]?.(content);
}

function renderProductsTab(content) {
    content.innerHTML = `
        <div style="margin-bottom:1.25rem;">
            <button onclick="showAddProductForm()" class="btn btn-primary">+ Add New Design</button>
        </div>
        <div id="product-form-container"></div>
        <div style="overflow-x:auto;">
            <table class="admin-table">
                <thead><tr><th>Image</th><th>Name</th><th>Category</th><th>Type</th><th>Price</th><th>⭐</th><th>Actions</th></tr></thead>
                <tbody>
                    ${products.map(product => `
                        <tr>
                            <td><img src="${product.image}" alt="${product.name}" onclick="openImageViewer('${product.image}','${product.name}')"></td>
                            <td>${product.name}</td>
                            <td>${product.category}</td>
                            <td><span class="type-badge ${product.type==='previous-work'?'type-previous':'type-inspiration'}">${product.type==='previous-work'?'Previous Work':'Inspiration'}</span></td>
                            <td>₹${product.price.toLocaleString('en-IN')}</td>
                            <td>
                                <button onclick="toggleMostLiked('${product.id}')" class="btn ${product.mostLiked?'btn-primary':'btn-outline'}" style="padding:0.2rem 0.5rem;font-size:0.75rem;" title="${product.mostLiked?'Remove from':'Add to'} Most Liked">
                                    ${product.mostLiked ? '⭐' : '☆'}
                                </button>
                            </td>
                            <td>
                                <div style="display:flex;gap:0.4rem;flex-wrap:wrap;">
                                    <button onclick="editProduct('${product.id}')" class="btn btn-outline" style="padding:0.2rem 0.5rem;font-size:0.75rem;">Edit</button>
                                    <button onclick="deleteProduct('${product.id}')" class="btn btn-outline" style="padding:0.2rem 0.5rem;font-size:0.75rem;color:var(--danger);">Delete</button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function showAddProductForm() {
    document.getElementById('product-form-container').innerHTML = `
        <div style="background:var(--bg);padding:1.25rem;border-radius:10px;margin-bottom:1.5rem;">
            <h3 style="margin-bottom:1rem;font-size:1rem;font-weight:700;">Add New Design</h3>
            <form onsubmit="saveProduct(event)" id="product-form">
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:1rem;">
                    <div class="form-group"><label>Name *</label><input type="text" name="name" required></div>
                    <div class="form-group"><label>Price (₹) *</label><input type="number" name="price" required></div>
                    <div class="form-group"><label>Category *</label><select name="category" required>${getCategoryOptions()}</select></div>
                    <div class="form-group"><label>Type *</label><select name="type" required><option value="previous-work">Previous Work</option><option value="inspiration">Inspiration</option></select></div>
                </div>
                <div class="form-group"><label>Description *</label><textarea name="description" required rows="3"></textarea></div>
                <div class="form-group"><label>Upload Image *</label><input type="file" id="image-input" accept="image/*" required onchange="handleImagePreview(event)"></div>
                <div class="form-group"><label>Crop Image</label><img id="image-preview" style="max-width:100%;display:none;" /></div>
                <div class="form-group">
                    <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;">
                        <input type="checkbox" name="mostLiked" style="width:auto;min-height:auto;"> Mark as Most Liked
                    </label>
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">Save Product</button>
                    <button type="button" onclick="cancelProductForm()" class="btn btn-outline">Cancel</button>
                </div>
            </form>
        </div>
    `;
}

function getCategoryOptions(selected = '') {
    return ['Beds','Almirah','Doors','Kitchens','LED Panels','Dressing Tables','Study Tables','Tables']
        .map(c => `<option value="${c}" ${selected===c?'selected':''}>${c}</option>`).join('');
}

async function saveProduct(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const btn = form.querySelector("button[type='submit']");
    btn.disabled = true; btn.innerText = 'Saving...';
    try {
        if (!selectedImageFile) throw new Error('No image selected');
        showToast('Uploading image...', 'info');
        let imageUrl = '';
        if (cropper && cropper.getCroppedCanvas()) {
            const canvas = cropper.getCroppedCanvas({ width: 800, height: 600 });
            const blob = await new Promise((resolve, reject) => {
                canvas.toBlob(b => b ? resolve(b) : reject('Blob failed'), 'image/jpeg', 0.85);
            });
            imageUrl = await uploadToFirebase(blob);
        } else {
            imageUrl = await uploadToFirebase(selectedImageFile);
        }
        await addProductToFirestore({
            name: formData.get('name'),
            description: formData.get('description'),
            price: parseInt(formData.get('price')),
            category: formData.get('category'),
            image: imageUrl,
            type: formData.get('type'),
            mostLiked: formData.get('mostLiked') === 'on'
        });
        form.reset();
        selectedImageFile = null;
        if (cropper) { cropper.destroy(); cropper = null; }
        const preview = document.getElementById('image-preview');
        if (preview) { preview.src = ''; preview.style.display = 'none'; }
    } catch (error) {
        console.error('Save error:', error);
        showToast(error.message || 'Something went wrong', 'error');
    } finally {
        btn.disabled = false; btn.innerText = 'Save Product';
    }
}

function cancelProductForm() { document.getElementById('product-form-container').innerHTML = ''; }

function editProduct(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;
    const container = document.getElementById('product-form-container');
    container.innerHTML = `
        <div style="background:var(--bg);padding:1.25rem;border-radius:10px;margin-bottom:1.5rem;">
            <h3 style="margin-bottom:1rem;font-size:1rem;font-weight:700;">Edit Design</h3>
            <form onsubmit="updateProduct(event,'${id}')" id="product-form">
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:1rem;">
                    <div class="form-group"><label>Name *</label><input type="text" name="name" value="${product.name}" required></div>
                    <div class="form-group"><label>Price (₹) *</label><input type="number" name="price" value="${product.price}" required></div>
                    <div class="form-group"><label>Category *</label><select name="category" required>${getCategoryOptions(product.category)}</select></div>
                    <div class="form-group"><label>Type *</label><select name="type" required><option value="previous-work" ${product.type==='previous-work'?'selected':''}>Previous Work</option><option value="inspiration" ${product.type==='inspiration'?'selected':''}>Inspiration</option></select></div>
                </div>
                <div class="form-group"><label>Description *</label><textarea name="description" required rows="3">${product.description}</textarea></div>
                <div class="form-group">
                    <label>Change Image (optional)</label>
                    <input type="file" accept="image/*" onchange="handleImagePreview(event)">
                    <img id="image-preview" src="${product.image}" style="max-width:100%;max-height:180px;margin-top:0.5rem;border-radius:8px;object-fit:cover;">
                </div>
                <div class="form-group">
                    <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;">
                        <input type="checkbox" name="mostLiked" ${product.mostLiked?'checked':''} style="width:auto;min-height:auto;"> Mark as Most Liked
                    </label>
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">Update Product</button>
                    <button type="button" onclick="cancelProductForm()" class="btn btn-outline">Cancel</button>
                </div>
            </form>
        </div>
    `;
    container.scrollIntoView({ behavior: 'smooth' });
}

async function updateProduct(event, id) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const btn = form.querySelector("button[type='submit']");
    btn.disabled = true; btn.innerText = 'Updating...';
    try {
        let imageUrl = products.find(p => p.id === id)?.image || '';
        if (selectedImageFile) {
            showToast('Uploading image...', 'info');
            if (cropper && cropper.getCroppedCanvas()) {
                const canvas = cropper.getCroppedCanvas({ width: 800, height: 600 });
                const blob = await new Promise((resolve, reject) => {
                    canvas.toBlob(b => b ? resolve(b) : reject('Blob failed'), 'image/jpeg', 0.85);
                });
                imageUrl = await uploadToFirebase(blob);
            } else {
                imageUrl = await uploadToFirebase(selectedImageFile);
            }
        }
        await updateProductInFirestore(id, {
            name: formData.get('name'),
            description: formData.get('description'),
            price: parseInt(formData.get('price')),
            category: formData.get('category'),
            image: imageUrl,
            type: formData.get('type'),
            mostLiked: formData.get('mostLiked') === 'on'
        });
        selectedImageFile = null;
        if (cropper) { cropper.destroy(); cropper = null; }
        cancelProductForm();
    } catch (error) {
        console.error('Update error:', error);
        showToast(error.message || 'Update failed', 'error');
    } finally {
        btn.disabled = false; btn.innerText = 'Update Product';
    }
}

async function deleteProduct(id) {
    if (!confirm('Are you sure you want to delete this design?')) return;
    try { await deleteProductFromFirestore(id); } catch (error) { console.error(error); }
}

async function toggleMostLiked(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;
    try { await updateProductInFirestore(id, { mostLiked: !product.mostLiked }); } catch (error) { console.error(error); }
}

function renderMostLikedTab(content) {
    const mostLiked = products.filter(p => p.mostLiked);
    if (mostLiked.length === 0) {
        content.innerHTML = '<p style="color:var(--text-light);padding:1rem;text-align:center;">No products marked as Most Liked yet.</p>';
        return;
    }
    content.innerHTML = `
        <div class="product-grid">
            ${mostLiked.map(product => `
                <div class="product-card">
                    <div class="product-image-container">
                        <img src="${product.image}" alt="${product.name}" class="product-image loaded" onclick="openImageViewer('${product.image}','${product.name}')">
                        <div class="price-badge">₹${product.price.toLocaleString('en-IN')}</div>
                    </div>
                    <div class="product-info">
                        <div class="product-category">${product.category}</div>
                        <h3 class="product-name">${product.name}</h3>
                        <p class="product-description">${product.description}</p>
                        <button onclick="toggleMostLiked('${product.id}')" class="btn btn-outline" style="width:100%;margin-top:0.75rem;font-size:0.8rem;">Remove from Most Liked</button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function renderBannerTab(content) {
    content.innerHTML = `
        <div>
            <h3 style="font-size:1rem;font-weight:700;margin-bottom:1rem;">Banner Background Image</h3>
            <div style="background:var(--bg);padding:0.875rem;border-radius:8px;margin-bottom:1rem;">
                <h4 style="font-weight:600;font-size:0.8rem;margin-bottom:0.5rem;color:var(--text-light);">CURRENT BANNER</h4>
                <img src="${bannerImage}" alt="Current banner" onclick="openImageViewer('${bannerImage}','Banner Image')" style="width:100%;max-height:180px;object-fit:cover;border-radius:8px;cursor:pointer;">
            </div>
            <div style="border:1.5px solid var(--border);padding:1rem;border-radius:8px;">
                <h4 style="font-weight:600;font-size:0.8rem;margin-bottom:0.75rem;">UPLOAD NEW BANNER</h4>
                <input type="file" accept="image/*" onchange="handleImageUpload(event,'banner')" style="margin-bottom:0.75rem;">
                <div style="text-align:center;margin:0.75rem 0;color:var(--text-muted);font-size:0.8rem;">— OR —</div>
                <div class="form-group">
                    <label>Image URL</label>
                    <input type="text" value="${bannerImage}" onchange="updateBannerUrl(this.value)" placeholder="https://...">
                </div>
            </div>
        </div>
    `;
}

function updateBannerUrl(url) {
    bannerImage = url;
    saveToLocalStorage();
    updateBanner();
    showToast('Banner updated', 'success');
}

async function handleImageUpload(event, type) {
    const file = event.target.files[0];
    if (!file || !file.type.startsWith('image/')) { showToast('Please upload an image file', 'error'); return; }
    if (type === 'banner') {
        try {
            showToast('Uploading banner...', 'info');
            const url = await uploadToFirebase(file);
            bannerImage = url;
            saveToLocalStorage();
            updateBanner();
            showToast('Banner updated successfully', 'success');
            renderBannerTab(document.getElementById('admin-content'));
        } catch (e) { console.error(e); }
    }
}

function renderFeedbacksTab(content) {
    if (feedbacks.length === 0) {
        content.innerHTML = '<p style="color:var(--text-light);padding:1rem;text-align:center;">No feedbacks received yet.</p>';
        return;
    }
    content.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:0.875rem;">
            ${feedbacks.map(feedback => `
                <div style="border:1px solid var(--border);border-radius:10px;padding:1rem;background:white;">
                    <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:0.75rem;gap:1rem;flex-wrap:wrap;">
                        <div>
                            <h4 style="font-weight:700;font-size:0.95rem;">${feedback.name}</h4>
                            <p style="font-size:0.8rem;color:var(--text-light);">${feedback.email} · ${feedback.phone}</p>
                            <p style="font-size:0.75rem;color:var(--text-muted);margin-top:0.2rem;">${new Date(feedback.timestamp).toLocaleString('en-IN')}</p>
                        </div>
                        <button onclick="deleteFeedback('${feedback.id}')" class="btn btn-outline" style="padding:0.2rem 0.5rem;font-size:0.8rem;color:var(--danger);">Delete</button>
                    </div>
                    <p style="font-size:0.875rem;">${feedback.message}</p>
                </div>
            `).join('')}
        </div>
    `;
}

function deleteFeedback(id) {
    if (!confirm('Delete this feedback?')) return;
    feedbacks = feedbacks.filter(f => f.id !== id);
    saveToLocalStorage();
    showToast('Feedback deleted', 'success');
    renderFeedbacksTab(document.getElementById('admin-content'));
    const tabs = document.querySelectorAll('.admin-tab');
    if (tabs[3]) tabs[3].textContent = `Feedbacks (${feedbacks.length})`;
}

// ================================
// FEEDBACK MODAL
// ================================
function openFeedbackModal() { document.getElementById('feedback-modal').classList.remove('hidden'); }
function closeFeedbackModal() {
    document.getElementById('feedback-modal').classList.add('hidden');
    document.getElementById('feedback-form').reset();
}

function submitFeedback(event) {
    event.preventDefault();
    feedbacks.unshift({
        id: Date.now().toString(),
        name: document.getElementById('feedback-name').value,
        email: document.getElementById('feedback-email').value,
        phone: document.getElementById('feedback-phone').value,
        message: document.getElementById('feedback-message').value,
        timestamp: Date.now()
    });
    saveToLocalStorage();
    showToast("Thank you for your feedback! We'll be in touch.", 'success');
    setTimeout(closeFeedbackModal, 1500);
}

// ================================
// IMAGE VIEWER
// ================================
function openImageViewer(url, name) {
    const modal = document.getElementById('image-viewer-modal');
    document.getElementById('image-viewer-title').textContent = name;
    document.getElementById('viewer-image').src = url;
    currentZoom = 100;
    modal.classList.remove('hidden');
}

function closeImageViewer() { document.getElementById('image-viewer-modal').classList.add('hidden'); }

function downloadImage() {
    const img = document.getElementById('viewer-image');
    const link = document.createElement('a');
    link.href = img.src;
    link.download = document.getElementById('image-viewer-title').textContent + '.jpg';
    link.click();
}

// ================================
// TOAST
// ================================
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ================================
// INITIALIZATION
// ================================
window.onload = () => {
    checkAuthState();
    loadProductsFromFirestore();
    updatePinnedBadge();
    updateBanner();
    initSearch();
    document.getElementById('current-year').textContent = new Date().getFullYear();

    document.getElementById('admin-modal').addEventListener('click', (e) => { if (e.target.id === 'admin-modal') closeAdminModal(); });
    document.getElementById('feedback-modal').addEventListener('click', (e) => { if (e.target.id === 'feedback-modal') closeFeedbackModal(); });
    document.getElementById('image-viewer-modal').addEventListener('click', (e) => { if (e.target.id === 'image-viewer-modal') closeImageViewer(); });

    console.log('🪵 Shri Vishwakarma Wood Works — Loaded');
};
