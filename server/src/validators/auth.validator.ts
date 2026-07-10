import { body } from "express-validator";

// Common weak passwords to reject
const COMMON_PASSWORDS = new Set([
  "password", "password1", "password123", "123456", "12345678",
  "qwerty", "abc123", "letmein", "monkey", "1234567890",
  "iloveyou", "admin", "welcome", "login", "pass",
]);

export const registerValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be between 2 and 100 characters"),

  body("email")
    .isEmail()
    .withMessage("A valid email address is required")
    .normalizeEmail()
    .isLength({ max: 254 })
    .withMessage("Email address is too long"),

  body("password")
    .isLength({ min: 8, max: 128 })
    .withMessage("Password must be between 8 and 128 characters")
    .matches(/[A-Z]/)
    .withMessage("Password must contain at least one uppercase letter")
    .matches(/[a-z]/)
    .withMessage("Password must contain at least one lowercase letter")
    .matches(/[0-9]/)
    .withMessage("Password must contain at least one number")
    .custom((value: string) => {
      if (COMMON_PASSWORDS.has(value.toLowerCase())) {
        throw new Error("Password is too common. Please choose a stronger password.");
      }
      return true;
    }),
];

export const loginValidator = [
  body("email")
    .isEmail()
    .withMessage("A valid email address is required")
    .normalizeEmail(),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ max: 128 })
    .withMessage("Invalid password"),
];

export const resetPasswordValidator = [
  body("email")
    .isEmail()
    .withMessage("A valid email address is required")
    .normalizeEmail(),
];