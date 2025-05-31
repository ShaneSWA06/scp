const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

// Import routes
const mainRoutes = require("./routes/mainRoutes");
const userRoutes = require("./routes/userRoutes");
const milestoneRoutes = require("./routes/milestoneRoutes");
const quizRoutes = require("./routes/quizRoutes");
const badgeRoutes = require("./routes/badgeRoutes");
const adminRoutes = require("./routes/adminRoutes");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Trust proxy (for getting real IP addresses)
app.set("trust proxy", 1);

// Routes
app.use("/", mainRoutes);
app.use("/users", userRoutes);
app.use("/milestones", milestoneRoutes);
app.use("/quizzes", quizRoutes);
app.use("/badges", badgeRoutes);
app.use("/admin", adminRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong!" });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Admin Panel: http://localhost:${PORT}/admin`);
  console.log(`🔑 Default admin: admin@socar.com / AdminPassword123!`);
});
