// utils/productImageStorage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const PRODUCT_IMAGES_KEY = 'product_images';

export const saveProductImage = async (productId: string, imageUri: string): Promise<void> => {
  try {
    const stored = await AsyncStorage.getItem(PRODUCT_IMAGES_KEY);
    const images = stored ? JSON.parse(stored) : {};
    images[productId] = imageUri;
    await AsyncStorage.setItem(PRODUCT_IMAGES_KEY, JSON.stringify(images));
    console.log('✅ Image saved locally for product:', productId);
  } catch (error) {
    console.error('❌ Error saving product image:', error);
    throw error;
  }
};

export const getProductImage = async (productId: string): Promise<string | null> => {
  try {
    const stored = await AsyncStorage.getItem(PRODUCT_IMAGES_KEY);
    const images = stored ? JSON.parse(stored) : {};
    return images[productId] || null;
  } catch (error) {
    console.error('❌ Error getting product image:', error);
    return null;
  }
};

export const deleteProductImage = async (productId: string): Promise<void> => {
  try {
    const stored = await AsyncStorage.getItem(PRODUCT_IMAGES_KEY);
    const images = stored ? JSON.parse(stored) : {};
    delete images[productId];
    await AsyncStorage.setItem(PRODUCT_IMAGES_KEY, JSON.stringify(images));
    console.log('🗑️ Image deleted for product:', productId);
  } catch (error) {
    console.error('❌ Error deleting product image:', error);
    throw error;
  }
};

export const getAllProductImages = async (): Promise<{ [productId: string]: string }> => {
  try {
    const stored = await AsyncStorage.getItem(PRODUCT_IMAGES_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('❌ Error getting all product images:', error);
    return {};
  }
};