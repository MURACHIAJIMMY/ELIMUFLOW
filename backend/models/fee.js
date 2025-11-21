const mongoose = require('mongoose');

const feeSchema = new mongoose.Schema({
  // 🔑 Unique receipt number (generated per transaction)
  receiptNo: {
    type: String,
    required: true,
    unique: true
  },

  // 👤 Student reference
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true
  },

  // 🏫 School reference
  school: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "School",
    required: true
  },

  // 📚 Academic context
  academicYear: {
    type: Number,
    default: () => new Date().getFullYear()
  },
  term: {
    type: String,
    required: true // e.g. "Term 1", "Term 2"
  },

  // 💰 Finance details
  termFee: {
    type: Number,
    required: true // total fee expected for the term
  },
  amountPaid: {
    type: Number,
    required: true // this transaction’s payment
  },
  cumulativePaid: {
    type: Number,
    required: true // total paid so far for this term
  },
  balance: {
    type: Number,
    required: true // termFee - cumulativePaid
  },

  // 🕒 Payment metadata
  dateOfPayment: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// 🔧 Pre-save hook to auto-calculate cumulativePaid + balance
feeSchema.pre("save", async function (next) {
  if (!this.isModified("amountPaid")) return next();

  const Fee = this.constructor; // ✅ safer than mongoose.model("Fee")

  // Sum all previous payments for this student/term/year
  const totalPaid = await Fee.aggregate([
    { $match: { student: this.student, term: this.term, academicYear: this.academicYear } },
    { $group: { _id: null, sum: { $sum: "$amountPaid" } } }
  ]);

  const previousTotal = totalPaid[0]?.sum || 0;
  this.cumulativePaid = previousTotal + this.amountPaid;
  this.balance = this.termFee - this.cumulativePaid;

  next();
});

module.exports = mongoose.model('Fee', feeSchema);
