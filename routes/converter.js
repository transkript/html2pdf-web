const fs = require("fs");
const { v4: uuidv4 } = require('uuid');
const path = require("path");
const express = require('express');
const HTML2PDF = require('../public/javascripts/html2pdf');
const archiver = require('archiver');


const workdir = `${__dirname}/dump`;
(() => {
    if (!fs.existsSync(workdir)) {
        fs.mkdirSync(workdir);
    }
})();

const router = express.Router();

router.post('/api/pdf', async (req, res) => {
    const file = req.body;

    if (!file) {
        return res.status(400).send('Missing HTML file');
    }
    await converterHandler(res, {content: file, name: uuidv4()})
});

router.post('/api/pdf/json', async (req, res) => {
    const body = req.body;

    if (!body.html) {
        return res.status(400).send('Missing HTML file');
    }
    if (!body.name) body.name = uuidv4();
    if (!body.name.endsWith('.pdf')) body.name += '.pdf';

    await converterHandler(res, body)
})

router.post('/api/pdf/json/bulk', async (req, res) => {
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

        const templatePath = path.resolve(workdir, `template-${uuidv4()}.html`);
        const jsonData = {};
        const tempHTMLPath = path.resolve(workdir, `temp-${uuidv4()}.html`);
        const outputPath = path.resolve(workdir, `output-${model.name}.pdf`);

        fs.writeFileSync(tempHTMLPath, model.content);
        fs.writeFileSync(templatePath, model.content);

        await HTML2PDF.createPdf(templatePath, jsonData, tempHTMLPath, outputPath);

        res.sendFile(outputPath, () => {
            fs.unlinkSync(outputPath);
            fs.unlinkSync(templatePath);
            fs.unlinkSync(tempHTMLPath);
        });
    } catch (error) {
        res.status(500).send('Error generating PDF');
    }
}

const multipleFilesConverterHandler = async (res, models) => {
    const outputDir = path.resolve(workdir, `output-${uuidv4()}`);
    const zipPath = path.resolve(outputDir, `output-${uuidv4()}.zip`);
    fs.mkdirSync(outputDir);
    const cleanUpCallbacks = [() => {
        fs.unlinkSync(zipPath);
        fs.rmSync(outputDir, { recursive: true });
    }];
    const cleanUp = () => cleanUpCallbacks.forEach(clean => clean());

    try{
        const zipStream = fs.createWriteStream(zipPath);
        const archive = archiver('zip', {
            zlib: { level: 9 }
        });

        zipStream.on('close', () => {
            res.sendFile(zipPath, () => cleanUp());
        });

        archive.pipe(zipStream);
        
        for (let i = 0; i < models.length; i++) {
            const model = models[i];
            let { name, html } = model;
            if (typeof name == "string") {
                if (!name.endsWith(".pdf")) name += ".pdf"
            }
            const templatePath = path.resolve(workdir, `template-${uuidv4()}.html`);
            const tempHTMLPath = path.resolve(workdir, `temp-${uuidv4()}.html`);
            const outputPath = path.resolve(workdir, `result-${name}-${uuidv4()}.pdf`);

            cleanUpCallbacks.push(() => {
                fs.unlinkSync(templatePath);
                fs.unlinkSync(tempHTMLPath);
                fs.unlinkSync(outputPath);
            });

            fs.writeFileSync(tempHTMLPath, html);
            fs.writeFileSync(templatePath, html);

            await HTML2PDF.createPdf(templatePath, {}, tempHTMLPath, outputPath).then(() => {
                const fileStream = fs.createReadStream(outputPath);
                archive.append(fileStream, { name: name });
            });
        }
        await archive.finalize();
    }catch(error){
        console.error('Error generating ZIP:', error);
        cleanUp();
        res.status(500).send('Error generating ZIP');
    }
}

module.exports = router;
