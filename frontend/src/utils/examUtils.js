// utils/examUtils.js
const getPreviousExam = (exam) => {
  const sequence = ['Opener', 'Midterm', 'Endterm'];
  const index = sequence.indexOf(exam);
  return index > 0 ? sequence[index - 1] : null;
};

// const getDeviationColor = (deviation) => {
//   if (deviation === null) return 'gray';
//   return deviation >= 0 ? 'green' : 'red';
// };

module.exports = { getPreviousExam, };
