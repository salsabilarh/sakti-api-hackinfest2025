require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DB_USER,
    password: process.env.DB_PASS || null,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mysql'
  },
  test: {
    username: process.env.DB_USER,
    password: process.env.DB_PASS || null,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mysql'
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASS || null,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mysql'
  }
};

// module.exports = {
//   development: {
//     use_env_variable: 'DATABASE_URL',
//     dialect: 'mysql'
//   },
//   test: {
//     use_env_variable: 'DATABASE_URL',
//     dialect: 'mysql'
//   },
//   production: {
//     use_env_variable: 'DATABASE_URL',
//     dialect: 'mysql'
//   }
// };

