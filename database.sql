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
    regular_price DECIMAL(12,2) NOT NULL,
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
CREATE TABLE goods_received_note (
    id SERIAL PRIMARY KEY,
    purchase_order_id INT REFERENCES purchase_order(id) ON DELETE CASCADE,
    grn_code VARCHAR(20) UNIQUE,
    received_date DATE DEFAULT CURRENT_DATE,
    received_by INT REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE grn_items (
    id SERIAL PRIMARY KEY,
    grn_id INT REFERENCES goods_received_note(id) ON DELETE CASCADE,
    product_variant_id INT REFERENCES product_variant(id),
    ordered_quantity DECIMAL(12,2) NOT NULL,
    received_quantity DECIMAL(12,2) NOT NULL,
    discrepancy DECIMAL(12,2) GENERATED ALWAYS AS (ordered_quantity - received_quantity) STORED,
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

CREATE TABLE customer (
    id SERIAL PRIMARY KEY,
    code VARCHAR(30) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(20) NOT NULL UNIQUE,
    password_hash TEXT,
    STATUS VARCHAR(1) DEFAULT 'A' CHECK (STATUS IN ('A','I')),
    CREATED_BY VARCHAR(50) DEFAULT USER,
    CREATION_DATE TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    LAST_UPDATE VARCHAR(50),
    LAST_UPDATE_DATE TIMESTAMP
);

CREATE TABLE customer_address (
    id SERIAL PRIMARY KEY,
    customer_id INT REFERENCES customer(id),
    label VARCHAR(50),
    address_line TEXT NOT NULL,
    city VARCHAR(50),
    area VARCHAR(50),
    postal_code VARCHAR(20),
    is_default BOOLEAN DEFAULT FALSE,
    STATUS VARCHAR(1) DEFAULT 'A' CHECK (STATUS IN ('A','I')),
    CREATION_DATE TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE delivery_method (
    id SERIAL PRIMARY KEY,
    code VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    api_base_url TEXT,
    api_key TEXT,
    api_secret TEXT,
    auth_token TEXT,
    token_expiry TIMESTAMP,
    STATUS VARCHAR(1) DEFAULT 'A' CHECK (STATUS IN ('A','I')),
     created_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
);
CREATE TABLE payment_method (
    id SERIAL PRIMARY KEY,
    code VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) CHECK (type IN ('CASH','CARD','BANK','MOBILE','ONLINE','COD')),
    provider VARCHAR(50),
    STATUS VARCHAR(1) DEFAULT 'A' CHECK (STATUS IN ('A','I')),
     created_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
);
CREATE TABLE order_online (
    id SERIAL PRIMARY KEY,
    code VARCHAR(30) UNIQUE NOT NULL,
    customer_id INT REFERENCES customer(id),
    delivery_address_id INT REFERENCES customer_address(id),
    delivery_method_id INT REFERENCES delivery_method(id),
    payment_method_id INT REFERENCES payment_method(id),
    total_amount DECIMAL(12,2) NOT NULL,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    net_amount DECIMAL(12,2) GENERATED ALWAYS AS (total_amount - discount_amount) STORED,
    is_cod BOOLEAN DEFAULT FALSE,
    order_status VARCHAR(20) DEFAULT 'PENDING' CHECK (order_status IN ('PENDING','CONFIRMED','DISPATCHED','DELIVERED','CANCELLED')),
    payment_status VARCHAR(20) DEFAULT 'UNPAID' CHECK (payment_status IN ('UNPAID','PAID','REFUNDED')),
    status VARCHAR(1) DEFAULT 'A' CHECK (status IN ('A','I')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
);
CREATE TABLE order_item_online (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES order_online(id) ON DELETE CASCADE,
    product_variant_id INT REFERENCES product_variant(id),
    quantity DECIMAL(12,2) NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    discount DECIMAL(12,2) DEFAULT 0,
    subtotal DECIMAL(12,2) GENERATED ALWAYS AS ((quantity * unit_price) - discount) STORED
);
CREATE TABLE order_delivery (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES order_online(id),
    delivery_method_id INT REFERENCES delivery_method(id),
    tracking_code VARCHAR(100),
    delivery_status VARCHAR(20) DEFAULT 'ASSIGNED' 
        CHECK (delivery_status IN ('ASSIGNED','IN_TRANSIT','DELIVERED','RETURNED','CANCELLED')),
    cod_amount DECIMAL(12,2) DEFAULT 0,
    cod_collected BOOLEAN DEFAULT FALSE,
    cod_collected_date TIMESTAMP,
    courier_response JSONB,
    status VARCHAR(1) DEFAULT 'A' CHECK (status IN ('A','I')),
    created_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE order_payment_online (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES order_online(id),
    payment_method_id INT REFERENCES payment_method(id),
    transaction_id VARCHAR(100),
    amount DECIMAL(12,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING','SUCCESS','FAILED','REFUNDED','COLLECTED')),
    provider_response JSONB,
    paid_at TIMESTAMP,
    record_status VARCHAR(1) DEFAULT 'A' CHECK (record_status IN ('A','I')),
    created_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE product_review (
  id SERIAL PRIMARY KEY,
  product_id INT REFERENCES product(id),
  customer_id INT REFERENCES customer(id),
  rating NUMERIC(2,1) CHECK (rating BETWEEN 0 AND 5),
  title VARCHAR(100),
  comment TEXT,
  helpful_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE product_review_image (
  id SERIAL PRIMARY KEY,
  review_id INT REFERENCES product_review(id),
  image_url TEXT
);
-- TEMPLATE
CREATE TABLE template (
    id SERIAL PRIMARY KEY,
    template_name VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(1) DEFAULT 'A' CHECK (status IN ('A', 'I')),
    created_by INT REFERENCES users(id),
    creation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_update INT REFERENCES users(id),
    last_update_date TIMESTAMP
);

-- TEMPLATE_SECTION
CREATE TABLE template_section (
    id SERIAL PRIMARY KEY,
    template_id INT REFERENCES template(id) ON DELETE CASCADE,
    section_name VARCHAR(100) NOT NULL,
    section_key VARCHAR(50) NOT NULL,
    section_type VARCHAR(50),
    config_data JSONB,
    sort_order INT DEFAULT 0,
    status VARCHAR(1) DEFAULT 'A' CHECK (status IN ('A', 'I')),
    created_by INT REFERENCES users(id),
    creation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_update INT REFERENCES users(id),
    last_update_date TIMESTAMP
);

