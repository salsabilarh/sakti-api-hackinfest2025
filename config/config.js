require('dotenv').config(); // jika pakai .env

module.exports = {
  development: {
    use_env_variable: 'DATABASE_URL',
    dialect: 'mysql',
  },
  test: {
    username: 'root',
    password: null,
    database: 'sakti',
    host: '127.0.0.1',
    dialect: 'mysql'
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    dialect: 'mysql'
  }
};
