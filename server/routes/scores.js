const express = require("express");
const { addScore, getScores, updateScore } = require("../controllers/scoreController");

const router = express.Router();

router.get("/:userId", getScores);
router.post("/", addScore);
router.post("/:scoreId", updateScore);

module.exports = router;
