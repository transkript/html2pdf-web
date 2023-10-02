const swaggerAutogen = require('swagger-autogen')()

const outputFile = '../docs/swagger_output.json';
const endpointsFiles = ['./routes/converter.js', './routes/index.js'];

swaggerAutogen(outputFile, endpointsFiles).then(r => console.log(r));
