const puppeteer = require('puppeteer');

const generateRankingPDF = async ({ classRanking, gradeRanking }, metadata) => {
  const html = `
    <html>
      <head>
        <style>
          body { font-family: Arial; padding: 40px; }
          h1, h2, h3 { text-align: center; margin: 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #000; padding: 6px; text-align: center; font-size: 12px; }
          .logo { width: 80px; margin: 0 auto; display: block; }
          .meta { text-align: center; font-size: 10px; margin-top: 4px; }
          .section-title { margin-top: 40px; font-size: 14px; text-decoration: underline; }
        </style>
      </head>
      <body>
        <img src="${metadata.schoolLogo}" class="logo" />
        <h1>${metadata.schoolName}</h1>
        <div class="meta">Location: ${metadata.schoolLocation} | Contact: ${metadata.schoolContact}</div>
        <h2>Class & Grade Ranking</h2>
        <h3>${metadata.examType} - ${metadata.term} ${metadata.year}</h3>

        <div class="section-title">Class Ranking - Grade ${classRanking[0]?.grade ?? '--'}</div>
        <table>
          <tr>
            <th>Pos</th>
            <th>Class</th>
            <th>Entry</th>
            <th>Mean</th>
            <th>Grade</th>
            <th>Prev</th>
            <th>Dev</th>
          </tr>
          ${classRanking.map(r => {
            const bgColor = r.deviation === null ? '#ccc' : r.deviation > 0 ? '#2e7d32' : r.deviation < 0 ? '#c62828' : '#ccc';
            const textColor = r.deviation === null ? 'black' : r.deviation !== 0 ? 'white' : 'black';
            return `
              <tr>
                <td>${r.position}</td>
                <td>${r.class}</td>
                <td>${r.entry}</td>
                <td>${r.mean}</td>
                <td>${r.gradeLabel ?? '--'}</td>
                <td>${r.previousMean ?? '--'}</td>
                <td style="background-color:${bgColor}; color:${textColor};">
                  ${r.deviation ?? '--'}
                </td>
              </tr>`;
          }).join('')}
        </table>

        <div class="section-title">Grade Ranking</div>
        <table>
          <tr>
            <th>Pos</th>
            <th>Grade</th>
            <th>Entry</th>
            <th>Mean</th>
            <th>Grade</th>
            <th>Prev</th>
            <th>Dev</th>
          </tr>
          ${gradeRanking.map(r => {
            const bgColor = r.deviation === null ? '#ccc' : r.deviation > 0 ? '#2e7d32' : r.deviation < 0 ? '#c62828' : '#ccc';
            const textColor = r.deviation === null ? 'black' : r.deviation !== 0 ? 'white' : 'black';
            return `
              <tr>
                <td>${r.position}</td>
                <td>Grade ${r.grade}</td>
                <td>${r.entry}</td>
                <td>${r.mean}</td>
                <td>${r.gradeLabel ?? '--'}</td>
                <td>${r.previousMean ?? '--'}</td>
                <td style="background-color:${bgColor}; color:${textColor};">
                  ${r.deviation ?? '--'}
                </td>
              </tr>`;
          }).join('')}
        </table>

        <div class="meta">Generated on ${new Date().toLocaleDateString('en-KE', {
          year: 'numeric', month: 'long', day: 'numeric'
        })}</div>
      </body>
    </html>
  `;

  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });

  const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
  await browser.close();

  return pdfBuffer;
};

module.exports = generateRankingPDF;
