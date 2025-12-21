/**
 * Offline Database Service
 * Uses SQLite for native platforms, localStorage for web
 */
import { Platform } from 'react-native';

const DB_NAME = 'savdo_app.db';
const isWeb = Platform.OS === 'web';

// Initialize database
let db = null;

export const initDatabase = async () => {
  try {
    if (isWeb) {
      // Web: Use localStorage as simple database
      console.log('Database initialized (Web - using localStorage)');
      await createTables();
      return { isWeb: true };
    } else {
      // Native: Use SQLite - dynamic import to avoid web bundling issues
      let SQLite;
      try {
        SQLite = require('expo-sqlite');
      } catch (importError) {
        // Fallback if expo-sqlite is not available
        console.warn('expo-sqlite not available, using localStorage fallback');
        db = null; // Ensure db is null so fallback is used
        return { isWeb: true };
      }
      
      try {
        db = await SQLite.openDatabaseAsync(DB_NAME);
        
        // Verify database is valid by testing a simple query
        if (db && typeof db.prepareAsync === 'function') {
          // Create tables
          await createTables();
          console.log('Database initialized successfully (SQLite)');
          return db;
        } else {
          throw new Error('Database instance is invalid');
        }
      } catch (sqliteError) {
        console.error('SQLite initialization error:', sqliteError);
        db = null; // Ensure db is null so fallback is used
        console.warn('SQLite initialization failed, using localStorage fallback');
        return { isWeb: true };
      }
    }
  } catch (error) {
    console.error('Error initializing database:', error);
    db = null; // Ensure db is null so fallback is used
    // For web, don't throw - just log and continue
    if (isWeb) {
      console.warn('Web database initialization failed, continuing with localStorage');
      return { isWeb: true };
    }
    // For native, if SQLite fails, use localStorage as fallback
    console.warn('Database initialization failed, using localStorage fallback');
    return { isWeb: true };
  }
};

/**
 * Web localStorage helpers
 */
const webStorage = {
  get: (key) => {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },
  remove: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  },
  getAll: (prefix) => {
    try {
      const items = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          const value = JSON.parse(localStorage.getItem(key));
          items.push(value);
        }
      }
      return items;
    } catch {
      return [];
    }
  }
};

/**
 * Create database tables
 */
const createTables = async () => {
  if (isWeb) {
    // Web: Initialize localStorage keys
    if (!webStorage.get('db_initialized')) {
      webStorage.set('orders', []);
      webStorage.set('order_items', []);
      webStorage.set('products', []);
      webStorage.set('customers', []);
      webStorage.set('location_history', []);
      webStorage.set('sync_queue', []);
      webStorage.set('db_initialized', true);
      console.log('Web database tables initialized');
    }
    return;
  }

  if (!db) return;

  try {
    await db.execAsync(`
      -- Orders table
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        server_id INTEGER,
        customer_id INTEGER NOT NULL,
        customer_name TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        total_amount REAL DEFAULT 0,
        notes TEXT,
        synced INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        synced_at TEXT
      );

      -- Order items table
      CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        product_name TEXT,
        requested_quantity INTEGER NOT NULL,
        unit_price REAL DEFAULT 0,
        subtotal REAL DEFAULT 0,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      );

      -- Products cache table
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        barcode TEXT,
        wholesale_price REAL DEFAULT 0,
        retail_price REAL DEFAULT 0,
        regular_price REAL DEFAULT 0,
        image_url TEXT,
        last_updated TEXT,
        UNIQUE(id)
      );

      -- Customers cache table
      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT,
        customer_type TEXT DEFAULT 'retail',
        debt_balance REAL DEFAULT 0,
        last_updated TEXT,
        UNIQUE(id)
      );

      -- Location history table
      CREATE TABLE IF NOT EXISTS location_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        timestamp TEXT NOT NULL,
        synced INTEGER DEFAULT 0
      );

      -- Sync queue table
      CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_name TEXT NOT NULL,
        record_id INTEGER NOT NULL,
        action TEXT NOT NULL,
        data TEXT,
        created_at TEXT NOT NULL,
        synced INTEGER DEFAULT 0
      );

      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_orders_synced ON orders(synced);
      CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
      CREATE INDEX IF NOT EXISTS idx_location_history_timestamp ON location_history(timestamp);
      CREATE INDEX IF NOT EXISTS idx_sync_queue_synced ON sync_queue(synced);
    `);

    console.log('Database tables created successfully');
  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  }
};

