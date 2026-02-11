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
