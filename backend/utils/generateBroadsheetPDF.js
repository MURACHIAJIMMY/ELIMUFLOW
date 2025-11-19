const puppeteer = require("puppeteer");

const generateBroadsheetPDF = async (broadsheet, metadata) => {
  if (!broadsheet || broadsheet.length === 0) {
    throw new Error("No broadsheet data provided for PDF generation");
  }

  // Group rows by student
  const studentMap = {};
  broadsheet.forEach(row => {
    if (!studentMap[row.admNo]) {
      studentMap[row.admNo] = {
        admNo: row.admNo,
        name: row.name,
        class: row.class,
        pathway: row.pathway ?? null,
        subjects: {},
        meanScore: row.meanScore,
        grade: row.grade,
        level: row.level,
        rank: row.rank
      };
    }
    studentMap[row.admNo].subjects[row.learningArea] = row.score;
  });

  // Subject labels
  const subjectLabelMap = {};
  (metadata.subjects || []).forEach(sub => {
    subjectLabelMap[sub.name] = sub.code || sub.name;
  });

  const allSubjects = metadata.sortedSubjects || [];
  const includePathwayColumn = metadata.pathway === "GENERAL";

  // ✅ Ensure logo is a proper URL string
  const schoolLogoUrl = metadata.schoolLogo?.[0]?.url || metadata.schoolLogo || "";

  // Build HTML
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          body {
            font-family: Arial, sans-serif;
            font-size: 7px;
            margin: 12px;
          }
          .header {
            text-align: center;
            margin-bottom: 6px;
          }
          .header img {
            height: 30px;
            margin-bottom: 2px;
            object-fit: contain;
          }
          .header h1 {
            font-size: 12px;
            margin: 0;
          }
          .header p {
            margin: 1px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            margin-top: 6px;
          }
          th, td {
            border: 1px solid #444;
            padding: 1px;
            text-align: center;
            vertical-align: middle;
          }
          th {
            background-color: #eee;
            font-weight: bold;
            font-size: 6.5px;
            line-height: 1.1;
            white-space: normal;
            word-break: break-word;
          }
          td {
            font-size: 6.5px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          td:nth-child(1) { max-width: 60px; white-space: normal; word-break: break-word; }
          td:nth-child(2) { max-width: 100px; white-space: normal; word-break: break-word; }
          td:nth-child(3) { max-width: 50px; white-space: normal; word-break: break-word; }
          td.mean { max-width: 40px; }
          td.grade, td.level { max-width: 50px; white-space: normal; word-break: break-word; }
          td.rank { max-width: 30px; }
          th.subject, td.subject {
            max-width: 30px;
            white-space: normal;
            word-break: break-word;
            font-size: 6px;
          }
          .legend {
            margin-top: 10px;
            font-size: 6px;
          }
          .legend h4 {
            margin-bottom: 2px;
          }
          .legend ul {
            list-style: none;
            padding-left: 0;
            columns: 4;
            margin: 0;
          }
          .legend li {
            margin-bottom: 1px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          ${schoolLogoUrl ? `<img src="${schoolLogoUrl}" alt="School Logo" />` : ""}
          <h1>${metadata.schoolName}</h1>
          <p>${metadata.schoolMotto ?? ''}</p>
          <p>${metadata.schoolLocation} | ${metadata.schoolContact} | ${metadata.schoolEmail ?? ''}</p>
          <p><strong>Broadsheet - ${metadata.classLabel}</strong></p>
          <p><strong>Term:</strong> ${metadata.term} | <strong>Year:</strong> ${metadata.year} | <strong>Exam:</strong> ${metadata.examType}</p>
          <p><strong>Pathway:</strong> ${metadata.pathway}</p>
        </div>

        <table>
          <thead>
            <tr>
              <th>ADM No</th>
              <th>Name</th>
              <th>Class</th>
              ${includePathwayColumn ? `<th>Pathway</th>` : ""}
              ${allSubjects.map(subject => `<th class="subject">${subjectLabelMap[subject] || subject}</th>`).join("")}
              <th>Mean</th>
              <th>Grade</th>
              <th>Level</th>
              <th>Rank</th>
            </tr>
          </thead>
          <tbody>
            ${Object.values(studentMap)
              .sort((a, b) => (a.rank || 9999) - (b.rank || 9999))
              .map(student => `
              <tr>
                <td>${student.admNo}</td>
                <td>${student.name}</td>
                <td>${student.class}</td>
                ${includePathwayColumn ? `<td>${student.pathway ?? "-"}</td>` : ""}
                ${allSubjects.map(subject => `<td class="subject">${student.subjects[subject] ?? "-"}</td>`).join("")}
                <td class="mean">${student.meanScore ?? "-"}</td>
                <td class="grade">${student.grade ?? "-"}</td>
                <td class="level">${student.level ?? "-"}</td>
                <td class="rank">${student.rank ?? "-"}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>

        <div class="legend">
          <h4>Subject Key</h4>
          <ul>
            ${allSubjects.map(subject => {
              const label = subjectLabelMap[subject] || subject;
              return `<li><strong>${label}</strong>: ${subject}</li>`;
            }).join("")}
          </ul>
        </div>
      </body>
    </html>
  `;

  try {
    const browser = await puppeteer.launch({
      executablePath: puppeteer.executablePath(),
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      landscape: true
    });
    await browser.close();

    return pdfBuffer;
  } catch (err) {
    throw new Error("Failed to generate broadsheet PDF: " + err.message);
  }
};

module.exports = generateBroadsheetPDF;
