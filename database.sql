CREATE TABLE company (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE,
    name VARCHAR(150) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(100),
    logo TEXT,
    website VARCHAR(100),
    status VARCHAR(1) DEFAULT 'A' CHECK (status IN ('A','I')),
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE branch (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE, 
    company_id INT REFERENCES company(id),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50),
    address TEXT,
    phone VARCHAR(20),
    status VARCHAR(1) DEFAULT 'A' CHECK (status IN ('A','I')),
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE role (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE, 
    name VARCHAR(50) NOT NULL,
    description TEXT
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE, 
    branch_id INT REFERENCES branch(id),
    username VARCHAR(50) UNIQUE NOT NULL,
    phone VARCHAR(15) UNIQUE NOT NULL,
    address VARCHAR(100) UNIQUE NOT NULL,
    image TEXT,
    password_hash TEXT NOT NULL,
    role_id INT REFERENCES role(id),
    status VARCHAR(1) DEFAULT 'A' CHECK (status IN ('A','I')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE party (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE, 
    branch_id INT REFERENCES branch(id),
    type VARCHAR(20) CHECK (type IN ('CUSTOMER','SUPPLIER')),
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    credit_limit DECIMAL(12,2) DEFAULT 0,
    loyalty_points INT DEFAULT 0,
    status VARCHAR(1) DEFAULT 'A' CHECK (status IN ('A','I')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE category (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE,
    parent_id INT REFERENCES category(id),
    name VARCHAR(100) NOT NULL,
    image TEXT,
    status VARCHAR(1) DEFAULT 'A' CHECK (status IN ('A','I')),
    created_by INT REFERENCES users(id),    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INT REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE uom (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE, 
    name VARCHAR(50) NOT NULL,   
    symbol VARCHAR(10),          
    description TEXT,
    status VARCHAR(1) DEFAULT 'A' CHECK (status IN ('A','I')),
    created_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INT REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE product (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE,
    uom_id INT REFERENCES uom(id),
    name VARCHAR(150) NOT NULL,
    description TEXT,
    cost_price DECIMAL(12,2) NOT NULL,
    selling_price DECIMAL(12,2) NOT NULL,
    status VARCHAR(1) DEFAULT 'A' CHECK (status IN ('A','I')),
    created_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INT REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE product_categories (
    id SERIAL PRIMARY KEY,
    product_id INT REFERENCES product(id) ON DELETE CASCADE,
    category_id INT REFERENCES category(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT FALSE,
    created_by INT REFERENCES users(id),  
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (product_id, category_id)
);

CREATE TABLE product_variant (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE, 
    product_id INT REFERENCES product(id) ON DELETE CASCADE,
    name VARCHAR(50), 
    additional_price DECIMAL(12,2) DEFAULT 0,
    status VARCHAR(1) DEFAULT 'A' CHECK (status IN ('A','I')),
    created_by INT REFERENCES users(id),    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INT REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE product_image (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE, 
    product_id INT REFERENCES product(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    alt_text VARCHAR(255),          
    is_primary BOOLEAN DEFAULT FALSE,
    status VARCHAR(1) DEFAULT 'A' CHECK (status IN ('A','I')), 
    created_by INT REFERENCES users(id),      
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INT REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE product_barcode (
    id SERIAL PRIMARY KEY,
    product_variant_id INT REFERENCES product_variant(id) ON DELETE CASCADE, 
    barcode VARCHAR(50) UNIQUE NOT NULL,
    type VARCHAR(20) DEFAULT 'EAN13' CHECK (type IN ('EAN13','CODE128','QR','UPC')), 
    is_primary BOOLEAN DEFAULT FALSE,
    status VARCHAR(1) DEFAULT 'A' CHECK (status IN ('A','I')), 
    created_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INT REFERENCES users(id),     
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE uom_conversion (
    id SERIAL PRIMARY KEY,
    product_id INT REFERENCES product(id) ON DELETE CASCADE,
    from_uom_id INT REFERENCES uom(id),
    to_uom_id INT REFERENCES uom(id),
    conversion_factor DECIMAL(12,4) NOT NULL CHECK (conversion_factor > 0),
    created_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE purchase_order (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE,
    branch_id INT REFERENCES branch(id),
    supplier_id INT REFERENCES party(id),
    order_date DATE DEFAULT CURRENT_DATE,
    expected_date DATE,
    delivery_date DATE,
    total_amount DECIMAL(12,2) DEFAULT 0,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    net_amount DECIMAL(12,2) GENERATED ALWAYS AS (total_amount + tax_amount - discount_amount) STORED,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING','PARTIAL','RECEIVED','CANCELLED','CLOSED')),
    notes TEXT,
    created_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE purchase_order_items (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES purchase_order(id) ON DELETE CASCADE,
    product_variant_id INT REFERENCES product_variant(id),
    quantity DECIMAL(12,2) NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    discount DECIMAL(12,2) DEFAULT 0,
    tax_rate DECIMAL(5,2) DEFAULT 0,
    received_quantity DECIMAL(12,2) DEFAULT 0,
    subtotal DECIMAL(12,2) GENERATED ALWAYS AS ((quantity * unit_price) - discount) STORED,
    notes TEXT
);
CREATE TABLE inventory_stock (
    id SERIAL PRIMARY KEY,
    branch_id INT REFERENCES branch(id),
    product_variant_id INT REFERENCES product_variant(id),
    quantity DECIMAL(12,2) DEFAULT 0,
    UNIQUE (branch_id, product_variant_id)
);
CREATE TABLE stock_transaction (
    id SERIAL PRIMARY KEY,
    branch_id INT REFERENCES branch(id),
    product_variant_id INT REFERENCES product_variant(id),
    type VARCHAR(20) CHECK (type IN ('PURCHASE','SALE','TRANSFER','ADJUSTMENT','RETURN')),
    reference_id INT,
    quantity DECIMAL(12,2) NOT NULL,
    direction VARCHAR(3) CHECK (direction IN ('IN','OUT')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE product_transfer (
    id SERIAL PRIMARY KEY,
    from_branch_id INT REFERENCES branch(id),
    to_branch_id INT REFERENCES branch(id),
    transfer_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING','RECEIVED','CANCELLED')),
    reference_no VARCHAR(50)
);

CREATE TABLE product_transfer_items (
    id SERIAL PRIMARY KEY,
    transfer_id INT REFERENCES product_transfer(id) ON DELETE CASCADE,
    product_variant_id INT REFERENCES product_variant(id),
    quantity DECIMAL(12,2) NOT NULL
);
CREATE TABLE invoice (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE, 
    branch_id INT REFERENCES branch(id),
    party_id INT REFERENCES party(id), 
    type VARCHAR(20) CHECK (type IN ('SALE','PURCHASE','EXPENSE')),
    invoice_date DATE DEFAULT CURRENT_DATE,
    total_amount DECIMAL(12,2) NOT NULL,
    paid_amount DECIMAL(12,2) DEFAULT 0,
    due_amount DECIMAL(12,2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
    status VARCHAR(10) DEFAULT 'DUE' CHECK (status IN ('PAID','PARTIAL','DUE')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id INT REFERENCES invoice(id) ON DELETE CASCADE,
    product_variant_id INT REFERENCES product_variant(id),
    quantity DECIMAL(12,2) NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    discount DECIMAL(12,2) DEFAULT 0,
    subtotal DECIMAL(12,2) GENERATED ALWAYS AS ((quantity * unit_price) - discount) STORED
);

CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    invoice_id INT REFERENCES invoice(id) ON DELETE CASCADE,
    method VARCHAR(20) CHECK (method IN ('CASH','BANK','ONLINE')),
    amount DECIMAL(12,2) NOT NULL,
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reference_no VARCHAR(50)
);
CREATE TABLE coa (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE,
    parent_id INT REFERENCES coa(id),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) CHECK (type IN ('ASSET','LIABILITY','INCOME','EXPENSE'))
);

CREATE TABLE journal_entry (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE,
    entry_date DATE DEFAULT CURRENT_DATE,
    reference_type VARCHAR(50),
    reference_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE journal_lines (
    id SERIAL PRIMARY KEY,
    journal_id INT REFERENCES journal_entry(id) ON DELETE CASCADE,
    account_id INT REFERENCES coa(id),
    debit DECIMAL(12,2) DEFAULT 0,
    credit DECIMAL(12,2) DEFAULT 0
);
CREATE TABLE activity_log (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    entity VARCHAR(50) NOT NULL,
    entity_id INT,
    description TEXT,
    ip_address VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE setup_data (
    id SERIAL PRIMARY KEY,
    setup_code VARCHAR(20) UNIQUE,     
    group_name VARCHAR(50),      
    key_name VARCHAR(100) NOT NULL,   
    value JSONB NOT NULL,    
    status VARCHAR(1) DEFAULT 'A' CHECK (status IN ('A','I')),
    created_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INT REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
