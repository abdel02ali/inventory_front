import {
  createMovement,
  getCategories,
  getDepartments,
  getProducts,
  testConnection
} from './api';

// Test de connexion au démarrage
const testApiConnection = async () => {
  const result = await testConnection();
  if (result.success) {
    console.log('✅ Connected to API successfully');
  } else {
    console.log('❌ API connection failed:', result.message);
  }
};

// Exemple d'utilisation
const createStockMovement = async () => {
  try {
    const movementData = {
      type: "stock_in",
      stockManager: "John Doe",
      departmentId: "DEPT000001",
      supplier: "Test Supplier",
      products: [
        {
          productId: "PROD000001",
          quantity: 10,
          unitPrice: 3.50
        }
      ],
      notes: "Test delivery"
    };

    const result = await createMovement(movementData);
    
    if (result.success) {
      console.log('✅ Movement created:', result.data);
    } else {
      console.log('❌ Failed to create movement:', result.message);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
};

// Charger les données au démarrage
const loadInitialData = async () => {
  try {
    const [products, categories, departments] = await Promise.all([
      getProducts(),
      getCategories(),
      getDepartments()
    ]);
    
    console.log('📦 Products:', products);
    console.log('📂 Categories:', categories);
    console.log('🏢 Departments:', departments);
  } catch (error) {
    console.error('❌ Error loading initial data:', error);
  }
};