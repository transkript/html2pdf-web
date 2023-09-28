const fs = require("fs");
const { v4: uuidv4 } = require('uuid');
const path = require("path");
const express = require('express');
const HTML2PDF = require('../public/javascripts/html2pdf');


const router = express.Router();

router.post('/pdf', async (req, res) => {
    const file = req.body;

    if (!file) {
        return res.status(400).send('Missing HTML file');
    }
    await converterHandler(res, file)
});

router.post('/pdf/json', async (req, res) => {
    const body = req.body;

    if (!body.html) {
        return res.status(400).send('Missing HTML file');
    }
    await converterHandler(res, body.html)
})

const converterHandler = async (res, htmlContent) => {
    try {
        const templatePath = path.resolve(__dirname, `template-${uuidv4()}.html`);
        const jsonData = {};
        const tempHTMLPath = path.resolve(__dirname, `temp-${uuidv4()}.html`);
        const outputPath = path.resolve(__dirname, `output-${uuidv4()}.pdf`);

        fs.writeFileSync(tempHTMLPath, htmlContent);
        fs.writeFileSync(templatePath, htmlContent);

        await HTML2PDF.createPdf(templatePath, jsonData, tempHTMLPath, outputPath);

        res.sendFile(outputPath, () => {
            console.log("Completed generating PDF.")
            fs.unlinkSync(outputPath);
            fs.unlinkSync(templatePath);
            fs.unlinkSync(tempHTMLPath);
        });
    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).send('Error generating PDF');
    }
}

module.exports = router;
