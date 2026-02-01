const express = require('express');
const { createExpense, getExpenses } = require('../controllers/expenseController');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

router.post('/', asyncHandler(createExpense));
router.get('/', asyncHandler(getExpenses));

module.exports = router;
