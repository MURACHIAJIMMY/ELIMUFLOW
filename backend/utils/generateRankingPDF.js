const puppeteer = require("puppeteer");

const generateRankingPDF = async ({ classRanking, gradeRanking }, metadata) => {
  // ✅ Ensure logo is a proper URL string
  const schoolLogoUrl = metadata.schoolLogo?.[0]?.url || metadata.schoolLogo || "";

  const html = `
    <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            font-size: 11px;
            margin: 0;
            padding: 0;
          }
          .report-page {
            margin: 10mm;
            padding: 15px;
            border: 2px solid red;
            box-sizing: border-box;
          }
          h1, h2, h3 {
            text-align: center;
            margin: 6px 0;
          }
          .meta {
            text-align: center;
            font-size: 10px;
            margin-top: 4px;
          }
          img.logo {
            display: block;
            margin: 0 auto 8px auto;
            height: 120px;
            width: 120px;  
            object-fit: contain;
          }
          .section-title {
            margin-top: 20px;
            font-size: 13px;
            text-decoration: underline;
            text-align: center;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            font-size: 10px;
            page-break-inside: avoid;
          }
          th, td {
            border: 1px solid #000;
            padding: 4px;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="report-page">
          ${schoolLogoUrl ? `<img src="${schoolLogoUrl}" class="logo" />` : ""}
          <h1>${metadata.schoolName}</h1>
          <div class="meta">Location: ${metadata.schoolLocation} | Contact: ${metadata.schoolContact}</div>
          <h2>Class & Grade Ranking</h2>
          <h3>${metadata.examType} - ${metadata.term} ${metadata.year}</h3>

          <div class="section-title">Class Ranking - Grade ${classRanking[0]?.grade ?? '--'}</div>
          <table>
            <thead>
              <tr>
                <th>Pos</th>
                <th>Class</th>
                <th>Entry</th>
                <th>Mean</th>
                <th>Rubric</th>
                <th>Prev</th>
                <th>Dev</th>
              </tr>
            </thead>
            <tbody>
              ${classRanking.map(r => `
                <tr>
                  <td>${r.position}</td>
                  <td>${r.class}</td>
                  <td>${r.entry}</td>
                  <td>${r.mean}</td>
                  <td>${r.gradeLabel ?? '--'}</td>
                  <td>${r.previousMean ?? '--'}</td>
                  <td style="
                    background-color: ${
                      r.deviation === '--'
                        ? 'gray'
                        : Number(r.deviation) > 0
                        ? '#1b5e20'
                        : Number(r.deviation) < 0
                        ? '#e53935'
                        : 'gray'
                    };
                    color: ${
                      r.deviation === '--'
                        ? 'black'
                        : Number(r.deviation) !== 0
                        ? 'white'
                        : 'black'
                    };
                    font-weight: bold;
                  ">
                    ${r.deviation ?? '--'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="section-title">Grade Ranking</div>
          <table>
            <thead>
              <tr>
                <th>Pos</th>
                <th>Grade</th>
                <th>Entry</th>
                <th>Mean</th>
                <th>Rubric</th>
                <th>Prev</th>
                <th>Dev</th>
              </tr>
            </thead>
            <tbody>
              ${gradeRanking.map(r => `
                <tr>
                  <td>${r.position}</td>
                  <td>Grade ${r.grade}</td>
                  <td>${r.entry}</td>
                  <td>${r.mean}</td>
                  <td>${r.gradeLabel ?? '--'}</td>
                  <td>${r.previousMean ?? '--'}</td>
                  <td style="
                    background-color: ${
                      r.deviation === '--'
                        ? 'gray'
                        : Number(r.deviation) > 0
                        ? '#1b5e20'
                        : Number(r.deviation) < 0
                        ? '#e53935'
                        : 'gray'
                    };
                    color: ${
                      r.deviation === '--'
                        ? 'black'
                        : Number(r.deviation) !== 0
                        ? 'white'
                        : 'black'
                    };
                    font-weight: bold;
                  ">
                    ${r.deviation ?? '--'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="meta">Generated on ${new Date().toLocaleDateString('en-KE', {
            year: 'numeric', month: 'long', day: 'numeric'
          })}</div>
        </div>
      </body>
    </html>
  `;

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
    scale: 0.95
  });

  await browser.close();
  return pdfBuffer;
};

module.exports = generateRankingPDF;
