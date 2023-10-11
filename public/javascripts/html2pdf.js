const { masterToPDF } = require('relaxedjs');
const puppeteer = require('puppeteer');
const plugins = require('relaxedjs/src/plugins');
const path = require('path');

class HTML2PDF {
    constructor() {
        this.puppeteerConfig = {
            headless: true,
            timeout: 0,
            args: [
                '--no-sandbox',
                '--disable-translate',
                '--disable-extensions',
                '--disable-sync',
            ],
        };

        this.relaxedGlobals = {
            busy: false,
            config: {},
            configPlugins: [],
        };

        this._initializedPlugins = false;
    }

    async _initializePlugins() {
        if (this._initializedPlugins) return; // Do not initialize plugins twice
        for (const [i, plugin] of plugins.builtinDefaultPlugins.entries()) {
            plugins.builtinDefaultPlugins[i] = await plugin.constructor();
        }
        await plugins.updateRegisteredPlugins(this.relaxedGlobals, '/');

        const chrome = await puppeteer.launch(this.puppeteerConfig);
        this.relaxedGlobals.puppeteerPage = await chrome.newPage();
        this._initializedPlugins = true;
    }

    async createPdf(templatePath, json_data, tempHtmlPath, outputPdfPath) {
        await this._initializePlugins();
        if (this._initializedPlugins) {
            const defaultTempHtmlPath = tempHtmlPath || path.resolve(__dirname, 'test.html');
            const defaultOutputPdfPath =
                outputPdfPath || path.resolve(__dirname, 'output.pdf');

            await masterToPDF(
                templatePath,
                this.relaxedGlobals,
                defaultTempHtmlPath,
                defaultOutputPdfPath,
                json_data
            );
        }
    }
}

module.exports = new HTML2PDF();
