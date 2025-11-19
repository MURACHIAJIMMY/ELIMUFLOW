const puppeteer = require("puppeteer");

const generatePDF = async (reportForms, metadata) => {
  if (!reportForms || reportForms.length === 0) {
    throw new Error("No report forms provided for PDF generation");
  }

  // ✅ Ensure metadata.schoolLogo is a valid URL string
  const schoolLogoUrl = metadata.schoolLogo?.[0]?.url || metadata.schoolLogo || "";

  const examScope =
    Array.isArray(metadata.examScope) && metadata.examScope.length
      ? metadata.examScope
      : [metadata.examType];

  const html = `
    <html>
      <head>
        <style>
          @media print { .report-page { page-break-before: always; } }
          body {
            font-family: Arial, sans-serif;
            font-size: 13px;
            margin: 0;
            padding: 0;
          }
          .report-page {
            padding: 20px 15px;
            margin: 8mm;
            box-sizing: border-box;
            page-break-after: always;
          }
          .school-header {
            display: flex;
            border-bottom: 1px solid #000;
            margin-bottom: 8px;
          }
          .school-logo { width: 120px; height: 120px; margin-left: 20px; object-fit: contain; }
          .school-info { flex: 1; margin-left: 21px; }
          .school-name { font-size: 22px; font-weight: bold; margin-bottom: 4px; }
          .school-motto { font-style: italic; font-size: 12px; margin-bottom: 4px; }
          .report-title { text-align: center; font-size: 16px; font-weight: bold; margin: 15px 0; }
          .scores-table, .summary-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            font-size: 13px;
            page-break-inside: avoid;
          }
          .scores-table th, .scores-table td,
          .summary-table th, .summary-table td {
            border: 1px solid #000;
            padding: 4px;
          }
          .bottom-section { display: flex; justify-content: space-between; margin-top: 15px; }
          .qr-code { height: 60px; }
          .signature-line { margin-top: 20px; }
        </style>
      </head>
      <body>
        ${reportForms
          .map(
            (report) => `
          <div class="report-page">
            <div class="school-header">
              ${schoolLogoUrl ? `<img src="${schoolLogoUrl}" class="school-logo" />` : ""}
              <div class="school-info">
                <p class="school-name">${metadata.schoolName}</p>
                <p class="school-motto">${metadata.schoolMotto}</p>
                <p>${metadata.schoolLocation} | ${metadata.schoolContact}</p>
                <p>Email: ${metadata.schoolEmail}</p>
              </div>
            </div>
            <div class="report-title">Report Form - ${metadata.term} ${metadata.year}</div>
            <p><strong>Name:</strong> ${report.name}
               &nbsp; <strong>ADM No:</strong> ${report.admNo}
               &nbsp; <strong>Class:</strong> ${report.class}
               &nbsp; <strong>Pathway:</strong> ${report.pathway}</p>
            <table class="scores-table">
              <thead>
                <tr>
                  <th>Learning Area</th>
                  ${examScope.map((ex) => `<th>${ex}</th>`).join("")}
                  <th>Total</th><th>Rubric</th><th>Level</th><th>Remark</th>
                </tr>
              </thead>
              <tbody>
                ${report.scores
                  .map(
                    (s) => `
                  <tr>
                    <td>${s.learningArea}</td>
                    ${examScope.map((ex) => `<td>${s.exams?.[ex] ?? "-"}</td>`).join("")}
                    <td>${s.total ?? "-"}</td>
                    <td>${s.grade ?? "-"}</td>
                    <td>${s.level ?? "-"}</td>
                    <td>${s.remark ?? "-"}</td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>
            <p><strong>Mean Score:</strong> ${report.meanScore ?? "-"}</p>
            <p><strong>Rubric:</strong> ${report.grade ?? "-"}</p>
            <p><strong>Level:</strong> ${report.level ?? "-"}</p>
            <p><strong>Position:</strong> ${report.position ?? "-"}</p>
            <p><strong>Class Teacher Comment:</strong> ${report.classTeacherComment}</p>
            <p><strong>Principal Comment:</strong> ${report.principalComment}</p>

            <div class="signature-line">
              <p><strong>Class Teacher Signature:</strong> ___________________________</p>
              <p><strong>Principal Signature:</strong> ___________________________</p>
            </div>

            <table class="summary-table">
              <thead>
                <tr>
                  <th rowspan="2">Grade</th>
                  <th colspan="2">Term 1</th>
                  <th colspan="2">Term 2</th>
                  <th colspan="2">Term 3</th>
                  <th colspan="3">Overall Assessment</th>
                </tr>
                <tr>
                  <th>Mean</th><th>Rubric</th>
                  <th>Mean</th><th>Rubric</th>
                  <th>Mean</th><th>Rubric</th>
                  <th>Mean</th><th>Rubric</th><th>Level</th>
                </tr>
              </thead>
              <tbody>
                ${report.yearSummary
                  .map((row) => {
                    const term1 = row["Term 1"]?.split(" / ") ?? ["-", "-"];
                    const term2 = row["Term 2"]?.split(" / ") ?? ["-", "-"];
                    const term3 = row["Term 3"]?.split(" / ") ?? ["-", "-"];
                    const overall = row.overall?.split(" / ") ?? ["-", "-", "-"];
                    return `
                    <tr>
                      <td>${row.grade}</td>
                      <td>${term1[0]}</td><td>${term1[1]}</td>
                      <td>${term2[0]}</td><td>${term2[1]}</td>
                      <td>${term3[0]}</td><td>${term3[1]}</td>
                      <td>${overall[0]}</td><td>${overall[1]}</td><td>${overall[2]}</td>
                    </tr>
                  `;
                  })
                  .join("")}
              </tbody>
            </table>

            <div class="bottom-section">
              <div class="footer">— ${metadata.schoolName} —</div>
              ${report.qrCodeUrl ? `<img src="${report.qrCodeUrl}" class="qr-code" />` : ""}
            </div>
          </div>
        `
          )
          .join("")}
      </body>
    </html>
  `;

  const browser = await puppeteer.launch({
    executablePath: puppeteer.executablePath(),
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-features=IsolateOrigins,site-per-process",
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 1600 });
  await page.setContent(html, { waitUntil: "networkidle0" });
  await new Promise((resolve) => setTimeout(resolve, 300));

  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
    scale: 0.95,
  });

  await browser.close();
  return pdfBuffer;
};

module.exports = generatePDF;
