const hasValidCategory = (product: Product): boolean => {
  // Check categories array
  if (product.categories && Array.isArray(product.categories)) {
    const hasValidCategories = product.categories.some(cat => 
      cat && typeof cat === 'string' && cat.trim() !== ''
    );
    if (hasValidCategories) return true;
  }
  
  // Check single category field
  if (product.category && typeof product.category === 'string' && product.category.trim() !== '') {
    return true;
  }
  
  // Check primary category field
  if (product.primaryCategory && typeof product.primaryCategory === 'string' && product.primaryCategory.trim() !== '') {
    return true;
  }
  
  return false;
};