/**
 * Get database instance
 * Returns null if database is not initialized (fallback to localStorage)
 */
export const getDatabase = () => {
  if (isWeb) {
    return { isWeb: true };
  }
  if (!db || !db.prepareAsync) {
    console.warn('Database not initialized or invalid. Using localStorage fallback.');
    return null; // Return null instead of throwing - will use localStorage fallback
  }
  return db;
};

/**
 * Save order offline
 */
export const saveOrderOffline = async (order) => {
  if (isWeb) {
    try {
      const now = new Date().toISOString();
      const orders = webStorage.get('orders') || [];
      const orderItems = webStorage.get('order_items') || [];
      
      const newOrder = {
        id: Date.now(),
        server_id: null,
        customer_id: order.customer_id,
        customer_name: order.customer_name || '',
        status: order.status || 'pending',
        total_amount: order.total_amount || 0,
        notes: order.notes || '',
        created_at: now,
        updated_at: now,
        synced: 0,
        synced_at: null
      };
      
      orders.push(newOrder);
      webStorage.set('orders', orders);
      
      // Save order items
      if (order.items && order.items.length > 0) {
        for (const item of order.items) {
          orderItems.push({
            id: Date.now() + Math.random(),
            order_id: newOrder.id,
            product_id: item.product_id,
            product_name: item.product_name || '',
            requested_quantity: item.requested_quantity,
            unit_price: item.unit_price || 0,
            subtotal: item.subtotal || 0,
          });
        }
        webStorage.set('order_items', orderItems);
      }
      
      return newOrder.id;
    } catch (error) {
      console.error('Error saving order offline (web):', error);
      throw error;
    }
  }
  
  const database = getDatabase();
  
  // If database is not available, use localStorage fallback
  if (!database || database.isWeb) {
    try {
      const now = new Date().toISOString();
      const orders = webStorage.get('orders') || [];
      const orderItems = webStorage.get('order_items') || [];
      
      const newOrder = {
        id: Date.now(),
        server_id: null,
        customer_id: order.customer_id,
        customer_name: order.customer_name || '',
        status: order.status || 'pending',
        total_amount: order.total_amount || 0,
        notes: order.notes || '',
        created_at: now,
        updated_at: now,
        synced: 0,
        synced_at: null
      };
      
      orders.push(newOrder);
      webStorage.set('orders', orders);
      
      // Save order items
      if (order.items && order.items.length > 0) {
        for (const item of order.items) {
          orderItems.push({
            id: Date.now() + Math.random(),
            order_id: newOrder.id,
            product_id: item.product_id,
            product_name: item.product_name || '',
            requested_quantity: item.requested_quantity,
            unit_price: item.unit_price || 0,
            subtotal: item.subtotal || 0,
          });
        }
        webStorage.set('order_items', orderItems);
      }
      
      return newOrder.id;
    } catch (error) {
      console.error('Error saving order offline (fallback):', error);
      throw error;
    }
  }
  
  try {
    const now = new Date().toISOString();
    
    const result = await database.runAsync(
      `INSERT INTO orders (customer_id, customer_name, status, total_amount, notes, created_at, updated_at, synced)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        order.customer_id,
        order.customer_name || '',
        order.status || 'pending',
        order.total_amount || 0,
        order.notes || '',
        now,
        now,
      ]
    );

    const orderId = result.lastInsertRowId;

    // Save order items
    if (order.items && order.items.length > 0) {
      for (const item of order.items) {
        await database.runAsync(
          `INSERT INTO order_items (order_id, product_id, product_name, requested_quantity, unit_price, subtotal)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            orderId,
            item.product_id,
            item.product_name || '',
            item.requested_quantity,
            item.unit_price || 0,
            item.subtotal || 0,
          ]
        );
      }
    }

    return orderId;
  } catch (error) {
    console.error('Error saving order offline:', error);
    // Fallback to localStorage if SQLite fails
    try {
      const now = new Date().toISOString();
      const orders = webStorage.get('orders') || [];
      const orderItems = webStorage.get('order_items') || [];
      
      const newOrder = {
        id: Date.now(),
        server_id: null,
        customer_id: order.customer_id,
        customer_name: order.customer_name || '',
        status: order.status || 'pending',
        total_amount: order.total_amount || 0,
        notes: order.notes || '',
        created_at: now,
        updated_at: now,
        synced: 0,
        synced_at: null
      };
      
      orders.push(newOrder);
      webStorage.set('orders', orders);
      
      if (order.items && order.items.length > 0) {
        for (const item of order.items) {
          orderItems.push({
            id: Date.now() + Math.random(),
            order_id: newOrder.id,
            product_id: item.product_id,
            product_name: item.product_name || '',
            requested_quantity: item.requested_quantity,
            unit_price: item.unit_price || 0,
            subtotal: item.subtotal || 0,
          });
        }
        webStorage.set('order_items', orderItems);
      }
      
      return newOrder.id;
    } catch (fallbackError) {
      console.error('Error saving order offline (fallback also failed):', fallbackError);
      throw fallbackError;
    }
  }
};

