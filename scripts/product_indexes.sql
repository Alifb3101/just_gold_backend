
-- Ensures primary key and unique constraints exist without failing if they already do.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_pkey'
  ) THEN
    ALTER TABLE products ADD CONSTRAINT products_pkey PRIMARY KEY (id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_slug_key'
  ) THEN
    ALTER TABLE products ADD CONSTRAINT products_slug_key UNIQUE (slug);
  END IF;
END
$$;

-- Performance indexes for common filters and joins
CREATE INDEX IF NOT EXISTS idx_products_is_active_created_at
  ON products (is_active, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_products_category_id
  ON products (category_id);

CREATE INDEX IF NOT EXISTS idx_product_variants_product_id
  ON product_variants (product_id);

CREATE INDEX IF NOT EXISTS idx_product_images_product_id
  ON product_images (product_id);

-- Composite indexes for filter-heavy fields
CREATE INDEX IF NOT EXISTS idx_products_active_category_price
  ON products (is_active, category_id, base_price, id);

CREATE INDEX IF NOT EXISTS idx_products_active_price
  ON products (is_active, base_price, id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'rating'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_products_active_rating
      ON products (is_active, rating, id);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_variants_product_price
  ON product_variants (product_id, price, id);

CREATE INDEX IF NOT EXISTS idx_variants_product_color_size
  ON product_variants (product_id, shade, variant_model_no);
