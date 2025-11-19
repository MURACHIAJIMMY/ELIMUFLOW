const subjectPools = {
  Compulsory: [
    { name: 'English', code: 'ENG', lessonsPerWeek: 5 },
    { name: 'Kiswahili', code: 'KISW', lessonsPerWeek: 5 },
    { name: 'Kenya Sign Language', code: 'KSL', lessonsPerWeek: 5 },
    { name: 'CORE-Mathematics', code: 'MATH-CORE', lessonsPerWeek: 5 },
    { name: 'ESS-Mathematics', code: 'MATH-ESS', lessonsPerWeek: 5 },
    { name: 'Community Service Learning', code: 'CSL', lessonsPerWeek: 3 }
  ],
  STEM: [
    { name: 'Biology', code: 'BIO', lessonsPerWeek: 5 },
    { name: 'Chemistry', code: 'CHEM', lessonsPerWeek: 5 },
    { name: 'Physics', code: 'PHY', lessonsPerWeek: 5 },
    { name: 'General Science', code: 'GENSCI', lessonsPerWeek: 5 },
    { name: 'Agriculture', code: 'AGRIC', lessonsPerWeek: 5 },
    { name: 'Computer Science', code: 'CS', lessonsPerWeek: 5 },
    { name: 'Home Science', code: 'HOMESCI', lessonsPerWeek: 5 },
    { name: 'Aviation', code: 'AVIATION', lessonsPerWeek: 5 },
    { name: 'Building Construction', code: 'BUILD', lessonsPerWeek: 5 },
    { name: 'Electricity', code: 'ELECTRICITY', lessonsPerWeek: 5 },
    { name: 'Woodwork', code: 'WOODWORK', lessonsPerWeek: 5 },
    { name: 'Metalwork', code: 'METALWORK', lessonsPerWeek: 5 },
    { name: 'Power Mechanics', code: 'POWERMECH', lessonsPerWeek: 5 },
    { name: 'Marine Technology', code: 'MARINE', lessonsPerWeek: 5 }
  ],
  'Social Sciences': [
    { name: 'Literature in English', code: 'LITENG', lessonsPerWeek: 5 },
    { name: 'Indigenous Languages', code: 'INDLANG', lessonsPerWeek: 5 },
    { name: 'Fasihi ya Kiswahili', code: 'FASIHIKISW', lessonsPerWeek: 5 },
    { name: 'Arabic', code: 'ARABIC', lessonsPerWeek: 5 },
    { name: 'French', code: 'FRENCH', lessonsPerWeek: 5 },
    { name: 'German', code: 'GERMAN', lessonsPerWeek: 5 },
    { name: 'Mandarin Chinese', code: 'MANDARIN', lessonsPerWeek: 5 },
    { name: 'Christian Religious Education', code: 'CRE', lessonsPerWeek: 5 },
    { name: 'Islamic Religious Education', code: 'IRE', lessonsPerWeek: 5 },
    { name: 'Hindu Religious Education', code: 'HRE', lessonsPerWeek: 5 },
    { name: 'Business Studies', code: 'BST', lessonsPerWeek: 5 },
    { name: 'History and Citizenship', code: 'HISTCIV', lessonsPerWeek: 5 },
    { name: 'Geography', code: 'GEO', lessonsPerWeek: 5 }
  ],
  'Arts & Sports Science': [
    { name: 'Sports and Recreation', code: 'SPORTS', lessonsPerWeek: 5 },
    { name: 'Music', code: 'MUSIC', lessonsPerWeek: 5 },
    { name: 'Dance', code: 'DANCE', lessonsPerWeek: 5 },
    { name: 'Theatre and Film', code: 'THEATREFILM', lessonsPerWeek: 5 },
    { name: 'Fine Arts', code: 'FINEARTS', lessonsPerWeek: 5 }
  ]
};

// ✅ Utility functions
module.exports = {
  subjectPools,

  getSubjectsByPathway: (pathwayName) => {
    return subjectPools[pathwayName] || [];
  },

  getSubjectsByGroup: (groupName) => {
    return Object.values(subjectPools)
      .flat()
      .filter(subj => subj.group === groupName);
  },

  getCompulsorySubjects: () => {
    return subjectPools['Compulsory'] || [];
  }
};
