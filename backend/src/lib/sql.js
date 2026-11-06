export const RESOURCE_COLS = `r.id, r.owner_id, u.full_name AS owner_name, u.city AS owner_city, r.category_id, c.name AS category,
 r.name, r.description, r.price_per_hour, r.address, r.latitude, r.longitude, r.availability_status, r.image_url, r.is_demo, r.is_suspended,
 COALESCE(rv.avg_rating, 0) AS avg_rating, COALESCE(rv.review_count, 0) AS review_count`
export const RESOURCE_FROM = `FROM resources r JOIN users u ON u.id = r.owner_id JOIN categories c ON c.id = r.category_id
 LEFT JOIN (SELECT resource_id, ROUND(AVG(rating), 1) AS avg_rating, COUNT(*) AS review_count FROM reviews GROUP BY resource_id) rv ON rv.resource_id = r.id`
