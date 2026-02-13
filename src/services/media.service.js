/* =========================================================
   MEDIA SERVICE
   - Builds media URL from stored key
========================================================= */

const getMediaUrl = (key) => {
  if (!key) return null;
  const base = process.env.MEDIA_BASE_URL || "";
  return base ? `${base}/${key}` : `/${key}`;
};

module.exports = { getMediaUrl };
