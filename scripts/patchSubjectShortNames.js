require("dotenv").config({ path: "../.env" });


const mongoose = require("mongoose");
const Subject = require("../models/subject");

const subjectsToPatch = [
  { name: "Music and Dance", shortName: "Music/Dance" },
  { name: "Sports and Recreation", shortName: "Sports/Rec" },
  { name: "Theatre and Film", shortName: "Theatre/Film" },
  { name: "Fine Arts", shortName: "Fine Arts" },
  { name: "Fasihi ya Kiswahili", shortName: "Fasihi" },
  { name: "Sign Language", shortName: "Sign Lang" },
  { name: "Arabic", shortName: "Arab" },
  { name: "Mandarin Chinese", shortName: "Mandarin" },
  { name: "Christian Religious Education", shortName: "CRE" },
  { name: "History and Citizenship", shortName: "Hist" },
  { name: "Indigenous Languages", shortName: "Indig. Langs" },
  { name: "Hindu Religious Education", shortName: "HRE" },
  { name: "Business Studies", shortName: "Buss" },
  { name: "French", shortName: "French" },
  { name: "German", shortName: "German" },
  { name: "Islamic Religious Education", shortName: "IRE" },
  { name: "Literature in English", shortName: "Lit" },
  { name: "Geography", shortName: "Geo" },
  { name: "Chemistry", shortName: "Chem" },
  { name: "Physics", shortName: "Phyc" },
  { name: "General Science", shortName: "Gen Scie" },
  { name: "Home Science", shortName: "Home Scie" },
  { name: "Metalwork", shortName: "Metalwork" },
  { name: "Media Technology", shortName: "Media Tech" },
  { name: "Biology", shortName: "Bio" },
  { name: "Aviation", shortName: "Aviation" },
  { name: "Building Construction", shortName: "Building Const." },
  { name: "Electricity", shortName: "Electricity" },
  { name: "Marine and Fisheries Technology", shortName: "Marine/Fisheries Tech" },
  { name: "Agriculture", shortName: "Agri" },
  { name: "Computer Science", shortName: "Comp Sci" },
  { name: "Power Mechanics", shortName: "Power Mech" },
  { name: "Woodwork", shortName: "Woodwork" },
  { name: "Community Service Learning", shortName: "CSL" },
  { name: "Kenya Sign Language", shortName: "KSL" },
  { name: "English", shortName: "Eng" },
  { name: "Kiswahili", shortName: "Kisw" },
  { name: "CORE-Mathematics", shortName: "Math (Core)" },
  { name: "ESS-Mathematics", shortName: "Math (ESS)" }
];

const runPatch = async () => {
  try {
    console.log("🚀 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);

    for (const { name, shortName } of subjectsToPatch) {
      const updated = await Subject.findOneAndUpdate(
        { name },
        { $set: { shortName } },
        { new: true }
      );

      if (updated) {
        console.log(`✅ Patched: ${name} → shortName: '${shortName}'`);
      } else {
        console.warn(`⚠️ Subject not found: ${name}`);
      }
    }

    console.log("🎉 Patch complete.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error patching subjects:", err);
    process.exit(1);
  }
};

runPatch();
