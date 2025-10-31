const puppeteer = require("puppeteer");
const path = require("path");

const generateGradeDistributionPDF = async (distribution, metadata) => {
  const { title, exam, term, year, gradeBands, mode, stream, schoolName, schoolLogo } = metadata;

  const html = `
    <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            font-size: 8px;
            margin: 12px;
          }
          h1, h2 {
            text-align: center;
            margin: 4px 0;
          }
          p.meta {
            text-align: center;
            margin: 2px 0;
          }
          img.logo {
            display: block;
            margin: 0 auto 6px auto;
            height: 40px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
          }
          th, td {
            border: 1px solid #444;
            padding: 4px;
            text-align: center;
          }
          th {
            background-color: #eee;
            font-size: 7px;
          }
          td {
            font-size: 7px;
          }
          small {
            font-size: 6px;
            color: #666;
          }
        </style>
      </head>
      <body>
        ${schoolLogo ? `<img src="${schoolLogo}" class="logo" />` : ""}
        <h1>${schoolName}</h1>
        <h2>${title}</h2>
        <p class="meta"><strong>Exam:</strong> ${exam} | <strong>Term:</strong> ${term} | <strong>Year:</strong> ${year}</p>
        <p class="meta"><strong>Stream:</strong> ${stream || "All"}</p>

        ${
          mode === "cross-grade"
            ? Object.entries(distribution).map(([pathway, group]) => {
                return `
                  <h3>${pathway}</h3>
                  <table>
                    <thead>
                      <tr>
                        <th>Grade</th>
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
                              if (val === "-") return `<td>-</td>`;
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
                          if (val === "-") return `<td>-</td>`;
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
      </body>
    </html>
  `;

  const browser = await puppeteer.launch({
    executablePath: path.resolve(__dirname, "../.chrome-cache/chrome/linux-142.0.7444.59/chrome-linux64/chrome"),
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
};

module.exports = generateGradeDistributionPDF;
