import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  Firestore,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch
} from 'firebase/firestore';
import { db } from '../app/config/firebase';

// Déclarez explicitement le type de db
const firestoreDB: Firestore = db;

// ==================== TYPES ====================
export interface Product {
  id: string;
  name: string;
  unitPrice?: number;
  price?: number; 
  quantity?: number;
  q?: number;
  imageUri?: string;
}

export type ProductItem = {
  name: string;
  quantity: number;
  unitPrice: number;
  price?: number;
};

export interface Client {
  id: string;
  name: string;
  phone?: string;
  location?: string;
  invoices: Invoice[];
}

export interface Invoice {
  id: string;
  clientName: string;
  clientId: string;
  products: Product[];
  date: string;
  total: number;
  paid: boolean;
  advance?: number;
  rest: number;
  remise?: number;
  status: "paid" | "pending" | "partial";
}

export interface DashboardStats {
  totalProducts: number;
  outOfStock: number;
  totalInvoices: number;
  totalIncome: number;
  period: string;
}

// ==================== PRODUCT FUNCTIONS ====================

export const createProduct = async (data: Omit<Product, 'id'>): Promise<{ id: string; message: string }> => {
  try {
    if (!data.name || !data.name.trim()) {
      throw new Error('Product name is required');
    }

    // Check for duplicates
    const productsSnapshot = await getDocs(
      query(collection(firestoreDB, 'products'), where('name', '==', data.name.trim()))
    );

    if (!productsSnapshot.empty) {
      const existingProduct = productsSnapshot.docs[0].data();
      throw new Error(`Product "${data.name}" already exists with ID: ${productsSnapshot.docs[0].id}`);
    }

    // Create product with auto-generated ID
    const docRef = await addDoc(collection(firestoreDB, 'products'), {
      name: data.name.trim(),
      unitPrice: data.unitPrice || 0,
      price: data.price || data.unitPrice || 0,
      quantity: data.quantity || 0,
      q: data.q || data.quantity || 0,
      imageUri: data.imageUri || null,
      createdAt: serverTimestamp(),
    });

    return { 
      id: docRef.id,
      message: 'Product created successfully'
    };
  } catch (error) {
    console.error('Error creating product:', error);
    throw error instanceof Error ? error : new Error('Failed to create product');
  }
};

export const getAllProducts = async (): Promise<Product[]> => {
  const q = query(collection(firestoreDB, 'products'), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name || '',
      unitPrice: data.unitPrice || data.price || 0,
      price: data.price || data.unitPrice || 0,
      quantity: data.quantity || data.q || 0,
      q: data.q || data.quantity || 0,
      imageUri: data.imageUri || data.imageUrl || '',
    } as Product;
  });
};

export const getProductById = async (id: string): Promise<Product> => {
  const docSnap = await getDoc(doc(firestoreDB, 'products', id));
  if (!docSnap.exists()) throw new Error("Product not found");
  
  const data = docSnap.data();
  return {
    id: docSnap.id,
    name: data.name || '',
    unitPrice: data.unitPrice || data.price || 0,
    price: data.price || data.unitPrice || 0,
    quantity: data.quantity || data.q || 0,
    q: data.q || data.quantity || 0,
    imageUri: data.imageUri || data.imageUrl || '',
  } as Product;
};

export const updateProduct = async (id: string, data: Partial<Product>): Promise<{ success: boolean }> => {
  await updateDoc(doc(firestoreDB, 'products', id), {
    ...data,
    updatedAt: serverTimestamp()
  });
  return { success: true };
};

export const deleteProduct = async (id: string): Promise<{ success: boolean }> => {
  await deleteDoc(doc(firestoreDB, 'products', id));
  return { success: true };
};

