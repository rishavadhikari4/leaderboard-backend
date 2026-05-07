import mongoose from "mongoose";

const transaction_schema = mongoose.Schema({
  invoice_id: {
    type: String,
    required: true,
  },
  admin_id: {
    type: String,
    required: true,
  },
  admin_name: {
    type: String,
    required: true,
  },
  source: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

// Primary index for all time-window queries (today/month/range).
transaction_schema.index({ date: 1 }, { name: "idx_date" });

// Optimizes monthly top-admin aggregation after date-range match.
transaction_schema.index({ date: 1, admin_id: 1 }, { name: "idx_date_admin" });

// Prevent duplicate payment inserts from the same source/invoice.
transaction_schema.index(
  { source: 1, invoice_id: 1 },
  { unique: true, name: "uniq_source_invoice" },
);

const Transaction_model = mongoose.model("transaction", transaction_schema);

export default Transaction_model;
