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

router.post('/pdf', async (req, res) => {
    const file = req.body;

    if (!file) {
        return res.status(400).send('Missing HTML file');
    }
    const model = {content: file, name: uuidv4()};
    await multipleFilesConverterHandler(res, [model])
});

router.post('/pdf/json', async (req, res) => {
    const body = req.body;

    if (!body.html) {
        return res.status(400).send('Missing HTML file');
    }
    if (!body.name) body.name = uuidv4();
    if (!body.name.endsWith('.pdf')) body.name += '.pdf';

    await multipleFilesConverterHandler(res, [body])
})

router.post('/pdf/json/bulk', async (req, res) => {
    const files = req.body;

    if (!files || !Array.isArray(files) || files.length === 0) {
        return res.status(400).send('Missing HTML files');
    }
    await multipleFilesConverterHandler(res, files)
})

const multipleFilesConverterHandler = async (res, models) => {
    const outputDir = path.resolve(workdir, `output-${uuidv4()}`);
    const zipPath = path.resolve(outputDir, `output-${uuidv4()}.zip`);
    fs.mkdirSync(outputDir);
    const cleanUpCallbacks = [() => {
        fs.unlinkSync(zipPath);
        fs.rmSync(outputDir, {
            recursive: true,
            force: true,
            maxRetries: 3,
            retryDelay: 10000
        });
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
