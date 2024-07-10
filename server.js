const express = require('express');
const swaggerUi = require('swagger-ui-express');

const app = express();
const openApiDocumentation = require('./output/ExampleCapabilityStatement.openapi.json');

app.use('/', swaggerUi.serve, swaggerUi.setup(openApiDocumentation));

app.listen(3000, () => {
  console.log('Swagger UI running on http://localhost:3000');
});
