const { scienceWeighted, simpleAverage, tripleAverage } = require('./gradingLogicMap');

const computeSubjectScore = (papers, subjectName) => {
  if (!subjectName || typeof subjectName !== 'string') return -1;
  const name = subjectName.toLowerCase();

  // 🧪 Weighted logic for science subjects
  if (papers.length === 3 && scienceWeighted.includes(name)) {
    const p1 = papers.find(p => p.paperNo === 1)?.score ?? -1;
    const p2 = papers.find(p => p.paperNo === 2)?.score ?? -1;
    const p3 = papers.find(p => p.paperNo === 3)?.score ?? -1;
    return ((Math.max(p1, 0) + Math.max(p2, 0)) * 0.375) + Math.max(p3, 0);
  }

  // 💼 Simple average logic for business studies
  if (papers.length === 2 && simpleAverage.includes(name)) {
    const p1 = papers.find(p => p.paperNo === 1)?.score ?? -1;
    const p2 = papers.find(p => p.paperNo === 2)?.score ?? -1;
    return (Math.max(p1, 0) + Math.max(p2, 0)) / 2;
  }

  // 📚 Triple average logic for English/Kiswahili
  if (papers.length === 3 && tripleAverage.includes(name)) {
    const p1 = papers.find(p => p.paperNo === 1)?.score ?? -1;
    const p2 = papers.find(p => p.paperNo === 2)?.score ?? -1;
    const p3 = papers.find(p => p.paperNo === 3)?.score ?? -1;
    return (Math.max(p1, 0) + Math.max(p2, 0) + Math.max(p3, 0)) / 3;
  }

  // 🧾 Single-paper subjects normalized to 100
  if (papers.length === 1) {
    const { score, total } = papers[0];
    return total > 0 ? (Math.max(score, 0) / total) * 100 : 0;
  }

  // 🧮 Fallback: normalize all papers
  const totalScore = papers.reduce((sum, p) => sum + Math.max(p.score, 0), 0);
  const totalMax = papers.reduce((sum, p) => sum + p.total, 0);
  return totalMax > 0 ? (totalScore / totalMax) * 100 : 0;
};

module.exports = { computeSubjectScore };
