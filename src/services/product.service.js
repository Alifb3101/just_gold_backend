const PAGE_SIZE = 20;

const SORT_OPTIONS = {
	price_low: { orderBy: "effective_price", direction: "ASC" },
	price_high: { orderBy: "effective_price", direction: "DESC" },
	newest: { orderBy: "p.created_at", direction: "DESC" },
	popular: { orderBy: "p.base_stock", direction: "DESC" },
};

const toNumber = (raw) => {
	// Treat undefined, null, and empty string as null to avoid accidental 0 filters
	if (raw === undefined || raw === null || raw === "") return null;
	const value = Number(raw);
	return Number.isFinite(value) ? value : null;
};

const normalizeFilters = (filters) => {
	return {
		categoryId: toNumber(filters.categoryId),
		minPrice: toNumber(filters.minPrice),
		maxPrice: toNumber(filters.maxPrice),
		color: filters.color ? String(filters.color).trim() : null,
		size: filters.size ? String(filters.size).trim() : null,
		sort: SORT_OPTIONS[filters.sort] ? filters.sort : "newest",
		cursor: toNumber(filters.cursor),
	};
};

const buildCacheKey = (filters) => {
	const normalized = normalizeFilters(filters);
	const parts = [
		`cat:${normalized.categoryId ?? "all"}`,
		`min:${normalized.minPrice ?? "none"}`,
		`max:${normalized.maxPrice ?? "none"}`,
		`color:${normalized.color ?? "all"}`,
		`size:${normalized.size ?? "all"}`,
		`sort:${normalized.sort}`,
		`cursor:${normalized.cursor ?? 0}`,
	];
	return `products:${parts.join("|")}`;
};

const buildProductsQuery = (rawFilters = {}) => {
	const filters = normalizeFilters(rawFilters);
	const values = [];
	const where = ["p.is_active = true"];

	if (filters.categoryId !== null) {
		values.push(filters.categoryId);
		const idx = values.length;
		// Match products saved under a subcategory by accepting either the category id or its parent id.
		where.push(`EXISTS (SELECT 1 FROM categories c WHERE c.id = p.category_id AND (c.id = $${idx} OR c.parent_id = $${idx}))`);
	}

	if (filters.minPrice !== null) {
		values.push(filters.minPrice);
		where.push(`COALESCE(variant.price, p.base_price) >= $${values.length}`);
	}

	if (filters.maxPrice !== null) {
		values.push(filters.maxPrice);
		where.push(`COALESCE(variant.price, p.base_price) <= $${values.length}`);
	}

	if (filters.color) {
		values.push(`%${filters.color}%`);
		const idx = values.length;
		where.push(
			`EXISTS (SELECT 1 FROM product_variants pv_color WHERE pv_color.product_id = p.id AND (pv_color.shade ILIKE $${idx} OR pv_color.color_type ILIKE $${idx}))`
		);
	}

	if (filters.size) {
		values.push(filters.size);
		where.push(
			`EXISTS (SELECT 1 FROM product_variants pv_size WHERE pv_size.product_id = p.id AND pv_size.variant_model_no = $${values.length})`
		);
	}

	const sortMeta = SORT_OPTIONS[filters.sort] || SORT_OPTIONS.newest;
	const cursorOp = sortMeta.direction === "ASC" ? ">" : "<";

	if (filters.cursor !== null) {
		values.push(filters.cursor);
		where.push(`p.id ${cursorOp} $${values.length}`);
	}

	const orderClause = `${sortMeta.orderBy} ${sortMeta.direction}, p.id ${sortMeta.direction}`;

	const text = `
		SELECT
			p.id,
			p.name,
			p.slug,
			p.category_id,
			p.base_price,
			p.base_stock,
			p.thumbnail,
			p.thumbnail_key,
			p.afterimage,
			p.afterimage_key,
			p.created_at,
			COALESCE(variant.price, p.base_price) AS effective_price
		FROM products p
		LEFT JOIN LATERAL (
			SELECT pv.price, pv.shade, pv.variant_model_no
			FROM product_variants pv
			WHERE pv.product_id = p.id
			ORDER BY pv.price NULLS LAST
			LIMIT 1
		) AS variant ON TRUE
		WHERE ${where.join(" AND ")}
		ORDER BY ${orderClause}
		LIMIT ${PAGE_SIZE + 1}
	`;

	return { text, values, limit: PAGE_SIZE };
};

module.exports = {
	PAGE_SIZE,
	SORT_OPTIONS,
	buildProductsQuery,
	buildCacheKey,
	normalizeFilters,
};