export const addQuantitiesToProducts = async (products: Array<{
  productId: string;
  quantityToAdd: number;
}>): Promise<Array<{
  productId: string;
  success: boolean;
  error?: string;
  productName?: string;
  oldQuantity?: number;
  quantityAdded?: number;
  newQuantity?: number;
}>> => {
  const results = [];
  const batch = writeBatch(firestoreDB);
  
  for (const product of products) {
    try {
      const docRef = doc(firestoreDB, 'products', product.productId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        results.push({
          productId: product.productId,
          success: false,
          error: 'Product not found'
        });
        continue;
      }
      
      const data = docSnap.data();
      const currentQuantity = data.q || data.quantity || 0;
      const newQuantity = currentQuantity + product.quantityToAdd;
      
      batch.update(docRef, { 
        q: newQuantity,
        quantity: newQuantity,
        updatedAt: serverTimestamp() 
      });
      
      results.push({
        productId: product.productId,
        productName: data.name || '',
        oldQuantity: currentQuantity,
        quantityAdded: product.quantityToAdd,
        newQuantity: newQuantity,
        success: true
      });
      
    } catch (error) {
      results.push({
        productId: product.productId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  await batch.commit();
  return results;
};

export const removeQuantitiesFromProducts = async (products: Array<{
  productId: string;
  quantityToRemove: number;
}>): Promise<Array<{
  productId: string;
  success: boolean;
  error?: string;
  productName?: string;
  oldQuantity?: number;
  quantityRemoved?: number;
  newQuantity?: number;
}>> => {
  const results = [];
  const batch = writeBatch(firestoreDB);
  
  for (const product of products) {
    try {
      const docRef = doc(firestoreDB, 'products', product.productId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        results.push({
          productId: product.productId,
          success: false,
          error: 'Product not found'
        });
        continue;
      }
      
      const data = docSnap.data();
      const currentQuantity = data.q || data.quantity || 0;
      
      if (currentQuantity < product.quantityToRemove) {
        results.push({
          productId: product.productId,
          productName: data.name || '',
          success: false,
          error: `Insufficient stock. Available: ${currentQuantity}, Requested to remove: ${product.quantityToRemove}`
        });
        continue;
      }
      
      const newQuantity = currentQuantity - product.quantityToRemove;
      
      batch.update(docRef, { 
        q: newQuantity,
        quantity: newQuantity,
        updatedAt: serverTimestamp() 
      });
      
      results.push({
        productId: product.productId,
        productName: data.name || '',
        oldQuantity: currentQuantity,
        quantityRemoved: product.quantityToRemove,
        newQuantity: newQuantity,
        success: true
      });
      
    } catch (error) {
      results.push({
        productId: product.productId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  await batch.commit();
  return results;
};

// ==================== CLIENT FUNCTIONS ====================

export const createClient = async (data: Omit<Client, 'id' | 'invoices'>): Promise<{ id: string }> => {
  try {
    if (!data.name) {
      throw new Error("Client name is required");
    }

    const docRef = await addDoc(collection(firestoreDB, 'clients'), {
      name: data.name,
      phone: data.phone || "",
      location: data.location || "",
      createdAt: serverTimestamp(),
    });

    return { id: docRef.id };
  } catch (error) {
    throw new Error(`Failed to create client: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const getAllClients = async (): Promise<Client[]> => {
  const q = query(collection(firestoreDB, 'clients'), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name || '',
      phone: data.phone || '',
      location: data.location || '',
      invoices: [],
    } as Client;
  });
};

export const getClientById = async (id: string): Promise<Client> => {
  const docSnap = await getDoc(doc(firestoreDB, 'clients', id));
  if (!docSnap.exists()) {
    throw new Error("Client not found");
  }
  
  const data = docSnap.data();
  return {
    id: docSnap.id,
    name: data.name || '',
    phone: data.phone || '',
    location: data.location || '',
    invoices: [],
  } as Client;
};

export const updateClient = async (id: string, data: Partial<Omit<Client, 'id' | 'invoices'>>): Promise<{ success: boolean; message: string }> => {
  const docSnap = await getDoc(doc(firestoreDB, 'clients', id));
  if (!docSnap.exists()) {
    throw new Error("Client not found");
  }

  await updateDoc(doc(firestoreDB, 'clients', id), {
    ...data,
    updatedAt: serverTimestamp(),
  });

  return { success: true, message: "Client updated successfully" };
};

export const deleteClient = async (id: string): Promise<{ success: boolean; message: string }> => {
  const docSnap = await getDoc(doc(firestoreDB, 'clients', id));
  if (!docSnap.exists()) {
    throw new Error("Client not found");
  }

  await deleteDoc(doc(firestoreDB, 'clients', id));
  return { success: true, message: "Client deleted successfully" };
};

// ==================== INVOICE FUNCTIONS ====================

export const createInvoice = async (data: Omit<Invoice, 'id'>): Promise<Invoice> => {
  try {
    if (!data.clientId || !data.clientName) {
      throw new Error("Client ID and name are required");
    }

    if (!data.products || !Array.isArray(data.products) || data.products.length === 0) {
      throw new Error("Products array is required");
    }

    const total = data.products.reduce((sum, product) => {
      const productTotal = (product.unitPrice || product.price || 0) * (product.quantity || product.q || 0);
      return sum + productTotal;
    }, 0);

    const remise = data.remise || 0;
    const advance = data.advance || 0;
    const totalAfterDiscount = total - remise;
    const rest = Math.max(0, totalAfterDiscount - advance);
    const paid = rest === 0;

    let status: "paid" | "pending" | "partial" = "pending";
    if (paid) {
      status = "paid";
    } else if (advance > 0) {
      status = "partial";
    }

    const now = new Date();
    const formattedDate = data.date || `${String(now.getDate()).padStart(2, '0')}/${String(
      now.getMonth() + 1
    ).padStart(2, '0')}/${now.getFullYear()}`;

    const invoiceData = {
      clientId: data.clientId,
      clientName: data.clientName,
      products: data.products.map(product => ({
        ...product,
        unitPrice: product.unitPrice || product.price || 0,
        price: product.price || product.unitPrice || 0,
        quantity: product.quantity || product.q || 0,
      })),
      total,
      remise,
      advance,
      rest,
      paid,
      status,
      date: formattedDate,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(firestoreDB, 'invoices'), invoiceData);
    
    return {
      id: docRef.id,
      ...invoiceData,
    } as Invoice;
  } catch (error) {
    throw new Error(`Failed to create invoice: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const getAllInvoices = async (): Promise<Invoice[]> => {
  const q = query(collection(firestoreDB, 'invoices'), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      clientName: data.clientName || '',
      clientId: data.clientId || '',
      products: data.products || [],
      date: data.date || '',
      total: data.total || 0,
      paid: data.paid || false,
      advance: data.advance || 0,
      rest: data.rest || 0,
      remise: data.remise || 0,
      status: data.status || 'pending',
    } as Invoice;
  });
};

export const getInvoiceById = async (id: string): Promise<Invoice> => {
  const docSnap = await getDoc(doc(firestoreDB, 'invoices', id));
  if (!docSnap.exists()) throw new Error("Invoice not found");
  
  const data = docSnap.data();
  return {
    id: docSnap.id,
    clientName: data.clientName || '',
    clientId: data.clientId || '',
    products: data.products || [],
    date: data.date || '',
    total: data.total || 0,
    paid: data.paid || false,
    advance: data.advance || 0,
    rest: data.rest || 0,
    remise: data.remise || 0,
    status: data.status || 'pending',
  } as Invoice;
};

export const updateInvoice = async (id: string, data: Partial<Invoice>): Promise<{ 
  success: boolean; 
  message: string;
}> => {
  try {
    const invoiceDoc = await getDoc(doc(firestoreDB, 'invoices', id));
    
    if (!invoiceDoc.exists()) {
      throw new Error(`Invoice ${id} not found`);
    }

    let updateData: any = {
      ...data,
      updatedAt: serverTimestamp()
    };

    if (data.products) {
      const total = data.products.reduce((sum, product) => {
        const productTotal = (product.unitPrice || product.price || 0) * (product.quantity || product.q || 0);
        return sum + productTotal;
      }, 0);

      const remise = data.remise || 0;
      const advance = data.advance || 0;
      const totalAfterDiscount = total - remise;
      const rest = Math.max(0, totalAfterDiscount - advance);
      const paid = rest === 0;

      let status: "paid" | "pending" | "partial" = "pending";
      if (paid) {
        status = "paid";
      } else if (advance > 0) {
        status = "partial";
      }

      updateData = {
        ...updateData,
        total,
        rest,
        paid,
        status
      };
    }

    await updateDoc(doc(firestoreDB, 'invoices', id), updateData);

    return { 
      success: true, 
      message: "Invoice updated successfully"
    };
  } catch (error) {
    throw new Error(`Failed to update invoice: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const updateInvoiceStatus = async (id: string, status: 'paid' | 'pending' | 'partial'): Promise<{ 
  success: boolean; 
  message: string;
}> => {
  try {
    const invoiceRef = doc(firestoreDB, 'invoices', id);
    const invoiceDoc = await getDoc(invoiceRef);
    
    if (!invoiceDoc.exists()) {
      throw new Error(`Invoice ${id} not found`);
    }

    const invoiceData = invoiceDoc.data();
    const paid = status === 'paid';
    
    const updateData: any = {
      status: status,
      paid: paid,
      updatedAt: serverTimestamp()
    };

    if (status === 'paid') {
      updateData.rest = 0;
      updateData.advance = invoiceData.total - (invoiceData.remise || 0);
    }

    await updateDoc(invoiceRef, updateData);

    return {
      success: true,
      message: `Invoice status updated to ${status}`
    };
  } catch (error) {
    throw new Error(`Failed to update invoice status: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const deleteInvoice = async (id: string): Promise<{ success: boolean; message: string }> => {
  try {
    await deleteDoc(doc(firestoreDB, 'invoices', id));
    return { success: true, message: "Invoice deleted successfully" };
  } catch (error) {
    throw new Error(`Failed to delete invoice: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// ==================== DASHBOARD FUNCTIONS ====================

export const getDashboardStats = async (period: string = 'daily'): Promise<DashboardStats> => {
  try {
    const [products, invoices] = await Promise.all([
      getAllProducts(),
      getAllInvoices()
    ]);

    const totalProducts = products.length;
    const outOfStock = products.filter(p => (p.quantity || p.q || 0) <= 0).length;

    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case 'daily':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'weekly':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'monthly':
        startDate.setMonth(now.getMonth() - 1);
        break;
      default:
        startDate = new Date(0);
    }

    const periodInvoices = invoices;
    
    const totalIncome = periodInvoices
      .filter(inv => inv.paid)
      .reduce((sum, inv) => sum + inv.total, 0);

    return {
      totalProducts,
      outOfStock,
      totalInvoices: periodInvoices.length,
      totalIncome,
      period
    };
  } catch (error) {
    return {
      totalProducts: 0,
      outOfStock: 0,
      totalInvoices: 0,
      totalIncome: 0,
      period
    };
  }
};

export const getRecentInvoices = async (limit: number = 5): Promise<Invoice[]> => {
  try {
    const invoices = await getAllInvoices();
    return invoices.slice(0, limit);
  } catch (error) {
    return [];
  }
};

export const getOutOfStockProducts = async (): Promise<Product[]> => {
  try {
    const products = await getAllProducts();
    return products.filter(p => (p.quantity || p.q || 0) <= 0);
  } catch (error) {
    return [];
  }
};

export const getClientsWithInvoices = async (): Promise<Client[]> => {
  try {
    const [clients, invoices] = await Promise.all([
      getAllClients(),
      getAllInvoices()
    ]);

    const invoicesByClient = invoices.reduce((acc, invoice) => {
      if (!acc[invoice.clientId]) {
        acc[invoice.clientId] = [];
      }
      acc[invoice.clientId].push(invoice);
      return acc;
    }, {} as Record<string, Invoice[]>);

    return clients.map(client => ({
      ...client,
      invoices: invoicesByClient[client.id] || []
    }));
  } catch (error) {
    console.error('Error getting clients with invoices:', error);
    return [];
  }
};