// ================================
// 🔥 FIREBASE CONFIGURATION SECTION
// ================================
// Uncomment this section when Firebase is configured in index.html


// Check if Firebase is available
/*const useFirebase = typeof firebase !== 'undefined';

if (useFirebase) {
    console.log('✅ Firebase is connected');
} else {
    console.log('⚠️  Firebase not configured - using localStorage only');
}
*/

const useFirebase = true; // Change to true when Firebase is configured

// ================================
// CONFIGURATION & CONSTANTS
// ================================
const IMGBB_API_KEY = "fa8bcd6d876fa88264839b2e06dbda86";

const DEFAULT_BANNER = "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=1600&h=600&fit=crop";

// ================================
// DATA INITIALIZATION
// ================================

// Initialize data from localStorage or use defaults
let products = JSON.parse(localStorage.getItem('vishwakarma-products')) || getDefaultProducts();
let feedbacks = JSON.parse(localStorage.getItem('vishwakarma-feedbacks')) || [];
let pinnedDesigns = JSON.parse(localStorage.getItem('vishwakarma-pinned')) || [];
let bannerImage = localStorage.getItem('vishwakarma-banner') || DEFAULT_BANNER;
let selectedCategory = 'All';
let currentZoom = 100;
let isAdminAuthenticated = false;

let selectedImageFile = null;
let cropper = null;

 
function handleImagePreview(event) {
    const file = event.target.files[0];
    if (!file) return;
 
    if (!file.type.startsWith("image/")) {
        showToast("Select a valid image", "error");
        return;
    }
 
    selectedImageFile = file;
 
    const preview = document.getElementById("image-preview");
    preview.src = URL.createObjectURL(file);
    preview.style.display = "block";
 
    // Destroy old cropper if exists
    if (cropper) {
        cropper.destroy();
    }
 
    // Initialize cropper
    cropper = new Cropper(preview, {
    aspectRatio: 4 / 3,
    viewMode: 1,
    autoCropArea: 1,
    responsive: true,
    background: false,
    zoomable: true,
    movable: true,
    scalable: false,
});
}


async function uploadToImgBB(file) {
    const formData = new FormData();
    formData.append("image", file);
 
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: "POST",
        body: formData
    });
 
    const data = await response.json();
 
    if (data.success) {
        return data.data.url;
    } else {
        console.error(data);
        throw new Error("Image upload failed");
    }
}

// Default products
function getDefaultProducts() {
    return [
        {
            id: "1",
            name: "Classic Wooden Bed",
            description: "Elegant teak wood bed with intricate carvings",
            price: 45000,
            category: "Beds",
            image: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=600",
            type: "previous-work",
            mostLiked: true
        },
        {
            id: "2",
            name: "Modern Wardrobe",
            description: "Spacious wardrobe with mirror and sliding doors",
            price: 38000,
            category: "Almirah",
            image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600",
            type: "previous-work",
            mostLiked: false
        },
        {
            id: "3",
            name: "Designer Main Door",
            description: "Handcrafted main door with traditional designs",
            price: 55000,
            category: "Doors",
            image: "https://images.unsplash.com/photo-1540079769940-274ed82e6ae7?w=600",
            type: "inspiration",
            mostLiked: false
        },
        {
            id: "4",
            name: "Modular Kitchen",
            description: "Complete modular kitchen with premium finish",
            price: 125000,
            category: "Kitchens",
            image: "https://images.unsplash.com/photo-1556911220-bff31c812dba?w=600",
            type: "inspiration",
            mostLiked: true
        },
        {
            id: "5",
            name: "LED Panel Wall Unit",
            description: "Modern LED panel with storage",
            price: 32000,
            category: "LED Panels",
            image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600",
            type: "previous-work",
            mostLiked: false
        },
        {
            id: "6",
            name: "Luxury Dressing Table",
            description: "Elegant dressing table with mirror and drawers",
            price: 28000,
            category: "Dressing Tables",
            image: "https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=600",
            type: "inspiration",
            mostLiked: false
        }
    ];
}

// ================================
// 🔥 FIREBASE FUNCTIONS
// ================================