/**
 * Get unsynced orders
 */
export const getUnsyncedOrders = async () => {
  if (isWeb) {
    try {
      const orders = (webStorage.get('orders') || []).filter(o => o.synced === 0);
      const orderItems = webStorage.get('order_items') || [];
      
      // Sort by created_at DESC
      orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      // Add items to each order
      for (const order of orders) {
        order.items = orderItems.filter(item => item.order_id === order.id);
      }
      
      return orders;
    } catch (error) {
      console.error('Error getting unsynced orders (web):', error);
      return [];
    }
  }
  
  const database = getDatabase();
  
  // If database is not available, use localStorage fallback
  if (!database || database.isWeb) {
    try {
      const orders = (webStorage.get('orders') || []).filter(o => o.synced === 0);
      const orderItems = webStorage.get('order_items') || [];
      
      // Sort by created_at DESC
      orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      // Add items to each order
      for (const order of orders) {
        order.items = orderItems.filter(item => item.order_id === order.id);
      }
      
      return orders;
    } catch (error) {
      console.error('Error getting unsynced orders (fallback):', error);
      return [];
    }
  }
  
  try {
    const orders = await database.getAllAsync(
      `SELECT * FROM orders WHERE synced = 0 ORDER BY created_at DESC`
    );

    // Get items for each order
    for (const order of orders) {
      const items = await database.getAllAsync(
        `SELECT * FROM order_items WHERE order_id = ?`,
        [order.id]
      );
      order.items = items;
    }

    return orders;
  } catch (error) {
    console.error('Error getting unsynced orders:', error);
    // Fallback to localStorage if SQLite fails
    try {
      const orders = (webStorage.get('orders') || []).filter(o => o.synced === 0);
      const orderItems = webStorage.get('order_items') || [];
      
      orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      for (const order of orders) {
        order.items = orderItems.filter(item => item.order_id === order.id);
      }
      
      return orders;
    } catch (fallbackError) {
      console.error('Error getting unsynced orders (fallback also failed):', fallbackError);
      return [];
    }
  }
};

/**
 * Update order status in local database
 */
