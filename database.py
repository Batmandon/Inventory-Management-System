"""
Database module for inventory management system.
Handles all SQLite database operations.
"""

import psycopg2
from psycopg2.extras import RealDictCursor
from fastapi import HTTPException
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def get_db_connection():
    """Get database connection."""
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)

def init_db():
    """Initialize database tables."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create products table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS products (
            name TEXT NOT NULL,
            price REAL NOT NULL,
            quantity INTEGER NOT NULL,
            batch TEXT PRIMARY KEY,
            expiry_date TEXT NOT NULL
        )
    ''')
    
    # Create orders table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS orders (
            order_id TEXT PRIMARY KEY,
            batch TEXT NOT NULL,
            product TEXT NOT NULL,
            requested_qty INTEGER NOT NULL,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    ''')
    
    conn.commit()
    conn.close()
# ========== PRODUCT OPERATIONS ==========

def get_all_products():
    """Load all products from database."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT name, price, quanity, batch, expiry_date FROM products')
    products = cursor.fetchall()
    conn.close()
    return products

def get_product_by_batch(batch):
    """Get a single product by batch number."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM products WHERE batch = %s', (batch,))
    product = cursor.fetchone()
    conn.close()
    return product



def insert_product(name, price, quantity, batch, expiry_date):
    """Insert a new product into the database."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            INSERT INTO products (name, price, quantity, batch, expiry_date)
            VALUES (%s, %s, %s, %s, %s)
        ''', (name, price, quantity, batch, expiry_date))
        conn.commit()
        conn.close()
        return True
    except psycopg2.IntegrityError:
        conn.rollback()
        conn.close()
        raise HTTPException(
            status_code=400,
            detail="Batch number already exists"
        )

def update_product_quantity(batch, new_quantity):
    """Update product quantity."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('UPDATE products SET quantity = %s WHERE batch = %s', (new_quantity, batch))
    rows_affected = cursor.rowcount
    conn.commit()
    conn.close()
    return rows_affected > 0


def delete_product(batch):
    """Delete a product by batch number."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM products WHERE batch = %s', (batch,))
    rows_affected = cursor.rowcount
    conn.commit()
    conn.close()
    return rows_affected > 0

# ========== ORDER OPERATIONS ==========

def get_all_orders():
    """Load all orders from database."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT order_id, batch, product, requested_qty, status, created_at FROM orders')
    rows = cursor.fetchall()
    conn.close()
    
    orders = []
    for row in rows:
        orders.append({
            'order_id': row['order_id'],
            'batch': row['batch'],
            'product': row['product'],
            'requested_qty': int(row['requested_qty']),
            'status': row['status'],
            'created_at': row['created_at']
        })
    return orders

def get_draft_orders():
    """Get all draft orders."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT order_id, batch, product, requested_qty, status, created_at FROM orders WHERE status = ?', ("DRAFT",))
    rows = cursor.fetchall()
    conn.close()
    
    orders = []
    for row in rows:
        orders.append({
            'order_id': row['order_id'],
            'batch': row['batch'],
            'product': row['product'],
            'requested_qty': int(row['requested_qty']),
            'status': row['status'],
            'created_at': row['created_at']
        })
    return orders

def get_order_by_id(order_id):
    """Get an order by ID."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM orders WHERE order_id = ?', (order_id,))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        return None
    
    return {
        'order_id': row['order_id'],
        'batch': row['batch'],
        'product': row['product'],
        'requested_qty': int(row['requested_qty']),
        'status': row['status'],
        'created_at': row['created_at']
    }

def check_draft_order_exists(batch):
    """Check if a draft order exists for a batch."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT COUNT(*) as count FROM orders WHERE batch = ? AND status = ?', (batch, "DRAFT"))
    count = cursor.fetchone()['count']
    conn.close()
    return count > 0

def insert_order(order_id, batch, product, requested_qty, status, created_at):
    """Insert a new order."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            INSERT INTO orders (order_id, batch, product, requested_qty, status, created_at)
            VALUES (%s, %s, %s, %s, %s, %s)
        ''', (order_id, batch, product, requested_qty, status, created_at))
        conn.commit()
        conn.close()
        return True
    except psycopg2.IntegrityError:
        conn.rollback()
        conn.close()
        raise HTTPException(status_code=400, detail="Order ID already exists.")

def update_order_quantity(order_id, quantity):
    """Update order quantity."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('UPDATE orders SET requested_qty = ? WHERE order_id = ?', (quantity, order_id))
    rows_affected = cursor.rowcount
    conn.commit()
    conn.close()
    return rows_affected > 0

def update_order_status(order_id, status):
    """Update order status."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('UPDATE orders SET status = ? WHERE order_id = ?', (status, order_id))
    rows_affected = cursor.rowcount
    conn.commit()
    conn.close()
    return rows_affected > 0

def get_order_count():
    """Get total number of orders."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT COUNT(*) as count FROM orders')
    count = cursor.fetchone()['count']
    conn.close()
    return count
