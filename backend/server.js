const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const he = require("he");

// Import routes
const mainRoutes = require("./routes/mainRoutes");
const userRoutes = require("./routes/userRoutes");
const milestoneRoutes = require("./routes/milestoneRoutes");
const quizRoutes = require("./routes/quizRoutes");
const badgeRoutes = require("./routes/badgeRoutes");
const adminRoutes = require("./routes/adminRoutes");
const resourceRoutes = require("./routes/resourceRoutes");
const { r } = require("tar");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const sanitizeHTML = (req, res, next) => {
  if (req.body) {
    for (let key in req.body) {
      if (typeof req.body[key] === "string") {
        // HTML encode to prevent XSS
        req.body[key] = he.encode(req.body[key]);
      }
    }
  }
  next();
};

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(sanitizeHTML);

// Trust proxy (for getting real IP addresses)
app.set("trust proxy", 1);

// Routes
app.use("/", mainRoutes);
app.use("/users", userRoutes);
app.use("/milestones", milestoneRoutes);
app.use("/quizzes", quizRoutes);
app.use("/badges", badgeRoutes);
app.use("/admin", adminRoutes);
app.use("/resources", resourceRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong!" });
});

app.use((req, res, next) => {
  if (req.body) {
    const sanitizeObject = (obj) => {
      for (let key in obj) {
        if (typeof obj[key] === "string") {
          // Remove script tags and encode HTML
          obj[key] = he.encode(
            obj[key].replace(
              /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
              ""
            )
          );
        } else if (typeof obj[key] === "object" && obj[key] !== null) {
          sanitizeObject(obj[key]);
        }
      }
    };
    sanitizeObject(req.body);
  }
  next();
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Admin Panel: http://localhost:${PORT}/admin`);
});
