const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const isAdmin = async (req, res, next) => {
  try {
    // 1. Check if user exists in request (from auth middleware)
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        error: "Authentication required",
        code: "AUTH_REQUIRED",
      });
    }

    // 2. Verify JWT token again for admin-specific checks
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        error: "Access token required",
        code: "TOKEN_MISSING",
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET_KEY, {
        algorithms: [process.env.JWT_ALGORITHM || "HS256"],
      });
    } catch (jwtError) {
      return res.status(403).json({
        error: "Invalid or expired token",
        code: "TOKEN_INVALID",
      });
    }

    // 3. Double-check user existence and role in database
    const userResult = await pool.query(
      "SELECT id, email, role, full_name FROM users WHERE id = $1 AND role = 'admin'",
      [decoded.id]
    );

    if (userResult.rows.length === 0) {
      // Log potential security breach attempt
      console.warn(`🚨 SECURITY ALERT: Unauthorized admin access attempt`, {
        userId: decoded.id,
        email: decoded.email,
        timestamp: new Date().toISOString(),
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get("User-Agent"),
      });

      return res.status(403).json({
        error: "Access denied. Administrator privileges required.",
        code: "ADMIN_REQUIRED",
      });
    }

    const user = userResult.rows[0];

    // 4. Verify role consistency between token and database
    if (decoded.role !== "admin" || user.role !== "admin") {
      console.warn(`🚨 SECURITY ALERT: Role mismatch detected`, {
        tokenRole: decoded.role,
        dbRole: user.role,
        userId: user.id,
        timestamp: new Date().toISOString(),
      });

      return res.status(403).json({
        error: "Access denied. Invalid role permissions.",
        code: "ROLE_MISMATCH",
      });
    }

    // 5. Additional security checks
    const currentTime = Math.floor(Date.now() / 1000);

    // Check token expiry
    if (decoded.exp && decoded.exp < currentTime) {
      return res.status(403).json({
        error: "Token expired. Please login again.",
        code: "TOKEN_EXPIRED",
      });
    }

    // 6. Rate limiting for admin actions (optional)
    const adminActionLimit = 100; // Max 100 admin actions per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // This could be implemented with Redis for better performance
    // For now, we'll skip rate limiting but log the action

    // 7. Log successful admin access for audit trail
    console.log(`✅ Admin access granted`, {
      userId: user.id,
      email: user.email,
      action: `${req.method} ${req.path}`,
      timestamp: new Date().toISOString(),
      ip: req.ip || req.connection.remoteAddress,
    });

    // 8. Attach verified user data to request
    req.admin = {
      id: user.id,
      email: user.email,
      name: user.full_name,
      role: user.role,
      verifiedAt: new Date().toISOString(),
    };

    next();
  } catch (error) {
    console.error(`❌ Admin middleware error:`, error);
    return res.status(500).json({
      error: "Internal server error during authorization",
      code: "AUTH_ERROR",
    });
  }
};

module.exports = isAdmin;
