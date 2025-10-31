const getGradeRemark = (average) => {
  if (typeof average !== 'number' || isNaN(average)) {
    return { grade: null, remark: 'Invalid score' };
  }

  if (average >= 90) {
    return {
      grade: 'Exceeding Expectations 2',
      remark: 'Consistently applies skills and understands deeply'
    };
  }

  if (average >= 80) {
    return {
      grade: 'Exceeding Expectations 1',
      remark: 'Often goes beyond grade-level expectations'
    };
  }

  if (average >= 70) {
    return {
      grade: 'Meeting Expectations 2',
      remark: 'Demonstrates solid understanding and application'
    };
  }

  if (average >= 60) {
    return {
      grade: 'Meeting Expectations 1',
      remark: 'Meets grade-level outcomes with minor support'
    };
  }

  if (average >= 50) {
    return {
      grade: 'Approaching Expectations 2',
      remark: 'Beginning to meet expectations but needs guidance'
    };
  }

  if (average >= 40) {
    return {
      grade: 'Approaching Expectations 1',
      remark: 'Showing progress but requires regular support'
    };
  }

  if (average >= 30) {
    return {
      grade: 'Below Expectations 2',
      remark: 'Needs fundamental support to develop competencies'
    };
  }

  return {
    grade: 'Below Expectations 1',
    remark: 'Limited evidence of required skills or understanding'
  };
};

module.exports = { getGradeRemark };
