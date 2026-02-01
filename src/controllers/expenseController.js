const Expense = require('../models/Expense');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

function expenseToResponse(doc) {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    id: o._id.toString(),
    amount: typeof o.amount === 'number' ? o.amount : parseFloat(o.amount?.toString?.() ?? o.amount),
    category: o.category,
    description: o.description ?? '',
    date: o.date,
    created_at: o.createdAt,
  };
}

function validateCreateBody(body) {
  const errors = [];
  if (body.amount == null || (typeof body.amount !== 'number' && isNaN(parseFloat(body.amount))))
    errors.push('amount is required and must be a number');
  if (!body.category || typeof body.category !== 'string' || !body.category.trim())
    errors.push('category is required and must be a non-empty string');
  if (body.description != null && typeof body.description !== 'string')
    errors.push('description must be a string');
  if (!body.date) errors.push('date is required');
  else {
    const d = new Date(body.date);
    if (Number.isNaN(d.getTime())) errors.push('date must be a valid date');
  }
  return errors;
}

async function createExpense(req, res) {
  const validationErrors = validateCreateBody(req.body);
  if (validationErrors.length > 0) {
    logger.warn('Validation failed for POST /expenses', { details: validationErrors });
    return res.status(400).json({ error: 'Validation failed', details: validationErrors });
  }

  const amount = mongoose.Types.Decimal128.fromString(String(req.body.amount));
  const date = new Date(req.body.date);
  const expense = new Expense({
    amount,
    category: String(req.body.category).trim(),
    description: req.body.description != null ? String(req.body.description).trim() : '',
    date,
  });

  await expense.save();
  const responseBody = expenseToResponse(expense);
  logger.info('Expense created', { id: responseBody.id, category: responseBody.category });
  res.status(201).json(responseBody);
}

async function getExpenses(req, res, next) {
  try {
    const { category, sort } = req.query;
    const filter = {};
    if (category != null && String(category).trim() !== '') {
      filter.category = String(category).trim();
    }
    const sortOption = sort === 'date_desc' ? { date: -1 } : {};
    const expenses = await Expense.find(filter).sort(sortOption).lean();
    const list = expenses.map((doc) => ({
      id: doc._id.toString(),
      amount: doc.amount ? parseFloat(doc.amount.toString()) : doc.amount,
      category: doc.category,
      description: doc.description ?? '',
      date: doc.date,
      created_at: doc.createdAt,
    }));
    res.json(list);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createExpense,
  getExpenses,
  expenseToResponse,
};
