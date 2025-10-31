const puppeteer = require("puppeteer");

const generatePDF = async (reportForms, metadata) => {
  const examScope = {
    Opener: ["Opener"],
    Midterm: ["Opener", "Midterm"],
    Endterm: ["Opener", "Midterm", "Endterm"],
  }[metadata.examType] || ["Opener", "Midterm", "Endterm"];

  const html = `
    <html>
      <head>
        <style>
          @media print {
            .report-page {
              page-break-before: always;
              break-before: page;
            }
          }
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            font-size: 13px;
          }
          .report-page {
            padding: 25px 20px 15px 20px;
            border: 3px solid red;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            min-height: 1000px;
            page-break-before: always;
          }
          .school-header {
            display: flex;
            justify-content: flex-start;
            align-items: flex-start;
            margin-bottom: 10px;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
          }
          .school-logo {
            height: 85px;
            margin-left: 40px;
          }
          .school-info {
            flex: 1;
            margin-left: 40px;
          }
          .school-name {
            font-size: 24px;
            font-weight: bold;
            text-align: left;
            margin-bottom: 5px;
          }
          .school-meta {
            font-size: 14px;
            font-weight: bold;
            text-align: left;
            margin-bottom: 5px;
          }
          .report-title {
            text-align: center;
            font-size: 18px;
            font-weight: bold;
            margin: 20px 0;
          }
          .student-info-row {
            display: flex;
            flex-wrap: wrap;
            margin-bottom: 5px;
            font-size: 15px;
          }
          .student-info-row + .student-info-row {
            margin-top: 8px;
          }
          .student-info-row p {
            margin: 0 20px 5px 0;
            white-space: nowrap;
          }
          .scores-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            font-size: 13px;
          }
          .scores-table th, .scores-table td {
            border: 1.5px solid #000;
            padding: 6px;
            text-align: left;
          }
          .summary {
            margin-top: 15px;
            font-size: 13px;
          }
          .year-summary-table {
            margin-top: 10px;
            font-size: 12px;
            border-collapse: collapse;
            width: 100%;
            table-layout: fixed;
          }
          .year-summary-table th, .year-summary-table td {
            border: 1px solid #444;
            padding: 4px;
            text-align: center;
          }
          .year-summary-table thead tr:first-child th {
            background-color: #e0e0e0;
          }
          .year-summary-table thead tr:nth-child(2) th {
            background-color: #f5f5f5;
          }
          .signature-line {
            margin-top: 20px;
            font-weight: bold;
          }
          .bottom-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-top: 20px;
          }
          .qr-code {
            height: 70px;
            margin-left: 10px;
          }
          .footer {
            font-size: 12px;
            font-weight: bold;
            color: #555;
            margin-right: 10px;
          }
        </style>
      </head>
      <body>
        ${reportForms.map((report) => {
          const grades = ["10", "11", "12"];
          const summaryMap = {};
          report.yearSummary?.forEach((row) => {
            summaryMap[row.grade] = {
              "Term 1": row.term1,
              "Term 2": row.term2,
              "Term 3": row.term3,
              "Overall": row.overall,
            };
          });

          const getParts = (cell) => {
            const parts = cell?.split(" / ") || [];
            return parts.length === 2 ? `<td>${parts[0]}</td><td>${parts[1]}</td>` : `<td>-</td><td>-</td>`;
          };

          const getOverallParts = (cell) => {
            const parts = cell?.split(" / ") || [];
            return parts.length === 3
              ? `<td>${parts[0]}</td><td>${parts[1]}</td><td>${parts[2]}</td>`
              : `<td>-</td><td>-</td><td>-</td>`;
          };

          return `
          <div class="report-page">
            <div>
              <div class="school-header">
                <img src="${metadata.schoolLogo}" alt="Logo" class="school-logo" />
                <div class="school-info">
                  <p class="school-name">${metadata.schoolName}</p>
                  <p class="school-meta">${metadata.schoolMotto ?? ''}</p>
                  <p class="school-meta">${metadata.schoolLocation} | ${metadata.schoolContact} | ${metadata.schoolEmail ?? ''}</p>
                </div>
              </div>

              <div class="report-title">Report Form - ${metadata.term} ${metadata.year}</div>

              <div class="student-info-row">
                <p><strong>Name:</strong> ${report.name}</p>
                <p><strong>ADM No:</strong> ${report.admNo}</p>
                <p><strong>Class:</strong> ${report.class}</p>
              </div>
              <div class="student-info-row">
                <p><strong>Pathway:</strong> ${report.pathway}</p>
                <p><strong>Exam:</strong> ${metadata.examType}</p>
              </div>

              <table class="scores-table">
                <thead>
                  <tr>
                    <th>Learning Area</th>
                    ${examScope.includes("Opener") ? "<th>Opener</th>" : ""}
                    ${examScope.includes("Midterm") ? "<th>Midterm</th>" : ""}
                    ${examScope.includes("Endterm") ? "<th>Endterm</th>" : ""}
                    <th>Total</th>
                    <th>Grade</th>
                    <th>Level</th>
                    <th>Remark</th>
                  </tr>
                </thead>
                <tbody>
                  ${report.scores.map((s) => `
                    <tr>
                      <td>${s.learningArea}</td>
                      ${examScope.includes("Opener") ? `<td>${s.opener}</td>` : ""}
                      ${examScope.includes("Midterm") ? `<td>${s.midterm}</td>` : ""}
                      ${examScope.includes("Endterm") ? `<td>${s.endterm}</td>` : ""}
                      <td>${s.total}</td>
                      <td>${s.grade ?? "-"}</td>
                      <td>${s.level ?? "-"}</td>
                      <td>${s.remark ?? "-"}</td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>

              <div class="summary">
                <p><strong>Mean Score:</strong> ${report.meanScore ?? "-"}</p>
                <p><strong>Grade:</strong> ${report.grade ?? "-"}</p>
                <p><strong>Level:</strong> ${report.level ?? "-"}</p>
                <p><strong>Position:</strong> ${report.position ?? "-"}</p>
                <p><strong>Class Teacher Comment:</strong> ${report.classTeacherComment}</p>
                <p class="signature-line">Class Teacher Signature: ____________________________</p>
                <p><strong>Principal Comment:</strong> ${report.principalComment}</p>
                <p class="signature-line">Principal Signature: ____________________________</p>
              </div>

              <table class="year-summary-table">
                <thead>
                  <tr>
                    <th rowspan="2">Grade</th>
                    <th colspan="2">Term 1</th>
                    <th colspan="2">Term 2</th>
                    <th colspan="2">Term 3</th>
                    <th colspan="3">Overall Assessment</th>
                  </tr>
                  <tr>
                    <th>Mean</th><th>Grade</th>
                    <th>Mean</th><th>Grade</th>
                    <th>Mean</th><th>Grade</th>
                    <th>Mean</th><th>Grade</th><th>Level</th>
                  </tr>
                </thead>
                <tbody>
                  ${grades.map((grade) => `
                    <tr>
                      <td>Grade ${grade}</td>
                      ${getParts(summaryMap[grade]?.["Term 1"])}
                      ${getParts(summaryMap[grade]?.["Term 2"])}
                      ${getParts(summaryMap[grade]?.["Term 3"])}
                      ${getOverallParts(summaryMap[grade]?.["Overall"])}
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>

            <div class="bottom-section">
              <div class="footer">— ${metadata.schoolName} —</div>
              ${report.qrCodeUrl ? `<img src="${report.qrCodeUrl}" alt="QR Code" class="qr-code" />` : ""}
            </div>
          </div>
        `;
        }).join("")}
      </body>
    </html>
  `;

  const browser = await puppeteer.launch({
  executablePath: puppeteer.executablePath(),
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });
  const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
  await browser.close();

  return pdfBuffer;
};

module.exports = generatePDF;
