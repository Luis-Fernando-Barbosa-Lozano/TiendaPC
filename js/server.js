const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/search', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: "No se proporcionó una consulta." });

    try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.goto(`https://www.google.com/search?q=${encodeURIComponent(query)}&hl=es`);

        // Extraer resultados
        const results = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.tF2Cxc a'))
                .map(el => ({ title: el.textContent, link: el.href }))
                .slice(0, 3); // Limitar a 5 resultados
        });

        await browser.close();
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: "Error al realizar la búsqueda." });
    }
});

app.listen(3000, () => console.log("Servidor corriendo en http://localhost:3000"));
