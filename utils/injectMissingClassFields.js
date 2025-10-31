const Class = require('../models/class');

const injectMissingClassFields = async () => {
  try {
    const classes = await Class.find({});
    const currentYear = new Date().getFullYear();

    let updated = 0;
    const auditTrail = [];

    for (const cls of classes) {
      let changed = false;

      if (typeof cls.isDefault === 'undefined') {
        cls.isDefault = false;
        changed = true;
      }

      if (!cls.academicYear) {
        cls.academicYear = currentYear;
        changed = true;
      }

      if (changed) {
        await cls.save();
        updated++;
        auditTrail.push({
          name: cls.name,
          grade: cls.grade,
          stream: cls.stream,
          updatedFields: {
            isDefault: cls.isDefault,
            academicYear: cls.academicYear
          }
        });
      }
    }

    console.log(`✅ Injected missing fields into ${updated} class records`);
    console.table(auditTrail);
    return { updated, auditTrail };
  } catch (err) {
    console.error('[InjectMissingClassFields]', err);
    throw err;
  }
};

module.exports = injectMissingClassFields;
