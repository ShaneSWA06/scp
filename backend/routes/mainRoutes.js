const express = require("express");
const router = express.Router();

// Health check or welcome
router.get("/", (req, res) => {
  res.json({ message: "Welcome to the SoC AR Time Machine API!" });
});

module.exports = router;
