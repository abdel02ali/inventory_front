// Shared category colors and icons for consistency across the app
export const CATEGORY_COLORS: { [key: string]: string } = {
  'Vegetables': '#22c55e',
  'Fruits': '#f59e0b',
  'Meat': '#dc2626',
  'Seafood': '#0ea5e9',
  'Dairy': '#fbbf24',
  'Herbs & Spices': '#10b981',
  'Grains & Pasta': '#d97706',
  'Oils & Vinegars': '#f97316',
  'Canned Goods': '#6b7280',
  'Bakery': '#d4a574',
  'Beverages': '#3b82f6',
  'Cleaning Supplies': '#6366f1',
  'Paper Goods': '#8b5cf6',
  'Utensils': '#a855f7',
  'Equipment': '#ec4899',
  'Frozen Foods': '#06b6d4',
  'Condiments': '#ef4444',
  'Spices': '#f43f5e',
  'Baking Supplies': '#f472b6',
  'Fresh Herbs': '#84cc16',
  'Other': '#6b7280'
};

export const CATEGORY_ICONS: { [key: string]: string } = {
  'Vegetables': '🥦',
  'Fruits': '🍎',
  'Meat': '🥩',
  'Seafood': '🐟',
  'Dairy': '🥛',
  'Herbs & Spices': '🌿',
  'Grains & Pasta': '🍚',
  'Oils & Vinegars': '🫒',
  'Canned Goods': '🥫',
  'Bakery': '🍞',
  'Beverages': '🥤',
  'Cleaning Supplies': '🧽',
  'Paper Goods': '🧻',
  'Utensils': '🍴',
  'Equipment': '🔪',
  'Frozen Foods': '🧊',
  'Condiments': '🧂',
  'Spices': '🌶️',
  'Baking Supplies': '🧁',
  'Fresh Herbs': '🌱',
  'Other': '📦',
};

export const COMMON_CATEGORIES = [
  'Vegetables', 'Fruits', 'Meat', 'Seafood', 'Dairy', 'Herbs & Spices',
  'Grains & Pasta', 'Oils & Vinegars', 'Canned Goods', 'Bakery', 'Beverages',
  'Cleaning Supplies', 'Paper Goods', 'Utensils', 'Equipment', 'Frozen Foods',
  'Condiments', 'Spices', 'Baking Supplies', 'Fresh Herbs', 'Other'
];

// Helper function to get category color with fallback
export const getCategoryColor = (categoryName: string): string => {
  if (CATEGORY_COLORS[categoryName]) {
    return CATEGORY_COLORS[categoryName];
  }
  
  // Generate consistent color based on category name for custom categories
  const customCategoryColors = [
    '#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444', '#10b981',
    '#3b82f6', '#f97316', '#84cc16', '#ec4899', '#6366f1',
    '#d4a574', '#a855f7', '#f43f5e', '#22c55e', '#0ea5e9'
  ];
  const index = categoryName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return customCategoryColors[index % customCategoryColors.length];
};

// Helper function to get category icon with fallback
export const getCategoryIcon = (category: string): string => {
  return CATEGORY_ICONS[category] || '📦';
};

