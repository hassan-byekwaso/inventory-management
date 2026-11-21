import { AppError } from "../utils/errors.js";

export function validate(schema, source = "body") {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return next(new AppError(400, "Invalid request data.", result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message
      }))));
    }
    req[source] = result.data;
    next();
  };
}