export const updateOrderStatusOffline = async (orderId, status) => {
  if (isWeb) {
    try {
      const orders = webStorage.get('orders') || [];
      const order = orders.find(o => o.id === orderId);
      if (order) {
        order.status = status;
        order.updated_at = new Date().toISOString();
        webStorage.set('orders', orders);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating order status offline (web):', error);
      return false;
    }
  }
  
  const database = getDatabase();
  
  try {
    await database.runAsync(
      `UPDATE orders SET status = ?, updated_at = ? WHERE id = ?`,
      [status, new Date().toISOString(), orderId]
    );
    return true;
  } catch (error) {
    console.error('Error updating order status offline:', error);
    return false;
  }
};

/**
 * Mark order as synced
 */
export const markOrderSynced = async (localId, serverId) => {
  if (isWeb) {
    try {
      const orders = webStorage.get('orders') || [];
      const order = orders.find(o => o.id === localId);
      if (order) {
        order.synced = 1;
        order.server_id = serverId;
        order.synced_at = new Date().toISOString();
        webStorage.set('orders', orders);
      }
    } catch (error) {
      console.error('Error marking order as synced (web):', error);
    }
    return;
  }
  
  const database = getDatabase();
  
  try {
    await database.runAsync(
      `UPDATE orders SET synced = 1, server_id = ?, synced_at = ? WHERE id = ?`,
      [serverId, new Date().toISOString(), localId]
    );
  } catch (error) {
    console.error('Error marking order as synced:', error);
  }
};

/**
 * Cache products
 */
export const cacheProducts = async (products) => {
  if (isWeb) {
    try {
      const now = new Date().toISOString();
      const cachedProducts = webStorage.get('products') || [];
      
      for (const product of products) {
        const index = cachedProducts.findIndex(p => p.id === product.id);
        const productData = {
          id: product.id,
          name: product.name,
          barcode: product.barcode || null,
          wholesale_price: product.wholesale_price || 0,
          retail_price: product.retail_price || 0,
          regular_price: product.regular_price || 0,
          image_url: product.image_url || null,
          last_updated: now,
        };
        
        if (index >= 0) {
          cachedProducts[index] = productData;
        } else {
          cachedProducts.push(productData);
        }
      }
      
      webStorage.set('products', cachedProducts);
    } catch (error) {
      console.error('Error caching products (web):', error);
    }
    return;
  }
  
  const database = getDatabase();
  
  // Check if database is valid and has required methods
  const isDatabaseValid = database && 
                          !database.isWeb && 
                          typeof database.runAsync === 'function' &&
                          typeof database.prepareAsync === 'function';
  
  // If database is not available or invalid, use localStorage fallback
  if (!isDatabaseValid) {
    try {
      const now = new Date().toISOString();
      const cachedProducts = webStorage.get('products') || [];
      
      for (const product of products) {
        if (!product || !product.id) continue; // Skip invalid products
        
        const index = cachedProducts.findIndex(p => p && p.id === product.id);
        const productData = {
          id: product.id,
          name: product.name || '',
          barcode: product.barcode || null,
          wholesale_price: product.wholesale_price || 0,
          retail_price: product.retail_price || 0,
          regular_price: product.regular_price || 0,
          image_url: product.image_url || null,
          last_updated: now,
        };
        
        if (index >= 0) {
          cachedProducts[index] = productData;
        } else {
          cachedProducts.push(productData);
        }
      }
      
      webStorage.set('products', cachedProducts);
      console.log(`✅ Cached ${products.length} products to localStorage`);
      return;
    } catch (error) {
      console.error('Error caching products (localStorage fallback):', error);
      return;
    }
  }
  
  // Try SQLite, but catch errors and fallback to localStorage
  try {
    const now = new Date().toISOString();
    
    for (const product of products) {
      if (!product || !product.id) continue; // Skip invalid products
      
      await database.runAsync(
        `INSERT OR REPLACE INTO products (id, name, barcode, wholesale_price, retail_price, regular_price, image_url, last_updated)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          product.id,
          product.name || '',
          product.barcode || null,
          product.wholesale_price || 0,
          product.retail_price || 0,
          product.regular_price || 0,
          product.image_url || null,
          now,
        ]
      );
    }
    console.log(`✅ Cached ${products.length} products to SQLite`);
  } catch (error) {
    console.error('Error caching products (SQLite failed, using localStorage):', error);
    // Fallback to localStorage if SQLite fails
    try {
      const now = new Date().toISOString();
      const cachedProducts = webStorage.get('products') || [];
      
      for (const product of products) {
        if (!product || !product.id) continue; // Skip invalid products
        
        const index = cachedProducts.findIndex(p => p && p.id === product.id);
        const productData = {
          id: product.id,
          name: product.name || '',
          barcode: product.barcode || null,
          wholesale_price: product.wholesale_price || 0,
          retail_price: product.retail_price || 0,
          regular_price: product.regular_price || 0,
          image_url: product.image_url || null,
          last_updated: now,
        };
        
        if (index >= 0) {
          cachedProducts[index] = productData;
        } else {
          cachedProducts.push(productData);
        }
      }
      
      webStorage.set('products', cachedProducts);
      console.log(`✅ Cached ${products.length} products to localStorage (SQLite fallback)`);
    } catch (fallbackError) {
      console.error('Error caching products (localStorage fallback also failed):', fallbackError);
    }
  }
};

/**
 * Get cached products
 */
export const getCachedProducts = async () => {
  if (isWeb) {
    try {
      const products = webStorage.get('products') || [];
      return products.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } catch (error) {
      console.error('Error getting cached products (web):', error);
      return [];
    }
  }
  
  const database = getDatabase();
  
  // If database is not available, use localStorage fallback
  if (!database || database.isWeb) {
    try {
      const products = webStorage.get('products') || [];
      return products.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } catch (error) {
      console.error('Error getting cached products (fallback):', error);
      return [];
    }
  }
  
  try {
    return await database.getAllAsync('SELECT * FROM products ORDER BY name');
  } catch (error) {
    console.error('Error getting cached products:', error);
    // Fallback to localStorage if SQLite fails
    try {
      const products = webStorage.get('products') || [];
      return products.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } catch (fallbackError) {
      console.error('Error getting cached products (fallback also failed):', fallbackError);
      return [];
    }
  }
};

/**
 * Save location to history
 */
export const saveLocation = async (latitude, longitude) => {
  if (isWeb) {
    try {
      const locations = webStorage.get('location_history') || [];
      locations.push({
        id: Date.now(),
        latitude,
        longitude,
        timestamp: new Date().toISOString(),
        synced: 0
      });
      webStorage.set('location_history', locations);
    } catch (error) {
      console.error('Error saving location (web):', error);
    }
    return;
  }
  
  const database = getDatabase();
  
  try {
    await database.runAsync(
      `INSERT INTO location_history (latitude, longitude, timestamp, synced)
       VALUES (?, ?, ?, 0)`,
      [latitude, longitude, new Date().toISOString()]
    );
  } catch (error) {
    console.error('Error saving location:', error);
  }
};

/**
 * Get unsynced locations
 */
export const getUnsyncedLocations = async () => {
  if (isWeb) {
    try {
      const locations = (webStorage.get('location_history') || [])
        .filter(l => l.synced === 0)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
        .slice(0, 100);
      return locations;
    } catch (error) {
      console.error('Error getting unsynced locations (web):', error);
      return [];
    }
  }
  
  const database = getDatabase();
  
  try {
    return await database.getAllAsync(
      `SELECT * FROM location_history WHERE synced = 0 ORDER BY timestamp ASC LIMIT 100`
    );
  } catch (error) {
    console.error('Error getting unsynced locations:', error);
    return [];
  }
};

/**
 * Mark location as synced
 */
export const markLocationSynced = async (locationId) => {
  if (isWeb) {
    try {
      const locations = webStorage.get('location_history') || [];
      const location = locations.find(l => l.id === locationId);
      if (location) {
        location.synced = 1;
        webStorage.set('location_history', locations);
      }
    } catch (error) {
      console.error('Error marking location as synced (web):', error);
    }
    return;
  }
  
  const database = getDatabase();
  
  try {
    await database.runAsync(
      `UPDATE location_history SET synced = 1 WHERE id = ?`,
      [locationId]
    );
  } catch (error) {
    console.error('Error marking location as synced:', error);
  }
};

export default {
  initDatabase,
  getDatabase,
  saveOrderOffline,
  getUnsyncedOrders,
  updateOrderStatusOffline,
  markOrderSynced,
  cacheProducts,
  getCachedProducts,
  saveLocation,
  getUnsyncedLocations,
  markLocationSynced,
};

