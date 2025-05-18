const express = require("express");
const { body } = require("express-validator");
const userController = require("../controllers/userController");
const loginLimiter = require("../middleware/rateLimiter");

const router = express.Router();

router.post(
  "/register",
  [
    body("full_name")
      .isLength({ min: 3 })
      .withMessage("Name must be at least 3 characters"),
    body("email").isEmail().withMessage("Invalid email format"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
  ],
  userController.register
);

router.post(
  "/login",
  loginLimiter,
  [
    body("email").isEmail().withMessage("Enter a valid email"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  userController.login
);

module.exports = router;
