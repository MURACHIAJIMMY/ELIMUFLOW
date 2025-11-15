// const puppeteer = require("puppeteer");

// const generatePDF = async (reportForms, metadata) => {
//   if (!reportForms || reportForms.length === 0) {
//     throw new Error("No report forms provided for PDF generation");
//   }

//   const examScope = Array.isArray(metadata.examScope) && metadata.examScope.length
//     ? metadata.examScope
//     : [metadata.examType];

//   const html = `
//     <html>
//       <head>
//         <style>
//           @media print { .report-page { page-break-before: always; } }
//           body { font-family: Arial, sans-serif; font-size: 13px; margin: 0; padding: 0; }
//           .report-page { padding: 25px 20px; border: 2px solid #000; min-height: 1000px; }
//           .school-header { display: flex; border-bottom: 2px solid #000; margin-bottom: 10px; }
//           .school-logo { height: 85px; margin-left: 40px; }
//           .school-info { flex: 1; margin-left: 40px; }
//           .school-name { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
//           .report-title { text-align: center; font-size: 18px; font-weight: bold; margin: 20px 0; }
//           .scores-table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
//           .scores-table th, .scores-table td { border: 1px solid #000; padding: 6px; }
//           .bottom-section { display: flex; justify-content: space-between; margin-top: 20px; }
//           .qr-code { height: 70px; }
//         </style>
//       </head>
//       <body>
//         ${reportForms.map((report) => `
//           <div class="report-page">
//             <div class="school-header">
//               <img src="${metadata.schoolLogo}" class="school-logo" />
//               <div class="school-info">
//                 <p class="school-name">${metadata.schoolName}</p>
//                 <p>${metadata.schoolLocation} | ${metadata.schoolContact}</p>
//               </div>
//             </div>
//             <div class="report-title">Report Form - ${metadata.term} ${metadata.year}</div>
//             <p><strong>Name:</strong> ${report.name} &nbsp; <strong>ADM No:</strong> ${report.admNo} &nbsp; <strong>Class:</strong> ${report.class}</p>
//             <table class="scores-table">
//               <thead>
//                 <tr>
//                   <th>Learning Area</th>
//                   ${examScope.map((ex) => `<th>${ex}</th>`).join("")}
//                   <th>Total</th><th>Grade</th><th>Level</th><th>Remark</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 ${report.scores.map((s) => `
//                   <tr>
//                     <td>${s.learningArea}</td>
//                     ${examScope.map((ex) => `<td>${s.exams?.[ex] ?? "-"}</td>`).join("")}
//                     <td>${s.total ?? "-"}</td>
//                     <td>${s.grade ?? "-"}</td>
//                     <td>${s.level ?? "-"}</td>
//                     <td>${s.remark ?? "-"}</td>
//                   </tr>
//                 `).join("")}
//               </tbody>
//             </table>
//             <p><strong>Mean Score:</strong> ${report.meanScore ?? "-"}</p>
//             <p><strong>Grade:</strong> ${report.grade ?? "-"}</p>
//             <p><strong>Level:</strong> ${report.level ?? "-"}</p>
//             <p><strong>Position:</strong> ${report.position ?? "-"}</p>
//             <p><strong>Class Teacher Comment:</strong> ${report.classTeacherComment}</p>
//             <p><strong>Principal Comment:</strong> ${report.principalComment}</p>
//             <div class="bottom-section">
//               <div class="footer">— ${metadata.schoolName} —</div>
//               ${report.qrCodeUrl ? `<img src="${report.qrCodeUrl}" class="qr-code" />` : ""}
//             </div>
//           </div>
//         `).join("")}
//       </body>
//     </html>
//   `;

// const browser = await puppeteer.launch({
//   executablePath: puppeteer.executablePath().replace(
//     "/.cache/puppeteer",
//     "/node_modules/puppeteer/.local-chromium"
//   ),
//   args: ["--no-sandbox", "--disable-setuid-sandbox"],
//   headless: true
// });


