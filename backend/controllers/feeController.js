// controllers/feeController.js
const Student = require('../models/student');
const Class = require('../models/class');
const Fee = require('../models/fee');
const { generateReceiptNo } = require('../utils/receipt');

// ➕ Create a new fee transaction
const createFee = async (req, res) => {
  try {
    const { admNo, termFee, amountPaid, term } = req.body;
    const year = new Date().getFullYear();

    const student = await Student.findOne({ admNo }).populate("class school");
    if (!student) return res.status(404).json({ error: "Student not found" });

    const receiptNo = await generateReceiptNo(student.school, year);

    const totalPaid = await Fee.aggregate([
      { $match: { student: student._id, term, academicYear: year } },
      { $group: { _id: null, sum: { $sum: "$amountPaid" } } }
    ]);
    const previousTotal = totalPaid[0]?.sum || 0;
    const cumulativePaid = previousTotal + amountPaid;
    const balance = termFee - cumulativePaid;

    const fee = new Fee({
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
    await fee.save();

    res.status(201).json({
      message: "Fee recorded successfully",
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
        dateOfPayment: fee.dateOfPayment
      }
    });
  } catch (err) {
    console.error("[createFee]", err);
    res.status(500).json({ error: "Error recording fee" });
  }
};

// 📄 Get latest receipt by AdmNo
const getReceiptByAdmNo = async (req, res) => {
  try {
    const { admNo } = req.params;
    const student = await Student.findOne({ admNo }).populate("class pathway school");
    if (!student) return res.status(404).json({ error: "Student not found" });

    const fee = await Fee.findOne({ student: student._id }).sort({ dateOfPayment: -1 });
    if (!fee) return res.status(404).json({ error: "No fee record found" });

    res.json({
      receiptNo: fee.receiptNo,
      student: {
        admNo: student.admNo,
        name: student.name,
        class: student.class?.name,
        grade: student.currentGrade,
        pathway: student.pathway?.name,
        school: student.school?.name
      },
      termFee: fee.termFee,
      amountPaid: fee.amountPaid,
      cumulativePaid: fee.cumulativePaid,
      balance: fee.balance,
      dateOfPayment: fee.dateOfPayment
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
      const fee = await Fee.findOne({ student: s._id }).sort({ dateOfPayment: -1 });

      return {
        admNo: s.admNo,
        name: s.name,
        termFee: fee?.termFee ?? 0,
        cumulativePaid: fee?.cumulativePaid ?? 0,
        balance: fee?.balance ?? 0
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
  createFee,
  getReceiptByAdmNo,
  getClassFeesListByName
};
