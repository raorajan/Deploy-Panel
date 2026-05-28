require("dotenv").config();

const invokeLambda = require("./src/services/lambdaService");

(async () => {
  try {
    const result = await invokeLambda({
      clientName: "Rajan",
      domain: "test.example.com",
    });

    console.log(result);
  } catch (error) {
    console.log(error);
  }
})();