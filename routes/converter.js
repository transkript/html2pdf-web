const fs = require("fs");
const { v4: uuidv4 } = require('uuid');
const path = require("path");
const express = require('express');
const HTML2PDF = require('../public/javascripts/html2pdf');
const archiver = require('archiver');


const router = express.Router();

router.post('/pdf', async (req, res) => {
    const file = req.body;

    if (!file) {
        return res.status(400).send('Missing HTML file');
    }
    await converterHandler(res, {content: file, name: uuidv4()})
});

router.post('/pdf/json', async (req, res) => {
    const body = req.body;

    if (!body.html) {
        return res.status(400).send('Missing HTML file');
    }
    if (!body.name) body.name = uuidv4();
    if (!body.name.endsWith('.pdf')) body.name += '.pdf';

    await converterHandler(res, body)
})

router.post('/pdf/json/bulk', async (req, res) => {
    const files = req.body;

    if (!files || !Array.isArray(files) || files.length === 0) {
        return res.status(400).send('Missing HTML files');
    }
    await multipleFilesConverterHandler(res, files)
})

const converterHandler = async (res, model) => {
    try {
        if (!model.name) model.name = uuidv4();
        if (!model.name.endsWith('.pdf')) model.name += '.pdf';

        const templatePath = path.resolve(__dirname, `template-${uuidv4()}.html`);
        const jsonData = {};
        const tempHTMLPath = path.resolve(__dirname, `temp-${uuidv4()}.html`);
        const outputPath = path.resolve(__dirname, `output-${model.name}.pdf`);

        fs.writeFileSync(tempHTMLPath, model.content);
        fs.writeFileSync(templatePath, model.content);

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

const multipleFilesConverterHandler = async (res, models) => {
    const zipPath = path.resolve(__dirname, `output-${uuidv4()}.zip`);
    const outputDir = path.resolve(__dirname, `output-${uuidv4()}`);
    fs.mkdirSync(outputDir);

    try{
        const zipStream = fs.createWriteStream(zipPath);
        const archive = archiver('zip', {
            zlib: { level: 9 }
        });

        zipStream.on('close', () => {
            console.log('Completed generating ZIP.');
            res.sendFile(zipPath, () => {
                fs.unlinkSync(zipPath);
                fs.rmdirSync(outputDir, { recursive: true });
            });
        });

        archive.pipe(zipStream);
        
        for (let i = 0; i < models.length; i++) {
            const model = models[i];
            const { name, html } = model;
            const templatePath = path.resolve(__dirname, `template-${uuidv4()}.html`);
            const tempHTMLPath = path.resolve(__dirname, `temp-${uuidv4()}.html`);
            const outputPath = path.resolve(__dirname, `result-${name}-${uuidv4()}.pdf`);

            fs.writeFileSync(tempHTMLPath, html);
            fs.writeFileSync(templatePath, html);

            await HTML2PDF.createPdf(templatePath, {}, tempHTMLPath, outputPath);

            archive.append(fs.createReadStream(outputPath), { name: name });

            fs.unlinkSync(templatePath);
            fs.unlinkSync(tempHTMLPath);
            fs.unlinkSync(outputPath);
        }
        archive.finalize();
    }catch(error){
        console.error('Error generating ZIP:', error);
        res.status(500).send('Error generating ZIP');
    }
}

module.exports = router;
