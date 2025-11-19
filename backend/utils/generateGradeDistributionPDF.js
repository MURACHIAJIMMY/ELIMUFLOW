const puppeteer = require("puppeteer");

const generateGradeDistributionPDF = async (distribution, metadata) => {
  const {
    title,
    exam,
    term,
    year,
    gradeBands,
    mode,
    stream,
    schoolName,
    schoolLogo
  } = metadata;

  // ✅ Ensure logo is a proper URL string
  const schoolLogoUrl = schoolLogo?.[0]?.url || schoolLogo || "";

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
            border: 2px solid red;   /* ✅ red border */
            box-sizing: border-box;
          }
          h1, h2 {
            text-align: center;
            margin: 6px 0;
          }
          p.meta {
            text-align: center;
            margin: 4px 0;
            font-size: 10px;
          }
          img.logo {
            display: block;
            margin: 0 auto 8px auto;
            height: 120px;
            width: 120px;
            object-fit: contain;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 12px;
            font-size: 10px;
            page-break-inside: avoid;
          }
          th, td {
            border: 1px solid #444;
            padding: 4px;
            text-align: center;
          }
          th {
            background-color: #eee;
            font-weight: bold;
          }
          td small {
            font-size: 8px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="report-page">
          ${schoolLogoUrl ? `<img src="${schoolLogoUrl}" class="logo" />` : ""}
          <h1>${schoolName}</h1>
          <h2>${title}</h2>
          <p class="meta"><strong>Exam:</strong> ${exam} | <strong>Term:</strong> ${term} | <strong>Year:</strong> ${year}</p>
          <p class="meta"><strong>Stream:</strong> ${stream || "All"}</p>

          ${
            mode === "cross-grade"
              ? Object.entries(distribution).map(([pathway, group]) => {
                  return `
                    <h3 style="text-align:center; margin-top:10px;">${pathway}</h3>
                    <table>
                      <thead>
                        <tr>
                          <th>Rubric</th>
                          ${gradeBands.map(b => `<th>${b}</th>`).join("")}
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${Object.entries(group).map(([gradeLabel, bandCounts]) => {
                          const total = Object.values(bandCounts).reduce((sum, val) =>
                            typeof val === "number" ? sum + val : sum, 0);
                          return `
                            <tr>
                              <td>${gradeLabel}</td>
                              ${gradeBands.map(b => {
                                const val = bandCounts[b];
                                const percent = total > 0 ? ((val / total) * 100).toFixed(1) + "%" : "0%";
                                return `<td>${val}<br><small>${percent}</small></td>`;
                              }).join("")}
                              <td>${total}</td>
                            </tr>
                          `;
                        }).join("")}
                      </tbody>
                    </table>
                  `;
                }).join("")
              : `
                <table>
                  <thead>
                    <tr>
                      <th>Pathway</th>
                      ${gradeBands.map(b => `<th>${b}</th>`).join("")}
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${Object.entries(distribution).map(([pathway, bandCounts]) => {
                      const total = Object.values(bandCounts).reduce((sum, val) =>
                        typeof val === "number" ? sum + val : sum, 0);
                      return `
                        <tr>
                          <td>${pathway}</td>
                          ${gradeBands.map(b => {
                            const val = bandCounts[b];
                            const percent = total > 0 ? ((val / total) * 100).toFixed(1) + "%" : "0%";
                            return `<td>${val}<br><small>${percent}</small></td>`;
                          }).join("")}
                          <td>${total}</td>
                        </tr>
                      `;
                    }).join("")}
                  </tbody>
                </table>
              `
          }
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
    landscape: true,
    scale: 0.95   /* ✅ gentle shrink to fit neatly */
  });
  await browser.close();

  return pdfBuffer;
};

module.exports = generateGradeDistributionPDF;
