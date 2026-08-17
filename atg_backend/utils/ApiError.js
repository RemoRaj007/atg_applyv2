class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }

  /**
   * Tags this error with a stable code so clients can show it in the user's own
   * language: `throw ApiError.unauthorized("Invalid email or password").withCode(
   * ERROR_CODES.AUTH_INVALID_CREDENTIALS)`.
   *
   * A 4xx keeps its specific English message unless a code is attached here on
   * purpose — deriving codes from the status alone would flatten every "Job not
   * found" into a generic sentence. This is how a throw site opts in.
   */
  withCode(errorCode) {
    this.errorCode = errorCode;
    return this;
  }

  static badRequest(message, details) {
    return new ApiError(400, message, details);
  }

  static unauthorized(message = "Unauthorized") {
    return new ApiError(401, message);
  }

  static forbidden(message = "Access denied: insufficient permissions") {
    return new ApiError(403, message);
  }

  static notFound(message = "Resource not found") {
    return new ApiError(404, message);
  }

  static conflict(message = "Resource already exists") {
    return new ApiError(409, message);
  }

  // For a dependency this API calls out to that failed or could not be reached.
  // 500 would say "this API is broken", which sends whoever is on call looking
  // in the wrong place.
  static badGateway(message = "An upstream service is unavailable") {
    return new ApiError(502, message);
  }
}

module.exports = ApiError;
