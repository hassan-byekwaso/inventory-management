export function errorHandler(error, _req, res, _next) {
  if (error?.code === "P2002") {
    return res.status(409).json({ error: "A record with that unique value already exists." });
  }
  if (error?.code === "P2025") {
    return res.status(404).json({ error: "The requested record was not found." });
  }
  const status = Number.isInteger(error.status) ? error.status : 500;
  if (status >= 500) console.error(error);
  return res.status(status).json({
    error: status >= 500 ? "An unexpected server error occurred." : error.message,
    ...(error.details ? { details: error.details } : {})
  });
}
