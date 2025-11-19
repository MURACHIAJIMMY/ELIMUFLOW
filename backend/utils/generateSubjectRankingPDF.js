const puppeteer = require("puppeteer");

const generateSubjectRankingPDF = async (ranking, metadata, scope) => {
  const grouped = {};
  ranking.forEach(r => {
    grouped[r.class] ??= {};
    grouped[r.class][r.pathway] ??= [];
    grouped[r.class][r.pathway].push(r);
  });

  // ✅ Ensure logo is a proper URL string
  const schoolLogoUrl = metadata.schoolLogo?.[0]?.url || metadata.schoolLogo || "";

  const html = `
    <html>
      <head>
        <style>
          body { font-family: Arial; padding: 40px; font-size: 11px; }
          h1, h2, h3 { text-align: center; margin: 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 10px; }
          th, td { border: 1px solid #000; padding: 6px; text-align: center; }
          .logo { height: 120px; width: 120px; margin: 0 auto; display: block; object-fit: contain; }
          .meta { text-align: center; font-size: 10px; margin-top: 4px; }
          .section-title { margin-top: 40px; font-size: 14px; text-decoration: underline; }
          .report-page { padding: 20px 15px; margin: 8mm; box-sizing: border-box; border: 2px solid red; }
        </style>
      </head>
      <body>
        ${schoolLogoUrl ? `<img src="${schoolLogoUrl}" class="logo" />` : ""}
        <h1>${metadata.schoolName}</h1>
        <div class="meta">Location: ${metadata.schoolLocation} | Contact: ${metadata.schoolContact}</div>
        <h2>Learning Area Ranking</h2>
        <h3>${metadata.examType} - ${metadata.term} ${metadata.year}</h3>

        <div class="section-title">Learning Areas Breakdown by Class</div>
        <table>
          <tr>
            <th>Class</th>
            <th>Pathway</th>
            <th>Learning Area</th>
            <th>Entry</th>
            <th>Mean</th>
            <th>Prev</th>
            <th>Dev</th>
            <th>Rank</th>
            <th>Overall Rank</th>
          </tr>
          ${Object.entries(grouped).map(([className, pathways]) => {
            const classRowCount = Object.values(pathways).reduce((sum, subjects) => sum + subjects.length, 0);
            let classRowPrinted = false;

            return Object.entries(pathways).map(([pathway, subjects]) => {
              const pathwayRowCount = subjects.length;
              let pathwayRowPrinted = false;

              return subjects.map(r => {
                const devCellBg =
                  r.deviation === null
                    ? 'gray'
                    : Number(r.deviation) > 0
                    ? '#1b5e20'
                    : Number(r.deviation) < 0
                    ? '#e53935'
                    : 'gray';
                const devCellColor =
                  r.deviation === null
                    ? 'black'
                    : Number(r.deviation) !== 0
                    ? 'white'
                    : 'black';

                const rowHtml = `
                  <tr>
                    ${!classRowPrinted ? `<td rowspan="${classRowCount}">${className}</td>` : ''}
                    ${!pathwayRowPrinted ? `<td rowspan="${pathwayRowCount}">${pathway}</td>` : ''}
                    <td>${r.learningArea}</td>
                    <td>${r.entry}</td>
                    <td>${r.mean}</td>
                    <td>${r.previousMean ?? '--'}</td>
                    <td style="background-color:${devCellBg}; color:${devCellColor}; font-weight:bold;">${r.deviation ?? '--'}</td>
                    <td>${r.rank}</td>
                    <td>${r.overallRank}</td>
                  </tr>
                `;
                classRowPrinted = true;
                pathwayRowPrinted = true;
                return rowHtml;
              }).join('');
            }).join('');
          }).join('')}
        </table>

        <div class="meta">Generated on ${new Date().toLocaleDateString('en-KE', {
          year: 'numeric', month: 'long', day: 'numeric'
        })}</div>
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

module.exports = generateSubjectRankingPDF;