// ✅ SECTION 1: Load Products from Firestore
function loadProductsFromFirestore() {
    if (!useFirebase) {
        console.log('Using localStorage for products');
        return;
    }
    
    // UNCOMMENT THIS WHEN FIREBASE IS READY:
    
    // Real-time listener for products
    db.collection('products').onSnapshot((snapshot) => {
        products = [];
        snapshot.forEach((doc) => {
            products.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Update localStorage as backup
        saveToLocalStorage();
        
        // Re-render UI
        renderCategories();
        renderProducts();
        const adminContent = document.getElementById('admin-content');
        if(adminContent){
            renderProductsTab(adminContent);
        }
        
        console.log('✅ Products synced from Firestore:', products.length);
    }, (error) => {
        console.error('❌ Error loading products from Firestore:', error);
        showToast('Failed to sync products', 'error');
    });
    
    
}

// ✅ SECTION 2: Add Product to Firestore
async function addProductToFirestore(productData) {
    if (!useFirebase) {
        // Use localStorage only
        const newProduct = {
            ...productData,
            id: Date.now().toString(),
        };
        products.push(newProduct);
        saveToLocalStorage();
        return newProduct;
    }
    
    // UNCOMMENT THIS WHEN FIREBASE IS READY:
    
    try {
        const docRef = await db.collection('products').add({
            ...productData,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('✅ Product added to Firestore with ID:', docRef.id);
        showToast('Product added successfully', 'success');
        return { id: docRef.id, ...productData };
        
    } catch (error) {
        console.error('❌ Error adding product to Firestore:', error);
        showToast('Failed to add product', 'error');
        throw error;
    }
    
    
}

// ✅ SECTION 3: Update Product in Firestore
async function updateProductInFirestore(id, updates) {
    if (!useFirebase) {
        // Use localStorage only
        const index = products.findIndex(p => p.id === id);
        if (index !== -1) {
            products[index] = { ...products[index], ...updates };
            saveToLocalStorage();
        }
        return;
    }
    
    // UNCOMMENT THIS WHEN FIREBASE IS READY:
    
    try {
        await db.collection('products').doc(id).update({
            ...updates,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('✅ Product updated in Firestore');
        showToast('Product updated successfully', 'success');
        
    } catch (error) {
        console.error('❌ Error updating product in Firestore:', error);
        showToast('Failed to update product', 'error');
        throw error;
    }
    
    
}

// ✅ SECTION 4: Delete Product from Firestore
async function deleteProductFromFirestore(id) {
    if (!useFirebase) {
        // Use localStorage only
        products = products.filter(p => p.id !== id);
        saveToLocalStorage();
        return;
    }
    
    // UNCOMMENT THIS WHEN FIREBASE IS READY:
    
    try {
        await db.collection('products').doc(id).delete();
        
        console.log('✅ Product deleted from Firestore');
        showToast('Product deleted successfully', 'success');
        
    } catch (error) {
        console.error('❌ Error deleting product from Firestore:', error);
        showToast('Failed to delete product', 'error');
        throw error;
    }
    

}

// ================================
// 🔐 FIREBASE AUTHENTICATION SECTION
// ================================

// ✅ SECTION 5: Admin Login with Firebase Auth
async function loginWithFirebase(email, password) {
    if (!useFirebase) {
        return false;
    }
    
    /* UNCOMMENT THIS WHEN FIREBASE AUTH IS READY:
    
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        console.log('✅ Admin logged in:', user.email);
        isAdminAuthenticated = true;
        return true;
        
    } catch (error) {
        console.error('❌ Login error:', error.message);
        return false;
    }
    
    */
}

// ✅ SECTION 6: Check Auth State
function checkAuthState() {
    auth.onAuthStateChanged((user) => {
        if (user) {
            console.log("✅ User is logged in:", user.email);
            isAdminAuthenticated = true;
        } else {
            console.log("❌ User is logged out");
            isAdminAuthenticated = false;
        }
    });
}

// ✅ SECTION 7: Admin Logout
async function logoutFirebase() {
    try {
        await auth.signOut();
        isAdminAuthenticated = false;
        closeAdminModal();
        showToast('Logged out successfully', 'success');
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// ================================
// LOCAL STORAGE FUNCTIONS
// ================================

function saveToLocalStorage() {
    localStorage.setItem('vishwakarma-products', JSON.stringify(products));
    localStorage.setItem('vishwakarma-feedbacks', JSON.stringify(feedbacks));
    localStorage.setItem('vishwakarma-pinned', JSON.stringify(pinnedDesigns));
    localStorage.setItem('vishwakarma-banner', bannerImage);
}

// ================================
// UI RENDERING FUNCTIONS
// ================================

function renderCategories() {
    const container = document.getElementById('category-buttons');
    const categories = ['All', 'Beds', 'Almirah', 'Doors', 'Kitchens', 'LED Panels', 'Dressing Tables', 'Study Tables', 'Tables'];
    const mostLikedCount = products.filter(p => p.mostLiked).length;
    
    let html = '';
    
    categories.forEach(category => {
        const isActive = category === selectedCategory;
        html += `
            <button 
                class="category-btn ${isActive ? 'active' : ''}" 
                onclick="selectCategory('${category}')"
            >
                ${category}
            </button>
        `;
    });
    
    // Add Most Liked category if there are any
    if (mostLikedCount > 0) {
        const isActive = selectedCategory === 'Most Liked';
        html += `
            <button 
                class="category-btn most-liked ${isActive ? 'active' : ''}" 
                onclick="selectCategory('Most Liked')"
            >
                <svg class="icon-small" viewBox="0 0 24 24" fill="${isActive ? 'white' : '#f59e0b'}" stroke="currentColor">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
                Most Liked
                <span class="category-badge">${mostLikedCount}</span>
            </button>
        `;
    }
    
    container.innerHTML = html;
}

function filterProducts(type) {
    let filtered = products.filter(p => p.type === type);
    
    if (selectedCategory === 'All') {
        return filtered;
    } else if (selectedCategory === 'Most Liked') {
        return filtered.filter(p => p.mostLiked);
    } else {
        return filtered.filter(p => p.category === selectedCategory);
    }
}

function renderProducts() {
    const previousWorks = filterProducts('previous-work');
    const inspirations = filterProducts('inspiration');
    
    // Render Previous Works (show only first 4)
    const previousGrid = document.getElementById('previous-works-grid');
    const displayedPrevious = previousWorks.slice(0, 4);
    
    if (displayedPrevious.length > 0) {
        previousGrid.innerHTML = displayedPrevious.map(product => createProductCard(product)).join('');
    } else {
        previousGrid.innerHTML = '<p class="text-center p-4" style="grid-column: 1/-1; color: var(--text-light); font-size: 0.875rem;">No previous works in this category yet.</p>';
    }
    
    // Show/hide View All button for previous works
    const viewAllPrevious = document.getElementById('view-all-previous');
    const previousCount = document.getElementById('previous-count');
    if (previousWorks.length > 4) {
        viewAllPrevious.classList.remove('hidden');
        previousCount.textContent = `(${previousWorks.length})`;
    } else {
        viewAllPrevious.classList.add('hidden');
    }
    
    // Render Inspirations (show only first 4)
    const inspirationsGrid = document.getElementById('inspirations-grid');
    const displayedInspirations = inspirations.slice(0, 4);
    
    if (displayedInspirations.length > 0) {
        inspirationsGrid.innerHTML = displayedInspirations.map(product => createProductCard(product)).join('');
    } else {
        inspirationsGrid.innerHTML = '<p class="text-center p-4" style="grid-column: 1/-1; color: var(--text-light); font-size: 0.875rem;">No inspiration designs in this category yet.</p>';
    }
    
    // Show/hide View All button for inspirations
    const viewAllInspirations = document.getElementById('view-all-inspirations');
    const inspirationCount = document.getElementById('inspiration-count');
    if (inspirations.length > 4) {
        viewAllInspirations.classList.remove('hidden');
        inspirationCount.textContent = `(${inspirations.length})`;
    } else {
        viewAllInspirations.classList.add('hidden');
    }
}

function createProductCard(product) {
    const isPinned = pinnedDesigns.some(item => item.product.id === product.id);
    
    return `
        <div class="product-card" onclick="viewProduct('${product.id}')">
            <div class="product-image-container">
                <img src="${product.thumbnail || product.image}" alt="${product.name}" class="product-image">
                <div class="price-badge">₹${product.price.toLocaleString('en-IN')}</div>
                <button 
                    class="pin-btn ${isPinned ? 'pinned' : ''}" 
                    onclick="togglePin(event, '${product.id}')"
                    title="${isPinned ? 'Unpin' : 'Pin'} this design"
                >
                    <svg class="icon-small" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
    hero.style.backgroundImage = `url(${bannerImage})`;
}

function updatePinnedBadge() {
    const badge = document.getElementById('pinned-badge');
    const count = pinnedDesigns.length;
    
    if (count > 0) {
        badge.textContent = count;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

// ================================
// EVENT HANDLERS
// ================================

function selectCategory(category) {
    selectedCategory = category;
    renderCategories();
    renderProducts();
}

function togglePin(event, productId) {
    event.stopPropagation();
    
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const existingIndex = pinnedDesigns.findIndex(item => item.product.id === productId);
    
    if (existingIndex !== -1) {
        pinnedDesigns.splice(existingIndex, 1);
        showToast('Design unpinned');
    } else {
        pinnedDesigns.push({ product, pinnedAt: Date.now() });
        showToast('Design pinned successfully', 'success');
    }
    
    saveToLocalStorage();
    updatePinnedBadge();
    renderProducts();
}

function viewProduct(productId) {
    const product = products.find(p => p.id === productId);
    if (product) {
        openImageViewer(product.image, product.name);
    }
}

function viewAllSection(type) {
    let filtered = products.filter(p => p.type === type);
 
    if (selectedCategory !== 'All') {
        filtered = filtered.filter(p => p.category === selectedCategory);
    }
 
    const modal = document.createElement('div');
    modal.className = 'modal';
 
    modal.innerHTML = `
        <div class="modal-content modal-large">
            <div class="modal-header">
                <h2>${type === 'previous-work' ? 'All Previous Works' : 'All Inspirations'}</h2>
                <button onclick="this.closest('.modal').remove()" class="close-btn">&times;</button>
            </div>
            <div class="modal-body">
                <div class="product-grid">
                    ${filtered.map(p => createProductCard(p)).join('')}
                </div>
            </div>
        </div>
    `;
 
    document.body.appendChild(modal);
 
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

function showPinnedDesigns() {
    if (pinnedDesigns.length === 0) {
        showToast('No designs pinned yet');
        return;
    }
    
    const totalEstimate = pinnedDesigns.reduce((sum, item) => sum + item.product.price, 0);
    
    // Generate WhatsApp message
    const whatsappMessage = `Hello! I'm interested in these designs from Shri Vishwakarma Wood Works:\n\n${pinnedDesigns.map((item, idx) => `${idx + 1}. ${item.product.name} - ₹${item.product.price.toLocaleString('en-IN')}`).join('\n')}\n\nEstimated Total: ₹${totalEstimate.toLocaleString('en-IN')}\n\nI'd like to discuss pricing and other details.`;
    
    // Generate Email body
    const emailBody = pinnedDesigns.map((item, idx) => `${idx + 1}. ${item.product.name} (₹${item.product.price.toLocaleString('en-IN')})`).join('%0D%0A');
    
    let html = `
        <div style="max-height: 60vh; overflow-y: auto;">
            <h3 style="margin-bottom: 1rem; font-size: 1.25rem; font-weight: 600;">Pinned Designs (${pinnedDesigns.length})</h3>
            
            <!-- Pinned Items List -->
            <div style="display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1.5rem;">
                ${pinnedDesigns.map(item => `
                    <div style="display: flex; gap: 1rem; padding: 0.75rem; border: 1px solid var(--border); border-radius: 0.5rem; background: white;">
                        <img src="${item.product.image}" alt="${item.product.name}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 0.375rem; cursor: pointer;" onclick="openImageViewer('${item.product.image}', '${item.product.name}')">
                        <div style="flex: 1;">
                            <h4 style="font-weight: 600; margin-bottom: 0.25rem;">${item.product.name}</h4>
                            <p style="font-size: 0.875rem; color: var(--text-light); margin-bottom: 0.25rem;">${item.product.category}</p>
                            <p style="font-size: 0.875rem; color: var(--text-light);">${item.product.description}</p>
                        </div>
                        <div style="display: flex; flex-direction: column; justify-content: space-between; align-items: flex-end;">
                            <div style="font-weight: bold; color: var(--primary);">₹${item.product.price.toLocaleString('en-IN')}</div>
                            <button onclick="removeFromPinnedInModal('${item.product.id}')" style="padding: 0.25rem 0.5rem; background: none; border: none; color: var(--danger); cursor: pointer; font-size: 0.875rem;">Remove</button>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <!-- Summary -->
            <div style="border: 1px solid var(--border); border-radius: 0.5rem; padding: 1rem; background: var(--bg);">
                <h4 style="font-weight: 600; margin-bottom: 0.75rem;">Summary</h4>
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.875rem;">
                    <span>Total Designs:</span>
                    <span style="font-weight: 500;">${pinnedDesigns.length}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding-top: 0.5rem; border-top: 1px solid var(--border); font-size: 1.125rem; font-weight: bold;">
                    <span>Estimated Total:</span>
                    <span style="color: var(--primary);">₹${totalEstimate.toLocaleString('en-IN')}</span>
                </div>
                
                <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 0.5rem; padding: 0.75rem; margin: 1rem 0; font-size: 0.875rem; color: #92400e;">
                    <strong>Note:</strong> This is an estimated price. Final pricing may vary based on customization, materials, and dimensions. Contact us for an accurate quote.
                </div>
                
                <!-- Contact Buttons -->
                <div style="display: grid; grid-template-columns: 1fr; gap: 0.75rem; margin-top: 1rem;">
                    <a href="https://wa.me/917082702447?text=${encodeURIComponent(whatsappMessage)}" target="_blank" style="display: flex; align-items: center; justify-content: center; gap: 0.5rem; background: #25D366; color: white; padding: 0.75rem 1rem; border-radius: 0.5rem; text-decoration: none; font-weight: 500; transition: all 0.2s;">
                        <svg style="width: 20px; height: 20px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                        </svg>
                        Send via WhatsApp
                    </a>
                    
                    <a href="mailto:jangranaman337@gmail.com?subject=Inquiry about Selected Designs&body=Hi,%0D%0A%0D%0AI'm interested in the following designs from your gallery:%0D%0A%0D%0A${emailBody}%0D%0A%0D%0AEstimated Total: ₹${totalEstimate.toLocaleString('en-IN')}%0D%0A%0D%0APlease provide more details.%0D%0A%0D%0AThank you!" style="display: flex; align-items: center; justify-content: center; gap: 0.5rem; background: white; color: var(--primary); padding: 0.75rem 1rem; border: 1px solid var(--primary); border-radius: 0.5rem; text-decoration: none; font-weight: 500; transition: all 0.2s;">
                        <svg style="width: 16px; height: 16px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                            <polyline points="22,6 12,13 2,6"></polyline>
                        </svg>
                        Send via Email
                    </a>
                    
                    <a href="tel:+917082702447" style="display: flex; align-items: center; justify-content: center; gap: 0.5rem; background: var(--primary); color: white; padding: 0.75rem 1rem; border-radius: 0.5rem; text-decoration: none; font-weight: 500; transition: all 0.2s;">
                        <svg style="width: 16px; height: 16px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                        </svg>
                        Call Now
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
                <button onclick="this.closest('.modal').remove()" class="close-btn">&times;</button>
            </div>
            <div class="modal-body">
                ${html}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

function removeFromPinnedInModal(productId) {
    pinnedDesigns = pinnedDesigns.filter(item => item.product.id !== productId);
    saveToLocalStorage();
    updatePinnedBadge();
    
    // Close and reopen modal to refresh
    document.querySelector('.modal')?.remove();
    
    if (pinnedDesigns.length > 0) {
        showPinnedDesigns();
    } else {
        showToast('All designs removed');
    }
}

let logoClickCount = 0;
let logoClickTimer;

function handleLogoClick() {
    logoClickCount++;
    
    clearTimeout(logoClickTimer);
    logoClickTimer = setTimeout(() => {
        logoClickCount = 0;
    }, 2000);
    
    if (logoClickCount >= 5) {
        openAdminModal();
        logoClickCount = 0;
    }
}

// ================================
// ADMIN MODAL FUNCTIONS
// ================================

function openAdminModal() {
    const modal = document.getElementById('admin-modal');
    modal.classList.remove('hidden');
    
    if (!auth.currentUser){
        renderAdminLogin();
    }else{
        renderAdminPanel();
    }
}

function closeAdminModal(){
    const modal = document.getElementById('admin-modal');
    modal.classList.add('hidden');
    //Force Logout
    if(auth.currentUser){
        auth.signOut();
    }
    isAdminAuthenticated = false;
}
function renderAdminLogin() {
    const title = document.getElementById('admin-title');
    const body = document.getElementById('admin-body');
    
    title.textContent = 'Admin Access';
    body.innerHTML = `
    <form onsubmit="handleFirebaseLogin(event)" style="max-width: 400px; margin: 0 auto;">
        
        <div class="form-group">
            <label>Email</label>
            <input type="email" id="admin-email" required placeholder="Enter admin email">
        </div>
 
        <div class="form-group">
            <label>Password</label>
            <input type="password" id="admin-password" required placeholder="Enter password">
        </div>
 
        <button type="submit" class="btn btn-primary" style="width: 100%;">
            Login
        </button>
    </form>
`;
}


// 🔐 FIREBASE AUTH LOGIN HANDLER
async function handleFirebaseLogin(event) {
    event.preventDefault();
 
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;
 
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
 
        console.log("✅ Logged in:", user.email);
 
        isAdminAuthenticated = true;
        renderAdminPanel();
        showToast('Login successful', 'success');
 
    } catch (error) {
        console.error("❌ Login error:", error.message);
        showToast('Invalid email or password', 'error');
    }
}

function renderAdminPanel() {
    const title = document.getElementById('admin-title');
    const body = document.getElementById('admin-body');
    
    title.textContent = 'Admin Panel';
    body.innerHTML = `
        <div style="margin-bottom: 1rem; display: flex; justify-content: flex-end; gap: 0.5rem;">
            <button onclick="logoutFirebase(); isAdminAuthenticated = false; closeAdminModal();" class="btn btn-outline" style="font-size: 0.875rem;">Logout</button>
        </div>
        <div class="admin-tabs">
            <button class="admin-tab active" onclick="switchAdminTab(event, 'products')">Manage Products</button>
            <button class="admin-tab" onclick="switchAdminTab(event, 'mostLiked')">Most Liked (${products.filter(p => p.mostLiked).length})</button>
            <button class="admin-tab" onclick="switchAdminTab(event, 'banner')">Banner Image</button>
            <button class="admin-tab" onclick="switchAdminTab(event, 'feedbacks')">Feedbacks (${feedbacks.length})</button>
        </div>
        <div id="admin-content"></div>
    `;
    
    switchAdminTab(null, 'products');
}

function switchAdminTab(event, tab) {
    // Update tab buttons
    document.querySelectorAll('.admin-tab').forEach(btn => {
        btn.classList.remove('active');
    });
    if (event) {
        event.target.classList.add('active');
    } else {
        document.querySelector('.admin-tab').classList.add('active');
    }
    
    const content = document.getElementById('admin-content');
    
    switch(tab) {
        case 'products':
            renderProductsTab(content);
            break;
        case 'mostLiked':
            renderMostLikedTab(content);
            break;
        case 'banner':
            renderBannerTab(content);
            break;
        case 'feedbacks':
            renderFeedbacksTab(content);
            break;
    }
}

function renderProductsTab(content) {
    content.innerHTML = `
        <div style="margin-bottom: 1.5rem;">
            <button onclick="showAddProductForm()" class="btn btn-primary">Add New Design</button>
        </div>
        <div id="product-form-container"></div>
        <div style="overflow-x: auto;">
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Image</th>
                        <th>Name</th>
                        <th>Category</th>
                        <th>Type</th>
                        <th>Price</th>
                        <th>Most Liked</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${products.map(product => `
                        <tr>
                            <td><img src="${product.thumbnail || product.image}" alt="${product.name}" onclick="openImageViewer('${product.thumbnail || product.image}', '${product.name}')"></td>
                            <td>${product.name}</td>
                            <td>${product.category}</td>
                            <td><span class="type-badge ${product.type === 'previous-work' ? 'type-previous' : 'type-inspiration'}">${product.type === 'previous-work' ? 'Previous Work' : 'Inspiration'}</span></td>
                            <td>₹${product.price.toLocaleString('en-IN')}</td>
                            <td>
                                <button onclick="toggleMostLiked('${product.id}')" class="btn ${product.mostLiked ? 'btn-primary' : 'btn-outline'}" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">
                                    <svg class="icon-small" viewBox="0 0 24 24" fill="${product.mostLiked ? 'currentColor' : 'none'}" stroke="currentColor">
                                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                    </svg>
                                </button>
                            </td>
                            <td>
                                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                                    <button onclick="editProduct('${product.id}')" class="btn btn-outline" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">Edit</button>
                                    <button onclick="deleteProduct('${product.id}')" class="btn btn-outline" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; color: var(--danger);">Delete</button>
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
    const container = document.getElementById('product-form-container');
    container.innerHTML = `
        <div style="background: var(--bg); padding: 1rem; border-radius: 0.5rem; margin-bottom: 1.5rem;">
            <h3 style="margin-bottom: 1rem; font-size: 1.125rem; font-weight: 600;">Add New Design</h3>
            <form onsubmit="saveProduct(event)" id="product-form">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                    <div class="form-group">
                        <label>Name *</label>
                        <input type="text" name="name" required>
                    </div>
                    <div class="form-group">
                        <label>Price (₹) *</label>
                        <input type="number" name="price" required>
                    </div>
                    <div class="form-group">
                        <label>Category *</label>
                        <select name="category" required>
                            <option value="Beds">Beds</option>
                            <option value="Almirah">Almirah</option>
                            <option value="Doors">Doors</option>
                            <option value="Kitchens">Kitchens</option>
                            <option value="LED Panels">LED Panels</option>
                            <option value="Dressing Tables">Dressing Tables</option>
                            <option value="Study Tables">Study Tables</option>
                            <option value="Tables">Tables</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Type *</label>
                        <select name="type" required>
                            <option value="previous-work">Previous Work</option>
                            <option value="inspiration">Inspiration</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label>Description *</label>
                    <textarea name="description" required rows="3"></textarea>
                </div>
                <div class="form-group">
    <div class="form-group">
    <label>Upload Image *</label>
    <input type="file" id="image-input" accept="image/*" required onchange="handleImagePreview(event)">
</div>
 
<div class="form-group">
    <label>Crop Image</label>
 
    <img id="image-preview" style="max-width: 100%; display: none;" />
 
</div>



            
                <div class="form-group">
                    <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                        <input type="checkbox" name="mostLiked" style="width: auto; min-height: auto;">
                        <span>Mark as Most Liked</span>
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



/*function handleImageUpload(event, type) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        showToast('Please upload an image file', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onloadend = () => {
        const imageUrl = reader.result;
        
        if (type === 'product') {
            const form = document.getElementById('product-form');
            const imageInput = form.querySelector('input[name="image"]');
            imageInput.value = imageUrl;
            updateImagePreview(imageUrl);
        } else if (type === 'banner') {
            bannerImage = imageUrl;
            saveToLocalStorage();
            updateBanner();
            showToast('Banner updated successfully', 'success');
            renderBannerTab(document.getElementById('admin-content'));
        }
    };
    
    reader.readAsDataURL(file);
}*/

/*function updateImagePreview(url) {
    const preview = document.getElementById('image-preview');
    if (url) {
        preview.style.display = 'block';
        preview.querySelector('img').src = url;
    } else {
        preview.style.display = 'none';
    }
}*/

async function saveProduct(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const btn = form.querySelector("button[type='submit']");
    btn.disabled = true;
    btn.innerText = "saving..";
    // 🔥 Check if image selected
if (!selectedImageFile) {
    showToast("Please upload an image", "error");
    return;
}

// 🔥 Upload image to ImgBB
// 🔥 Check cropper

 
showToast("Processing image...", "info");
 
// 🔹 Upload original image FIRST
const originalUrl = await uploadToImgBB(selectedImageFile);
 
// 🔹 Default thumbnail = original
let thumbnailUrl = originalUrl;
 
// 🔹 If cropper exists → create cropped version
if (cropper) {
    const canvas = cropper.getCroppedCanvas({
        width: 800,
        height: 600
    });
 
    const blob = await new Promise(resolve => {
        canvas.toBlob(resolve, "image/jpeg", 0.7);
    });
 
    thumbnailUrl = await uploadToImgBB(blob);
}
    const productData = {
        name: formData.get('name'),
        description: formData.get('description'),
        price: parseInt(formData.get('price')),
        category: formData.get('category'),
        image: originalUrl,
        thumbnail: thumbnailUrl,
        type: formData.get('type'),
        mostLiked: formData.get('mostLiked') === 'on'
    };
    
    // 🔥 Use Firebase or localStorage
   try {
    await addProductToFirestore(productData);
 
    if (!useFirebase) {
        renderProductsTab(document.getElementById('admin-content'));
        renderProducts();
        renderCategories();
        btn.disabled = false;
        btn.innerText = "Save Product";
    }
 
    showToast('Product added successfully', 'success');
 
    // 🔥 ADD THIS BLOCK HERE
    document.getElementById("product-form").reset();
    selectedImageFile = null;
 
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
 
    const preview = document.getElementById("image-preview");
    if (preview) {
        preview.src = "";
        preview.style.display = "none";
    }
 
} catch (error) {
    console.error('Error saving product:', error);
    btn.disabled = false;
    btn.innerText = "Save Product";
}
}

function cancelProductForm() {
    document.getElementById('product-form-container').innerHTML = '';
}

function editProduct(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;
    
    const container = document.getElementById('product-form-container');
    container.innerHTML = `
        <div style="background: var(--bg); padding: 1rem; border-radius: 0.5rem; margin-bottom: 1.5rem;">
            <h3 style="margin-bottom: 1rem; font-size: 1.125rem; font-weight: 600;">Edit Design</h3>
            <form onsubmit="updateProduct(event, '${id}')" id="product-form">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                    <div class="form-group">
                        <label>Name *</label>
                        <input type="text" name="name" value="${product.name}" required>
                    </div>
                    <div class="form-group">
                        <label>Price (₹) *</label>
                        <input type="number" name="price" value="${product.price}" required>
                    </div>
                    <div class="form-group">
                        <label>Category *</label>
                        <select name="category" required>
                            ${['Beds', 'Almirah', 'Doors', 'Kitchens', 'LED Panels', 'Dressing Tables', 'Study Tables', 'Tables'].map(cat => 
                                `<option value="${cat}" ${product.category === cat ? 'selected' : ''}>${cat}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Type *</label>
                        <select name="type" required>
                            <option value="previous-work" ${product.type === 'previous-work' ? 'selected' : ''}>Previous Work</option>
                            <option value="inspiration" ${product.type === 'inspiration' ? 'selected' : ''}>Inspiration</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label>Description *</label>
                    <textarea name="description" required rows="3">${product.description}</textarea>
                </div>
                <div class="form-group">
    <label>Product Image URL *</label>

    <input type = "file" accept = "image/*"
    onchange = "handleImagePreview(event)">
    <img src = "${product.image}" id="image-preview"
    style="max-widht:100% margin-top:10px;">
    <p style="font-size: 0.75rem; color: var(--text-light); margin-top: 0.25rem;">
        Example: https://i.ibb.co/abcd123/bed.jpg
    </p>
</div>

                <div class="form-group">
                    <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                        <input type="checkbox" name="mostLiked" ${product.mostLiked ? 'checked' : ''} style="width: auto; min-height: auto;">
                        <span>Mark as Most Liked</span>
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
    let imageUrl = products.find(p =>p.id === id).image;
    if(selectedImageFile){
        imageUrl = await uploadToImgBB(selectedImageFile);
    }
    
    const updates = {
        name: formData.get('name'),
        description: formData.get('description'),
        price: parseInt(formData.get('price')),
        category: formData.get('category'),
        image: imageUrl,
        type: formData.get('type'),
        mostLiked: formData.get('mostLiked') === 'on'
    };
    
    // 🔥 Use Firebase or localStorage
    try {
        await updateProductInFirestore(id, updates);
        
        // If not using Firebase, manually update UI
        if (!useFirebase) {
            renderProductsTab(document.getElementById('admin-content'));
            renderProducts();
            renderCategories();
            showToast('Product updated successfully', 'success');
        }
    } catch (error) {
        console.error('Error updating product:', error);
    }
}

async function deleteProduct(id) {
    if (!confirm('Are you sure you want to delete this design?')) return;
    
    // 🔥 Use Firebase or localStorage
    try {
        await deleteProductFromFirestore(id);
        
        // If not using Firebase, manually update UI
        if (!useFirebase) {
            renderProductsTab(document.getElementById('admin-content'));
            renderProducts();
            renderCategories();
            showToast('Product deleted successfully', 'success');
        }
    } catch (error) {
        console.error('Error deleting product:', error);
    }
}

async function toggleMostLiked(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;
    
    const updates = { mostLiked: !product.mostLiked };
    
    // 🔥 Use Firebase or localStorage
    try {
        await updateProductInFirestore(id, updates);
        
        // If not using Firebase, manually update UI
        if (!useFirebase) {
            renderProductsTab(document.getElementById('admin-content'));
            renderProducts();
            renderCategories();
        }
    } catch (error) {
        console.error('Error toggling most liked:', error);
    }
}

function renderMostLikedTab(content) {
    const mostLiked = products.filter(p => p.mostLiked);
    
    if (mostLiked.length === 0) {
        content.innerHTML = '<p class="text-center p-4" style="color: var(--text-light)">No products marked as most liked yet. Use the star button in the products tab to add items here.</p>';
        return;
    }
    
    content.innerHTML = `
        <div class="product-grid">
            ${mostLiked.map(product => `
                <div class="product-card">
                    <div class="product-image-container">
                        <img src="${product.thumbnail || product.image}" alt="${product.name}" class="product-image" onclick="openImageViewer('${product.thumbnail || product.image}', '${product.name}')">
                        <div class="price-badge">₹${product.price.toLocaleString('en-IN')}</div>
                    </div>
                    <div class="product-info">
                        <div class="product-category">${product.category}</div>
                        <h3 class="product-name">${product.name}</h3>
                        <p class="product-description">${product.description}</p>
                        <button onclick="toggleMostLiked('${product.id}')" class="btn btn-outline" style="width: 100%; margin-top: 0.75rem; font-size: 0.875rem;">
                            Remove from Most Liked
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function renderBannerTab(content) {
    content.innerHTML = `
        <div>
            <h3 style="font-size: 1.125rem; font-weight: 600; margin-bottom: 1rem;">Banner Background Image</h3>
            
            <div style="background: var(--bg); padding: 1rem; border-radius: 0.5rem; margin-bottom: 1rem;">
                <h4 style="font-weight: 500; margin-bottom: 0.5rem; font-size: 0.875rem;">Current Banner</h4>
                <img src="${bannerImage}" alt="Current banner" onclick="openImageViewer('${bannerImage}', 'Banner Image')" style="width: 100%; max-height: 200px; object-fit: cover; border-radius: 0.5rem; cursor: pointer;">
            </div>
            
            <div style="border: 1px solid var(--border); padding: 1rem; border-radius: 0.5rem;">
                <h4 style="font-weight: 500; margin-bottom: 0.5rem; font-size: 0.875rem;">Upload New Banner Image</h4>
                <p style="font-size: 0.875rem; color: var(--text-light); margin-bottom: 1rem;">Supports 4K images and all common formats (JPG, PNG, WebP)</p>
                
                <input type="file" accept="image/*" onchange="handleImageUpload(event, 'banner')" style="margin-bottom: 1rem;">
                
                <div style="text-align: center; margin: 1rem 0; color: var(--text-light); font-size: 0.875rem;">OR</div>
                
                <div class="form-group">
                    <label>Enter Image URL</label>
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
    showToast('Banner updated successfully', 'success');
}

function renderFeedbacksTab(content) {
    if (feedbacks.length === 0) {
        content.innerHTML = '<p class="text-center p-4" style="color: var(--text-light)">No feedbacks received yet.</p>';
        return;
    }
    
    content.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 1rem;">
            ${feedbacks.map(feedback => `
                <div style="border: 1px solid var(--border); border-radius: 0.5rem; padding: 1rem; background: white;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.75rem; gap: 1rem; flex-wrap: wrap;">
                        <div style="flex: 1; min-width: 200px;">
                            <h4 style="font-weight: 600; font-size: 1.063rem; margin-bottom: 0.25rem;">${feedback.name}</h4>
                            <p style="font-size: 0.875rem; color: var(--text-light);">${feedback.email} • ${feedback.phone}</p>
                            <p style="font-size: 0.75rem; color: var(--text-light); margin-top: 0.25rem;">${new Date(feedback.timestamp).toLocaleString('en-IN')}</p>
                        </div>
                        <button onclick="deleteFeedback('${feedback.id}')" class="btn btn-outline" style="padding: 0.25rem 0.5rem; font-size: 0.875rem; color: var(--danger);">Delete</button>
                    </div>
                    <p style="color: var(--text); font-size: 0.875rem;">${feedback.message}</p>
                </div>
            `).join('')}
        </div>
    `;
}

function deleteFeedback(id) {
    if (!confirm('Are you sure you want to delete this feedback?')) return;
    
    feedbacks = feedbacks.filter(f => f.id !== id);
    saveToLocalStorage();
    showToast('Feedback deleted successfully', 'success');
    renderFeedbacksTab(document.getElementById('admin-content'));
    
    // Update tab count
    document.querySelectorAll('.admin-tab')[3].textContent = `Feedbacks (${feedbacks.length})`;
}

// ================================
// FEEDBACK MODAL FUNCTIONS
// ================================

function openFeedbackModal() {
    const modal = document.getElementById('feedback-modal');
    modal.classList.remove('hidden');
}

function closeFeedbackModal() {
    const modal = document.getElementById('feedback-modal');
    modal.classList.add('hidden');
    document.getElementById('feedback-form').reset();
}

function submitFeedback(event) {
    event.preventDefault();
    const form = event.target;
    
    const feedback = {
        id: Date.now().toString(),
        name: document.getElementById('feedback-name').value,
        email: document.getElementById('feedback-email').value,
        phone: document.getElementById('feedback-phone').value,
        message: document.getElementById('feedback-message').value,
        timestamp: Date.now()
    };
    
    feedbacks.unshift(feedback);
    saveToLocalStorage();
    
    showToast('Thank you for your feedback! We\'ll get back to you soon.', 'success');
    
    setTimeout(() => {
        closeFeedbackModal();
    }, 1500);
}

// ================================
// IMAGE VIEWER FUNCTIONS
// ================================

function openImageViewer(url, name) {
    const modal = document.getElementById('image-viewer-modal');
    const title = document.getElementById('image-viewer-title');
    const image = document.getElementById('viewer-image');
    
    title.textContent = name;
    image.src = url;
    currentZoom = 100;
    
    modal.classList.remove('hidden');
}

function closeImageViewer() {
    const modal = document.getElementById('image-viewer-modal');
    modal.classList.add('hidden');
}

function zoomImage(direction) {
    const image = document.getElementById('viewer-image');
    
    if (direction === 'in' && currentZoom < 300) {
        currentZoom += 25;
    } else if (direction === 'out' && currentZoom > 50) {
        currentZoom -= 25;
    }
    
    image.style.transform = `scale(${currentZoom / 100})`;
    updateZoomDisplay();
}



function downloadImage() {
    const image = document.getElementById('viewer-image');
    const link = document.createElement('a');
    link.href = image.src;
    link.download = document.getElementById('image-viewer-title').textContent + '.jpg';
    link.click();
}

// ================================
// TOAST NOTIFICATIONS
// ================================

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// ================================
// INITIALIZATION
// ================================

document.addEventListener('DOMContentLoaded', () => {
    checkAuthState();
    loadProductsFromFirestore();
    console.log('🪵 Shri Vishwakarma Wood Works - Website Loaded');
    
    // Set current year in footer
    document.getElementById('current-year').textContent = new Date().getFullYear();
    

    // Initialize UI
    updateBanner();
    renderCategories();
    renderProducts();
    updatePinnedBadge();
    
    // Modal click outside to clos
    document.getElementById('admin-modal').addEventListener('click', (e) => {
        if (e.target.id === 'admin-modal') closeAdminModal();
    });
    
    document.getElementById('feedback-modal').addEventListener('click', (e) => {
        if (e.target.id === 'feedback-modal') closeFeedbackModal();
    });
    
    document.getElementById('image-viewer-modal').addEventListener('click', (e) => {
        if (e.target.id === 'image-viewer-modal') closeImageViewer();
    });
    
    console.log('✅ Website initialized successfully');
    console.log('📦 Products loaded:', products.length);
    console.log('📌 Pinned designs:', pinnedDesigns.length);
});
