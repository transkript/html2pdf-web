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

const deleteFile = (paths) => {
    paths.forEach(path => {
        fs.rmSync(path, {
            recursive: true,
            force: true,
            maxRetries: 3,
            retryDelay: 10000
        });
    });
}

const router = express.Router();

router.post('/pdf', async (req, res) => {
    const file = req.body;

    if (!file) {
        return res.status(400).send('Missing HTML file');
    }
    const model = {html: file, name: uuidv4()};
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
    const resultPaths = [];
    fs.mkdirSync(outputDir);
    const cleanUpCallbacks = [() => {
        deleteFile([zipPath, outputDir]);
    }];
    const cleanUp = () => {
        try {
            cleanUpCallbacks.forEach(clean => clean());
        } catch(e) {
        }
    }

    try{
        const zipStream = fs.createWriteStream(zipPath);
        const archive = archiver('zip', {
            zlib: { level: 9 }
        });

        zipStream.on('close', () => {
            if (resultPaths.length === 1)
                res.sendFile(resultPaths[0], () => cleanUp());
            else
                res.sendFile(zipPath, () => cleanUp());
        });

        archive.pipe(zipStream);
        
        for (let i = 0; i < models.length; i++) {
            const model = models[i];
            let { name, html } = model;
            let filename = `result-${name}-${uuidv4()}.pdf`;

            const templatePath = path.resolve(workdir, `template-${uuidv4()}.html`);
            const tempHTMLPath = path.resolve(workdir, `temp-${uuidv4()}.html`);
            const outputPath = path.resolve(workdir, filename);
            resultPaths.push(outputPath);

            cleanUpCallbacks.push(() => {
                deleteFile([templatePath, tempHTMLPath, outputPath]);
            });

            fs.writeFileSync(tempHTMLPath, html);
            fs.writeFileSync(templatePath, html);

            await HTML2PDF.createPdf(templatePath, {}, tempHTMLPath, outputPath).then(() => {
                const fileStream = fs.createReadStream(outputPath);
                archive.append(fileStream, { name: filename });
            });
        }
        await archive.finalize();
    } catch(error){
        console.error('Error generating ZIP:', error);
        cleanUp();
        res.status(500).send('Error generating ZIP');
    }
}

module.exports = router;
