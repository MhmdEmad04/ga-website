CREATE SCHEMA IF NOT EXISTS garbalia;
CREATE TABLE IF NOT EXISTS garbalia.categories (
  name text PRIMARY KEY CHECK (length(name) BETWEEN 1 AND 60),
  parent_name text REFERENCES garbalia.categories(name),
  CHECK (parent_name IS DISTINCT FROM name)
);
CREATE TABLE IF NOT EXISTS garbalia.products (
  id text PRIMARY KEY, slug text NOT NULL UNIQUE,
  name text NOT NULL, subtitle text NOT NULL, description text NOT NULL,
  features jsonb NOT NULL DEFAULT '[]', category text NOT NULL REFERENCES garbalia.categories(name),
  price integer NOT NULL CHECK (price BETWEEN 1 AND 100000),
  default_color text NOT NULL CHECK (default_color IN ('black','beige','camel')),
  active boolean NOT NULL DEFAULT true, version integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS garbalia.variants (
  product_id text NOT NULL REFERENCES garbalia.products(id),
  color text NOT NULL CHECK (color IN ('black','beige','camel')),
  stock integer NOT NULL CHECK (stock BETWEEN 0 AND 100000),
  image text NOT NULL, PRIMARY KEY (product_id, color)
);
CREATE TABLE IF NOT EXISTS garbalia.orders (
  id uuid PRIMARY KEY, number text NOT NULL UNIQUE,
  idempotency_key uuid NOT NULL UNIQUE, request_hash text NOT NULL,
  customer jsonb NOT NULL,
  subtotal integer NOT NULL CHECK (subtotal > 0),
  shipping integer NOT NULL CHECK (shipping IN (80,120)),
  total integer NOT NULL CHECK (total = subtotal + shipping),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','preparing','shipped','delivered','cancelled')),
  payment_status text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','collected')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS garbalia.order_items (
  order_id uuid NOT NULL REFERENCES garbalia.orders(id),
  product_id text NOT NULL REFERENCES garbalia.products(id), color text NOT NULL,
  name text NOT NULL, image text NOT NULL,
  unit_price integer NOT NULL CHECK (unit_price > 0), quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 30),
  PRIMARY KEY (order_id, product_id, color),
  FOREIGN KEY (product_id,color) REFERENCES garbalia.variants(product_id,color)
);
CREATE TABLE IF NOT EXISTS garbalia.admins (
  id uuid PRIMARY KEY, email text NOT NULL UNIQUE, password_hash text NOT NULL
);
CREATE TABLE IF NOT EXISTS garbalia.sessions (
  token_hash text PRIMARY KEY, admin_id uuid NOT NULL REFERENCES garbalia.admins(id),
  expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS garbalia.order_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES garbalia.orders(id),
  admin_id uuid REFERENCES garbalia.admins(id),
  action text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS garbalia.rate_limits (
  key text PRIMARY KEY, count integer NOT NULL, expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS garbalia.media (
  id uuid PRIMARY KEY, mime text NOT NULL, bytes bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS orders_created ON garbalia.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS sessions_expiry ON garbalia.sessions(expires_at);
CREATE INDEX IF NOT EXISTS rates_expiry ON garbalia.rate_limits(expires_at);
-- No public API role can read customer data. Only the server database role is used.
ALTER TABLE garbalia.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE garbalia.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE garbalia.variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE garbalia.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE garbalia.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE garbalia.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE garbalia.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE garbalia.order_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE garbalia.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE garbalia.media ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON SCHEMA garbalia FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA garbalia FROM PUBLIC;
