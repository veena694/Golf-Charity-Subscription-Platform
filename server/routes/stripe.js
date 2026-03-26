const express = require("express");
const {
  createCheckout,
  createDonationCheckout,
} = require("../controllers/stripeController");

const router = express.Router();

router.post("/create-checkout", createCheckout);
router.post("/create-donation-checkout", createDonationCheckout);

module.exports = router;
