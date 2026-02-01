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
  const errors = {};

  const amountNum =
    body.amount != null && (typeof body.amount === 'number' || !isNaN(parseFloat(body.amount)))
      ? parseFloat(body.amount)
      : NaN;
  if (body.amount == null || body.amount === '') {
    errors.amount = 'Amount is required';
  } else if (Number.isNaN(amountNum)) {
    errors.amount = 'Amount must be a number';
  } else if (amountNum <= 0) {
    errors.amount = 'Amount cannot be negative or zero';
  }

  if (!body.category || typeof body.category !== 'string' || !body.category.trim()) {
    errors.category = 'Category cannot be empty';
  }

  if (body.description == null || typeof body.description !== 'string' || !body.description.trim()) {
    errors.description = 'Description cannot be empty';
  }

  if (body.date == null || body.date === '' || (typeof body.date === 'string' && !body.date.trim())) {
    errors.date = 'Date cannot be empty';
  } else {
    const d = new Date(body.date);
    if (Number.isNaN(d.getTime())) errors.date = 'Date must be a valid date';
  }

  return errors;
}

async function createExpense(req, res) {
  const validationErrors = validateCreateBody(req.body);
  const hasErrors = Object.keys(validationErrors).length > 0;
  if (hasErrors) {
    logger.warn('Validation failed for POST /expenses', { details: validationErrors });
    return res.status(400).json({
      error: 'Validation failed',
      details: validationErrors,
    });
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

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

async function getExpenses(req, res, next) {
  try {
    const { category, sort, page: pageParam, limit: limitParam } = req.query;
    const filter = {};
    if (category != null && String(category).trim() !== '') {
      const term = String(category).trim();
      filter.category = new RegExp(escapeRegex(term), 'i');
    }

    const page = Math.max(1, parseInt(pageParam, 10) || DEFAULT_PAGE);
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, parseInt(limitParam, 10) || DEFAULT_LIMIT)
    );
    const skip = (page - 1) * limit;

    const sortOption = sort === 'date_desc' ? { date: -1 } : {};

    const [expenses, total] = await Promise.all([
      Expense.find(filter).sort(sortOption).skip(skip).limit(limit).lean(),
      Expense.countDocuments(filter),
    ]);

    const list = expenses.map((doc) => ({
      id: doc._id.toString(),
      amount: doc.amount ? parseFloat(doc.amount.toString()) : doc.amount,
      category: doc.category,
      description: doc.description ?? '',
      date: doc.date,
      created_at: doc.createdAt,
    }));

    const totalPages = Math.ceil(total / limit) || 1;

    res.json({
      data: list,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createExpense,
  getExpenses,
  expenseToResponse,
};
