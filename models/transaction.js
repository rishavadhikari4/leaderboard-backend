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

const Transaction_model = mongoose.model("transaction", transaction_schema);

export default Transaction_model;