//   const page = await browser.newPage();
//   await page.setViewport({ width: 1200, height: 1600 });
//   await page.setContent(html, { waitUntil: "networkidle0" });

//   const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
//   await browser.close();

//   return pdfBuffer;
// };

// module.exports = generatePDF;
const pdf = require("html-pdf");

const generatePDF = async (reportForms, metadata) => {
  if (!reportForms || reportForms.length === 0) {
    throw new Error("No report forms provided for PDF generation");
  }

  const examScope = Array.isArray(metadata.examScope) && metadata.examScope.length
    ? metadata.examScope
    : [metadata.examType];

  const html = `
    <html>
      <head>
        <style>
          @media print { .report-page { page-break-before: always; } }
          body { font-family: Arial, sans-serif; font-size: 13px; margin: 0; padding: 0; }
          .report-page { padding: 25px 20px; border: 2px solid #000; min-height: 1000px; }
          .school-header { display: flex; border-bottom: 2px solid #000; margin-bottom: 10px; }
          .school-logo { height: 85px; margin-left: 40px; }
          .school-info { flex: 1; margin-left: 40px; }
          .school-name { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
          .report-title { text-align: center; font-size: 18px; font-weight: bold; margin: 20px 0; }
          .scores-table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
          .scores-table th, .scores-table td { border: 1px solid #000; padding: 6px; }
          .bottom-section { display: flex; justify-content: space-between; margin-top: 20px; }
          .qr-code { height: 70px; }
        </style>
      </head>
      <body>
        ${reportForms.map((report) => `
          <div class="report-page">
            <div class="school-header">
              <img src="${metadata.schoolLogo}" class="school-logo" />
              <div class="school-info">
                <p class="school-name">${metadata.schoolName}</p>
                <p>${metadata.schoolLocation} | ${metadata.schoolContact}</p>
              </div>
            </div>
            <div class="report-title">Report Form - ${metadata.term} ${metadata.year}</div>
            <p><strong>Name:</strong> ${report.name} &nbsp; <strong>ADM No:</strong> ${report.admNo} &nbsp; <strong>Class:</strong> ${report.class}</p>
            <table class="scores-table">
              <thead>
                <tr>
                  <th>Learning Area</th>
                  ${examScope.map((ex) => `<th>${ex}</th>`).join("")}
                  <th>Total</th><th>Grade</th><th>Level</th><th>Remark</th>
                </tr>
              </thead>
              <tbody>
                ${report.scores.map((s) => `
                  <tr>
                    <td>${s.learningArea}</td>
                    ${examScope.map((ex) => `<td>${s.exams?.[ex] ?? "-"}</td>`).join("")}
                    <td>${s.total ?? "-"}</td>
                    <td>${s.grade ?? "-"}</td>
                    <td>${s.level ?? "-"}</td>
                    <td>${s.remark ?? "-"}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
            <p><strong>Mean Score:</strong> ${report.meanScore ?? "-"}</p>
            <p><strong>Grade:</strong> ${report.grade ?? "-"}</p>
            <p><strong>Level:</strong> ${report.level ?? "-"}</p>
            <p><strong>Position:</strong> ${report.position ?? "-"}</p>
            <p><strong>Class Teacher Comment:</strong> ${report.classTeacherComment}</p>
            <p><strong>Principal Comment:</strong> ${report.principalComment}</p>
            <div class="bottom-section">
              <div class="footer">— ${metadata.schoolName} —</div>
              ${report.qrCodeUrl ? `<img src="${report.qrCodeUrl}" class="qr-code" />` : ""}
            </div>
          </div>
        `).join("")}
      </body>
    </html>
  `;

  return new Promise((resolve, reject) => {
    pdf.create(html, { format: "A4", border: "10mm" }).toBuffer((err, buffer) => {
      if (err) return reject(err);
      resolve(buffer);
    });
  });
};

module.exports = generatePDF;
