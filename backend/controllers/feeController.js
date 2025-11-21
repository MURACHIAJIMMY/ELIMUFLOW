// controllers/financeController.js
const Student = require('../models/student');
const Class = require('../models/class');
const Payment = require('../models/fee');
const { generateReceiptNo } = require('../utils/receipt'); // ✅ import helper

// 📌 Create a new payment (supports partial payments)
const createPayment = async (req, res) => {
  try {
    const { admNo, termFee, amountPaid, term } = req.body;
    const year = new Date().getFullYear();

    // Find student
    const student = await Student.findOne({ admNo }).populate("class school");
    if (!student) return res.status(404).json({ error: "Student not found" });

    // Generate receipt number
    const receiptNo = await generateReceiptNo(student.school, year);

    // Calculate cumulative paid so far
    const totalPaid = await Payment.aggregate([
      { $match: { student: student._id, term, academicYear: year } },
      { $group: { _id: null, sum: { $sum: "$amountPaid" } } }
    ]);
    const previousTotal = totalPaid[0]?.sum || 0;
    const cumulativePaid = previousTotal + amountPaid;
    const balance = termFee - cumulativePaid;

    // Save payment record
    const payment = new Payment({
      receiptNo,
      student: student._id,
      school: student.school._id,
      academicYear: year,
      term,
      termFee,
      amountPaid,
      cumulativePaid,
      balance
    });
    await payment.save();

    res.status(201).json({
      message: "Payment recorded successfully",
      receipt: {
        receiptNo,
        student: {
          admNo: student.admNo,
          name: student.name,
          class: student.class?.name,
          grade: student.currentGrade,
          school: student.school?.name
        },
        termFee,
        amountPaid,
        cumulativePaid,
        balance,
        dateOfPayment: payment.dateOfPayment
      }
    });
  } catch (err) {
    console.error("[createPayment]", err);
    res.status(500).json({ error: "Error recording payment" });
  }
};

// 📄 Get latest receipt by AdmNo
const getReceiptByAdmNo = async (req, res) => {
  try {
    const { admNo } = req.params;
    const student = await Student.findOne({ admNo }).populate("class pathway school");
    if (!student) return res.status(404).json({ error: "Student not found" });

    const payment = await Payment.findOne({ student: student._id })
      .sort({ dateOfPayment: -1 });

    if (!payment) return res.status(404).json({ error: "No payment found" });

    res.json({
      receiptNo: payment.receiptNo,
      student: {
        admNo: student.admNo,
        name: student.name,
        class: student.class?.name,
        grade: student.currentGrade,
        pathway: student.pathway?.name,
        school: student.school?.name
      },
      termFee: payment.termFee,
      amountPaid: payment.amountPaid,
      cumulativePaid: payment.cumulativePaid,
      balance: payment.balance,
      dateOfPayment: payment.dateOfPayment
    });
  } catch (err) {
    console.error("[getReceiptByAdmNo]", err);
    res.status(500).json({ error: "Error fetching receipt" });
  }
};

// 📊 Get class fees list by class name
const getClassFeesListByName = async (req, res) => {
  try {
    const { className } = req.params;
    const classObj = await Class.findOne({ name: className }).populate("school");
    if (!classObj) return res.status(404).json({ error: "Class not found" });

    const students = await Student.find({ class: classObj._id }).populate("school");

    const list = await Promise.all(students.map(async (s) => {
      const payment = await Payment.findOne({ student: s._id })
        .sort({ dateOfPayment: -1 });

      return {
        admNo: s.admNo,
        name: s.name,
        termFee: payment?.termFee ?? 0,
        cumulativePaid: payment?.cumulativePaid ?? 0,
        balance: payment?.balance ?? 0
      };
    }));

    res.json({
      school: {
        name: classObj.school?.name,
        logo: classObj.school?.logo,
        class: classObj.name,
        grade: classObj.grade
      },
      students: list
    });
  } catch (err) {
    console.error("[getClassFeesListByName]", err);
    res.status(500).json({ error: "Error fetching class fees list" });
  }
};

module.exports = {
  createPayment,
  getReceiptByAdmNo,
  getClassFeesListByName
};
